import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "list_crm_cards",
  title: "Listar cards do CRM",
  description:
    "Lista cards do funil de CRM (leads, propostas, aprovados, em execução, etc). Respeita RLS do usuário.",
  inputSchema: {
    status: z.string().optional().describe("Ex.: 'Lead', 'Proposta Enviada', 'Aprovado', 'Em Execucao', 'Concluido', 'Pos-venda', 'Nao Aprovado'."),
    cliente_id: z.string().uuid().optional(),
    busca: z.string().trim().optional().describe("Busca por título ou nome do contato."),
    limite: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, cliente_id, busca, limite }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("crm_cards")
      .select("id, titulo, tipo, status, cliente_id, projeto_id, contato_nome, contato_email, contato_whatsapp, prazo, responsavel_id, created_at")
      .order("updated_at", { ascending: false })
      .limit(limite ?? 25);

    if (status) q = q.eq("status", status);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    if (busca) {
      const like = `%${busca}%`;
      q = q.or(`titulo.ilike.${like},contato_nome.ilike.${like}`);
    }

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { count: data?.length ?? 0, cards: data ?? [] },
    };
  },
});
