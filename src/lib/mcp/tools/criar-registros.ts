import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

const TABELAS = [
  "clientes",
  "locais_cliente",
  "colaboradores",
  "maquinas",
  "insumos",
  "insumo_unidades",
  "plantas",
  "fornecedores",
  "fornecedor_atendentes",
  "estoque_movimentacoes",
] as const;
type Tabela = (typeof TABELAS)[number];

const TEM_CREATED_BY = new Set<Tabela>([
  "clientes",
  "colaboradores",
  "fornecedor_atendentes",
  "fornecedores",
  "insumo_unidades",
  "insumos",
  "maquinas",
  "plantas",
]);

// Tabelas que participam do funil de dedup (match_catalogo aceita 'planta' | 'insumo').
const DEDUP_CAT: Partial<Record<Tabela, "planta" | "insumo">> = {
  plantas: "planta",
  insumos: "insumo",
};

type Linha = Record<string, unknown>;

export default defineTool({
  name: "criar_registros",
  title: "Criar registros em lote",
  description:
    "Cria linhas em lote em tabelas de cadastro (whitelist). Roda deduplicação para plantas, insumos e fornecedores (match_catalogo/norm_catalogo com nome). Match >= 0.90 é reportado como possível duplicado e NÃO cria (a menos que forcar=true). Máx 50 linhas por chamada. Escreve com o token do usuário (RLS ativa).",
  inputSchema: {
    tabela: z
      .enum(TABELAS)
      .describe(
        "Tabela alvo. Aceita apenas: " + TABELAS.join(", "),
      ),
    linhas: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(50)
      .describe("Array de objetos (máx 50)."),
    forcar: z
      .boolean()
      .optional()
      .describe("Se true, cria mesmo quando houver possível duplicado."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ tabela, linhas, forcar }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    const tbl = tabela as Tabela;
    const dedupTipo = DEDUP_CAT[tbl];
    const isFornecedor = tbl === "fornecedores";

    const resultados: Array<{
      indice: number;
      status: "criada" | "pulada" | "erro";
      id?: string;
      motivo?: string;
      duplicado?: { id: string; nome: string; score: number; fonte: string };
      linha?: Linha;
    }> = [];

    for (let i = 0; i < linhas.length; i++) {
      const raw = linhas[i] as Linha;
      try {
        const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";

        // Dedup para plantas/insumos via match_catalogo
        if (!forcar && dedupTipo && nome) {
          const { data: matches, error: eMatch } = await supabase.rpc(
            "match_catalogo" as never,
            { p_tipo: dedupTipo, p_query: nome, p_limit: 1 } as never,
          );
          if (eMatch) {
            resultados.push({
              indice: i,
              status: "erro",
              motivo: `dedup falhou: ${eMatch.message}`,
            });
            continue;
          }
          const top = (matches as Array<{
            item_id: string;
            nome: string;
            score: number;
            fonte: string;
          }> | null)?.[0];
          if (top && top.score >= 0.9) {
            resultados.push({
              indice: i,
              status: "pulada",
              motivo: "possível duplicado (score >= 0.90)",
              duplicado: {
                id: top.item_id,
                nome: top.nome,
                score: top.score,
                fonte: top.fonte,
              },
            });
            continue;
          }
        }

        // Dedup manual de fornecedores por nome normalizado
        if (!forcar && isFornecedor && nome) {
          const { data: norm } = await supabase.rpc(
            "norm_catalogo" as never,
            { t: nome } as never,
          );
          const chave = (norm as unknown as string) ?? nome.toLowerCase().trim();
          const { data: cand } = await supabase
            .from("fornecedores")
            .select("id, nome")
            .ilike("nome", `%${nome}%`)
            .limit(5);
          const hit = (cand ?? []).find(
            (c: { nome: string }) =>
              (c.nome ?? "").trim().toLowerCase() === nome.toLowerCase() ||
              (c.nome ?? "").trim().toLowerCase() === String(chave).toLowerCase(),
          );
          if (hit) {
            resultados.push({
              indice: i,
              status: "pulada",
              motivo: "fornecedor com nome idêntico já existe",
              duplicado: { id: hit.id, nome: hit.nome, score: 1, fonte: "exato" },
            });
            continue;
          }
        }

        const payload: Linha = { ...raw };
        if (TEM_CREATED_BY.has(tbl) && payload.created_by === undefined) {
          payload.created_by = userId;
        }

        const { data, error } = await supabase
          .from(tbl)
          .insert(payload as never)
          .select("id")
          .maybeSingle();

        if (error) {
          const msg = /permission denied|row-level security/i.test(error.message)
            ? `acesso negado por RLS: ${error.message}`
            : error.message;
          resultados.push({ indice: i, status: "erro", motivo: msg });
          continue;
        }

        resultados.push({
          indice: i,
          status: "criada",
          id: (data as { id?: string } | null)?.id,
        });
      } catch (e) {
        resultados.push({
          indice: i,
          status: "erro",
          motivo: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const sumario = {
      criadas: resultados.filter((r) => r.status === "criada").length,
      puladas: resultados.filter((r) => r.status === "pulada").length,
      erros: resultados.filter((r) => r.status === "erro").length,
    };

    return {
      content: [
        {
          type: "text",
          text: `Tabela ${tbl}: ${sumario.criadas} criadas, ${sumario.puladas} puladas (duplicadas), ${sumario.erros} com erro.`,
        },
      ],
      structuredContent: { tabela: tbl, sumario, resultados },
    };
  },
});
