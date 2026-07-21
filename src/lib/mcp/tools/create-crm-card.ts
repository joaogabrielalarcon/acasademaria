import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "create_crm_card",
  title: "Criar card no CRM",
  description:
    "Cria um novo card (lead) no funil de CRM. O card é criado com o usuário autenticado como responsável quando não indicado.",
  inputSchema: {
    titulo: z.string().trim().min(1).describe("Título do card (obrigatório)."),
    tipo: z.string().trim().min(1).describe("Tipo do card (ex.: 'Implantação', 'Manutenção')."),
    status: z.string().trim().optional().describe("Status inicial (padrão 'Lead')."),
    cliente_id: z.string().uuid().nullable().optional(),
    projeto_id: z.string().uuid().nullable().optional(),
    contato_nome: z.string().trim().nullable().optional(),
    contato_email: z.string().trim().nullable().optional(),
    contato_whatsapp: z.string().trim().nullable().optional(),
    observacoes: z.string().trim().nullable().optional(),
    prazo: z.string().trim().nullable().optional().describe("Data em ISO (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    const { data: colaborador } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();

    const row = {
      titulo: input.titulo,
      tipo: input.tipo,
      status: input.status ?? "Lead",
      cliente_id: input.cliente_id ?? null,
      projeto_id: input.projeto_id ?? null,
      contato_nome: input.contato_nome ?? null,
      contato_email: input.contato_email ?? null,
      contato_whatsapp: input.contato_whatsapp ?? null,
      observacoes: input.observacoes ?? null,
      prazo: input.prazo ?? null,
      responsavel_id: colaborador?.id ?? null,
    };

    const { data, error } = await supabase.from("crm_cards").insert(row).select().maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Card criado (id ${data?.id}).` }],
      structuredContent: { card: data },
    };
  },
});
