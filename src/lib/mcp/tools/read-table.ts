import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "read_table",
  title: "Ler tabela",
  description:
    "Leitura genérica de qualquer tabela do schema public, respeitando as permissões (RLS) do usuário autenticado. Só retorna o que o usuário tem permissão para ver.",
  inputSchema: {
    tabela: z.string().trim().min(1).describe("Nome da tabela do schema public."),
    colunas: z
      .string()
      .trim()
      .optional()
      .describe("Lista de colunas separadas por vírgula (padrão '*')."),
    filtros: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Objeto campo→valor para igualdade estrita."),
    ordenar_por: z
      .string()
      .trim()
      .optional()
      .describe("Coluna para ordenar. Prefixe com '-' para descendente (ex.: '-created_at')."),
    limite: z.number().int().min(1).max(100).optional().describe("Padrão 25, máximo 100."),
    offset: z.number().int().min(0).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tabela, colunas, filtros, ordenar_por, limite, offset }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);

    // Validate table name against the actual public schema list (no string interpolation).
    const { data: tabelas, error: eList } = await supabase.rpc("mcp_list_public_tables");
    if (eList) return { content: [{ type: "text", text: eList.message }], isError: true };
    const nomes = new Set(
      (tabelas as Array<{ tabela: string }> | null)?.map((t) => t.tabela) ?? [],
    );
    if (!nomes.has(tabela)) {
      return {
        content: [{ type: "text", text: `Tabela "${tabela}" não existe no schema public.` }],
        isError: true,
      };
    }

    const lim = Math.min(limite ?? 25, 100);
    const off = offset ?? 0;
    let q = supabase.from(tabela).select(colunas ?? "*").range(off, off + lim - 1);

    if (filtros && typeof filtros === "object") {
      for (const [k, v] of Object.entries(filtros)) {
        q = v === null ? q.is(k, null) : q.eq(k, v as string | number | boolean);
      }
    }
    if (ordenar_por) {
      const desc = ordenar_por.startsWith("-");
      const col = desc ? ordenar_por.slice(1) : ordenar_por;
      q = q.order(col, { ascending: !desc });
    }

    const { data, error } = await q;
    if (error) {
      const msg = /permission denied|row-level security/i.test(error.message)
        ? `Acesso negado à tabela "${tabela}" para o usuário atual (RLS).`
        : error.message;
      return { content: [{ type: "text", text: msg }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tabela, count: data?.length ?? 0, linhas: data ?? [] },
    };
  },
});
