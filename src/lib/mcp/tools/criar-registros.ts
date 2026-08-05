import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";
import {
  filtrarCampos,
  normalizarTexto,
  validarValoresRegistro,
  TEM_AUTORIA,
} from "./_validacao";

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
  // operação de campo
  "projetos",
  "registros",
  "diarias",
  "escala_alocacoes",
  "registro_insumos",
  "registro_maquinas",
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

/** Tabelas da operação: campos aceitos e obrigatórios na criação. */
const CAMPOS_OPERACAO: Partial<
  Record<Tabela, { permitidos: string[]; obrigatorios: string[] }>
> = {
  projetos: {
    obrigatorios: ["cliente_id", "titulo", "tipo", "status"],
    permitidos: [
      "cliente_id",
      "titulo",
      "tipo",
      "status",
      "local_id",
      "descricao",
      "observacoes",
      "valor_total",
      "valor_mensal",
      "dia_vencimento",
      "data_inicio",
      "data_previsao",
      "responsavel_id",
      "lider_responsavel_id",
      "usa_mao_de_obra_campo",
      "origem",
      "escala_periodicidade",
      "escala_dias_semana",
      "escala_duracao_dias",
      "escala_equipe_qtd",
    ],
  },
  registros: {
    obrigatorios: ["cliente_id", "data_servico", "tipo", "descricao", "status"],
    permitidos: [
      "cliente_id",
      "data_servico",
      "tipo",
      "descricao",
      "status",
      "local_id",
      "projeto_id",
      "trecho_id",
      "diaria_id",
      "prioridade",
      "solicitante",
      "area_funcional",
      "observacoes_internas",
      "equipe_presente_ids",
      "executores_ids",
      "data_alerta",
      "tags",
      "midia",
    ],
  },
  diarias: {
    obrigatorios: ["cliente_id", "data_visita"],
    permitidos: [
      "cliente_id",
      "data_visita",
      "trecho_id",
      "periodo",
      "equipe_presente_ids",
      "comentarios_jardim",
      "observacoes_internas",
      "status",
      "data_alerta",
    ],
  },
  escala_alocacoes: {
    obrigatorios: ["data", "colaborador_id", "tipo"],
    permitidos: [
      "data",
      "colaborador_id",
      "tipo",
      "projeto_id",
      "local_id",
      "lider_id",
      "status",
      "diaria_id",
      "observacoes",
    ],
  },
  registro_insumos: {
    obrigatorios: ["registro_id", "insumo_id", "quantidade"],
    permitidos: ["registro_id", "insumo_id", "quantidade", "observacao"],
  },
  registro_maquinas: {
    obrigatorios: ["registro_id", "maquina_id", "horas_utilizadas"],
    permitidos: ["registro_id", "maquina_id", "horas_utilizadas", "observacao"],
  },
};

type Linha = Record<string, unknown>;

