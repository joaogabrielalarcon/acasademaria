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
  "projetos",
] as const;
type Tabela = (typeof TABELAS)[number];

const PROJETOS_CAMPOS = new Set([
  "tipo",
  "status",
  "titulo",
  "responsavel_id",
  "data_inicio",
  "data_fim",
  "data_previsao",
  "data_conclusao",
]);

export default defineTool({
  name: "atualizar_registro",
  title: "Atualizar registro por id",
  description:
    "Atualiza UMA linha por id em tabelas de cadastro (whitelist). Em 'projetos' só permite corrigir tipo, status, titulo, responsavel_id e datas (data_inicio, data_fim, data_previsao, data_conclusao). Escreve com o token do usuário (RLS ativa). Retorna antes → depois.",
  inputSchema: {
    tabela: z.enum(TABELAS).describe("Tabela alvo. Aceita: " + TABELAS.join(", ")),
    id: z.string().uuid().describe("UUID da linha."),
    campos: z
      .record(z.string(), z.unknown())
      .describe("Campos a atualizar (objeto). Não passe id."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ tabela, id, campos }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);

    const tbl = tabela as Tabela;
    const entries = Object.entries(campos as Record<string, unknown>).filter(
      ([k]) => k !== "id",
    );
    if (entries.length === 0) {
      return {
        content: [{ type: "text", text: "Nenhum campo para atualizar." }],
        isError: true,
      };
    }

    if (tbl === "projetos") {
      const invalidos = entries.filter(([k]) => !PROJETOS_CAMPOS.has(k)).map(([k]) => k);
      if (invalidos.length) {
        return {
          content: [
            {
              type: "text",
              text: `Em 'projetos' só é permitido: ${Array.from(PROJETOS_CAMPOS).join(", ")}. Rejeitados: ${invalidos.join(", ")}.`,
            },
          ],
          isError: true,
        };
      }
    }

    const colunas = entries.map(([k]) => k).join(",");

    const { data: antes, error: eAntes } = await supabase
      .from(tbl)
      .select(`id,${colunas}`)
      .eq("id", id)
      .maybeSingle();
    if (eAntes) {
      return { content: [{ type: "text", text: eAntes.message }], isError: true };
    }
    if (!antes) {
      return {
        content: [
          {
            type: "text",
            text: `Registro ${id} não encontrado em ${tbl} (ou sem permissão de leitura).`,
          },
        ],
        isError: true,
      };
    }

    const patch = Object.fromEntries(entries);
    const { data: depois, error } = await supabase
      .from(tbl)
      .update(patch as never)
      .eq("id", id)
      .select(`id,${colunas}`)
      .maybeSingle();

    if (error) {
      const msg = /permission denied|row-level security/i.test(error.message)
        ? `acesso negado por RLS: ${error.message}`
        : error.message;
      return { content: [{ type: "text", text: msg }], isError: true };
    }

    const diff: Record<string, { antes: unknown; depois: unknown }> = {};
    for (const [k] of entries) {
      const a = (antes as Record<string, unknown>)[k];
      const d = (depois as Record<string, unknown> | null)?.[k];
      if (JSON.stringify(a) !== JSON.stringify(d)) {
        diff[k] = { antes: a, depois: d };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Registro ${id} em ${tbl} atualizado (${Object.keys(diff).length} campo(s) alterado(s)).`,
        },
      ],
      structuredContent: { tabela: tbl, id, alteracoes: diff },
    };
  },
});
