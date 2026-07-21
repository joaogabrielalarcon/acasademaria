import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "list_projetos",
  title: "Listar projetos",
  description:
    "Lista projetos visíveis ao usuário (respeita alocação e RLS). Filtre por status, tipo ou cliente.",
  inputSchema: {
    status: z.string().optional().describe("Ex.: 'em_andamento', 'concluido'."),
    tipo: z.string().optional().describe("Ex.: 'implantacao', 'manutencao'."),
    cliente_id: z.string().uuid().optional(),
    busca: z.string().trim().optional().describe("Busca por título."),
    limite: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, tipo, cliente_id, busca, limite }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("projetos")
      .select("id, titulo, tipo, status, cliente_id, data_inicio, data_previsao, data_conclusao, valor_total, valor_mensal, responsavel_id")
      .order("created_at", { ascending: false })
      .limit(limite ?? 25);

    if (status) q = q.eq("status", status);
    if (tipo) q = q.eq("tipo", tipo);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    if (busca) q = q.ilike("titulo", `%${busca}%`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { count: data?.length ?? 0, projetos: data ?? [] },
    };
  },
});
