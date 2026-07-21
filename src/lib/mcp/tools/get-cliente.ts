import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "get_cliente",
  title: "Detalhes do cliente",
  description:
    "Retorna dados detalhados de um cliente pelo id, incluindo projetos vinculados.",
  inputSchema: {
    cliente_id: z.string().uuid().describe("UUID do cliente."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cliente_id }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    const [cliente, projetos] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", cliente_id).maybeSingle(),
      supabase
        .from("projetos")
        .select("id, titulo, tipo, status, data_inicio, data_previsao, valor_total")
        .eq("cliente_id", cliente_id)
        .order("created_at", { ascending: false }),
    ]);

    if (cliente.error) return { content: [{ type: "text", text: cliente.error.message }], isError: true };
    if (!cliente.data) return { content: [{ type: "text", text: "Cliente não encontrado." }], isError: true };

    const payload = { cliente: cliente.data, projetos: projetos.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