export default defineTool({
  name: "criar_registros",
  title: "Criar registros em lote",
  description:
    "Cria linhas em lote em tabelas de cadastro e da operação de campo (whitelist). " +
    "Cadastro (plantas, insumos, fornecedores) roda deduplicação por nome. " +
    "Operação (projetos, registros, diarias, escala_alocacoes, registro_insumos, registro_maquinas) roda validação de campos/valores e proteção contra gravação repetida por chave natural: " +
    "diarias = cliente_id + data_visita; registros = cliente_id + data_servico + tipo + descrição parecida; escala_alocacoes = data + colaborador_id + local_id. " +
    "Use forcar=true para criar mesmo assim. Máx 50 linhas por chamada. Escreve com o token do usuário (RLS ativa).",
  inputSchema: {
    tabela: z
      .enum(TABELAS)
      .describe("Tabela alvo. Aceita apenas: " + TABELAS.join(", ")),
    linhas: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(50)
      .describe("Array de objetos (máx 50)."),
    forcar: z
      .boolean()
      .optional()
      .describe(
        "Se true, cria mesmo quando houver possível duplicado ou visita repetida.",
      ),
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
    const regrasOperacao = CAMPOS_OPERACAO[tbl];
    const ehOperacao = Boolean(regrasOperacao);
    const dedupTipo = ehOperacao ? undefined : DEDUP_CAT[tbl];
    const isFornecedor = !ehOperacao && tbl === "fornecedores";

    const resultados: Array<{
      indice: number;
      status: "criada" | "pulada" | "erro";
      id?: string;
      motivo?: string;
      duplicado?: {
        id: string;
        nome?: string;
        score?: number;
        fonte: string;
        mudaria?: Record<string, { atual: unknown; novo: unknown }>;
      };
      linha?: Linha;
    }> = [];

    for (let i = 0; i < linhas.length; i++) {
      const raw = linhas[i] as Linha;
      try {
        const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";

        // Dedup por nome NÃO se aplica às tabelas da operação.
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

        let payload: Linha = { ...raw };

        // Whitelist de campos + valores válidos (tabelas da operação)
        if (regrasOperacao) {
          const filtrado = filtrarCampos(
            raw,
            regrasOperacao.permitidos,
            regrasOperacao.obrigatorios,
            tbl,
          );
          if ("erro" in filtrado) {
            resultados.push({ indice: i, status: "erro", motivo: filtrado.erro });
            continue;
          }
          payload = filtrado.payload;

          if (tbl === "registros") {
            const validado = validarValoresRegistro(payload);
            if ("erro" in validado) {
              resultados.push({ indice: i, status: "erro", motivo: validado.erro });
              continue;
            }
            payload = validado.valores;
          }
        }

        // Idempotência por chave natural
        if (!forcar && tbl === "diarias") {
          const { data: existente } = await supabase
            .from("diarias")
            .select("id, comentarios_jardim, observacoes_internas, status, periodo")
            .eq("cliente_id", payload.cliente_id as string)
            .eq("data_visita", payload.data_visita as string)
            .limit(1)
            .maybeSingle();
          if (existente) {
            resultados.push({
              indice: i,
              status: "pulada",
              motivo:
                "já existe visita para esta casa nesta data. Para completar, use atualizar_registro (modo acrescentar). Para criar assim mesmo, chame de novo com forcar=true.",
              duplicado: {
                id: (existente as { id: string }).id,
                fonte: "cliente_id + data_visita",
                mudaria: diffPreview(existente as Linha, payload),
              },
            });
            continue;
          }
        }

        if (!forcar && tbl === "registros") {
          const { data: cands } = await supabase
            .from("registros")
            .select("id, descricao")
            .eq("cliente_id", payload.cliente_id as string)
            .eq("data_servico", payload.data_servico as string)
            .eq("tipo", payload.tipo as string)
            .limit(20);
          const alvo = normalizarTexto(payload.descricao);
          const hit = (cands ?? []).find((c: { descricao?: string }) => {
            const d = normalizarTexto(c.descricao);
            if (!d || !alvo) return false;
            return d === alvo || (alvo.length > 20 && (d.includes(alvo) || alvo.includes(d)));
          }) as { id: string; descricao?: string } | undefined;
          if (hit) {
            resultados.push({
              indice: i,
              status: "pulada",
              motivo:
                "já existe registro muito parecido para este cliente, data e tipo. Para criar assim mesmo, chame de novo com forcar=true.",
              duplicado: {
                id: hit.id,
                fonte: "cliente_id + data_servico + tipo + descrição parecida",
                mudaria: diffPreview({ descricao: hit.descricao }, payload),
              },
            });
            continue;
          }
        }

        if (!forcar && tbl === "escala_alocacoes") {
          let q = supabase
            .from("escala_alocacoes")
            .select("id, status, lider_id, observacoes")
            .eq("data", payload.data as string)
            .eq("colaborador_id", payload.colaborador_id as string);
          q = payload.local_id
            ? q.eq("local_id", payload.local_id as string)
            : q.is("local_id", null);
          const { data: existente } = await q.limit(1).maybeSingle();
          if (existente) {
            resultados.push({
              indice: i,
              status: "pulada",
              motivo:
                "esta pessoa já está alocada nesta data e neste local. Para criar assim mesmo, chame de novo com forcar=true.",
              duplicado: {
                id: (existente as { id: string }).id,
                fonte: "data + colaborador_id + local_id",
                mudaria: diffPreview(existente as Linha, payload),
              },
            });
            continue;
          }
        }

        // Autoria: carimba com o usuário do token onde a coluna existe.
        if (
          (TEM_CREATED_BY.has(tbl) || TEM_AUTORIA.has(tbl)) &&
          payload.created_by === undefined
        ) {
          payload.created_by = userId;
          payload.updated_by = userId;
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
          text: `Tabela ${tbl}: ${sumario.criadas} criadas, ${sumario.puladas} puladas (já existiam), ${sumario.erros} com erro.`,
        },
      ],
      structuredContent: { tabela: tbl, sumario, resultados },
    };
  },
});

/** Mostra o que mudaria se a linha nova fosse aplicada sobre a existente. */
function diffPreview(
  existente: Linha,
  nova: Linha,
): Record<string, { atual: unknown; novo: unknown }> {
  const diff: Record<string, { atual: unknown; novo: unknown }> = {};
  for (const [k, v] of Object.entries(nova)) {
    if (k === "cliente_id" || k === "created_by" || k === "updated_by") continue;
    if (!(k in existente)) continue;
    if (JSON.stringify(existente[k]) !== JSON.stringify(v)) {
      diff[k] = { atual: existente[k], novo: v };
    }
  }
  return diff;
}
