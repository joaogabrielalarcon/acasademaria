import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "list_clientes",
  title: "Listar clientes",
  description:
    "Lista clientes visíveis ao usuário autenticado, com busca opcional por nome, cidade ou CPF/CNPJ. Respeita as permissões (RLS) do usuário.",
  inputSchema: {
    busca: z.string().trim().optional().describe("Termo de busca (nome, cidade, CPF/CNPJ)."),
    status: z.string().optional().describe("Filtrar por status (ex.: 'ativo', 'inativo')."),
    limite: z.number().int().min(1).max(100).optional().describe("Máximo de resultados (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, status, limite }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("clientes")
      .select("id, nome, email, telefone, cidade, estado, status, cpf_cnpj, created_at")
      .order("nome", { ascending: true })
      .limit(limite ?? 25);

    if (status) q = q.eq("status", status);
    if (busca) {
      const like = `%${busca}%`;
      q = q.or(`nome.ilike.${like},cidade.ilike.${like},cpf_cnpj.ilike.${like}`);
    }

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { count: data?.length ?? 0, clientes: data ?? [] },
    };
  },
});
