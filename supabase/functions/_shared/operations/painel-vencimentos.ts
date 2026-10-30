import { z } from "npm:zod@4.4.3";
import { defineOperation, requireAuth, failure, type OperationContext } from "./contracts.ts";
import { acessoRestrito } from "./validation.ts";

export function todayInSaoPaulo(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function daysBetween(today: string, date: string) { return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000); }
export function dueWindow(days = 30, now = new Date()) {
  const today = todayInSaoPaulo(now);
  const end = new Date(today + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + days);
  return { today, end: end.toISOString().slice(0, 10) };
}
async function names(context: OperationContext, table: string, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const response = await context.db.from(table).select("id,nome").in("id", [...new Set(ids)]);
  if (response.error) throw response.error;
  return new Map<string, string>((response.data ?? []).map((row) => [String(row.id), String(row.nome)]));
}
export const operation = defineOperation({
  name: "painel_vencimentos", title: "Painel de vencimentos",
  description: "Eventos não concluídos nos próximos dias (padrão 30), com pessoa, cliente e responsável. Somente admin, administrativo, gestor e diretor recebem também parcelas não pagas próximas e atrasadas. Respeita RLS; não amplia acesso ao calendário.",
  inputSchema: { tipo: z.string().optional(), responsavel_id: z.string().uuid().optional(), dias: z.number().int().min(1).max(366).optional(), offset: z.number().int().min(0).optional(), limite: z.number().int().min(1).max(100).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tipo, responsavel_id, dias, offset, limite }, context) => {
    const denial = await requireAuth(context); if (denial) return denial;
    const restricted = await acessoRestrito(context.db, context.userId);
    const window = dueWindow(dias ?? 30);
    const off = offset ?? 0, limit = limite ?? 100;
    let query = context.db.from("calendario_eventos").select("id,tipo,data,titulo,colaborador_id,cliente_id,projeto_id,responsavel_id", { count: "exact" }).eq("concluido", false).gte("data", window.today).lte("data", window.end).order("data").order("id").range(off, off + limit - 1);
    if (tipo) query = query.eq("tipo", tipo);
    if (responsavel_id) query = query.eq("responsavel_id", responsavel_id);
    const events = await query; if (events.error) return failure(events.error.message);
    const rows = events.data ?? [];
    const [people, clients] = await Promise.all([
      names(context, "colaboradores_basico", rows.flatMap((row) => [row.colaborador_id, row.responsavel_id]).filter((id): id is string => typeof id === "string")),
      names(context, "clientes", rows.map((row) => row.cliente_id).filter((id): id is string => typeof id === "string")),
    ]);
    const payload: Record<string, unknown> = {
      dias: dias ?? 30, offset: off, limite: limit, total_eventos: events.count ?? rows.length,
      eventos: rows.map((row) => ({ ...row, dias_para_vencer: daysBetween(window.today, row.data), pessoa: people.get(row.colaborador_id) ?? null, cliente: clients.get(row.cliente_id) ?? null, responsavel: people.get(row.responsavel_id) ?? null })),
    };
    if (!restricted) {
      let financial = context.db.from("financeiro_parcelas").select("id,projeto_id,cliente_id,numero_parcela,valor,status,data_vencimento", { count: "exact" }).not("status", "in", "(pago,cancelado)").lte("data_vencimento", window.end).order("data_vencimento").order("id").range(off, off + limit - 1);
      if (responsavel_id) {
        const projects = await context.db.from("projetos").select("id").eq("responsavel_id", responsavel_id);
        if (projects.error) return failure(projects.error.message);
        financial = financial.in("projeto_id", (projects.data ?? []).map((row) => row.id));
      }
      const result = await financial; if (result.error) return failure(result.error.message);
      payload.total_parcelas = result.count ?? 0;
      payload.financeiro_parcelas = (result.data ?? []).map((row) => ({ ...row, dias_para_vencer: daysBetween(window.today, row.data_vencimento), atrasada: row.data_vencimento < window.today }));
    }
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});