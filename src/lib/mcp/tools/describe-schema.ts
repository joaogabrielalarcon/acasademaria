import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "describe_schema",
  title: "Descrever schema",
  description:
    "Introspecção só-leitura do schema public. Sem parâmetro, lista todas as tabelas com contagem de colunas e status de RLS. Com 'tabela', devolve colunas, chave primária, chaves estrangeiras e status de RLS. Nunca lê dados.",
  inputSchema: {
    tabela: z
      .string()
      .trim()
      .optional()
      .describe("Nome da tabela do schema public. Omita para listar todas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tabela }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);

    if (!tabela) {
      const { data, error } = await supabase.rpc("mcp_list_public_tables");
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: { tabelas: data ?? [] },
      };
    }

    const { data, error } = await supabase.rpc("mcp_describe_table", { p_tabela: tabela });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (data && typeof data === "object" && "erro" in (data as Record<string, unknown>)) {
      return {
        content: [{ type: "text", text: String((data as Record<string, unknown>).erro) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data as Record<string, unknown>,
    };
  },
});
