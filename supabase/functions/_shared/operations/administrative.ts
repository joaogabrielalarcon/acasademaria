import { z } from "npm:zod@4.4.3";

export const ADMIN_CREATE = {
  calendario_eventos: { obrigatorios: ["tipo", "data", "titulo"], permitidos: ["tipo", "data", "titulo", "descricao", "recorrente", "colaborador_id", "cliente_id", "projeto_id", "responsavel_id", "concluido", "observacoes"] },
  entregas_colaborador: { obrigatorios: ["colaborador_id", "insumo_id", "quantidade"], permitidos: ["colaborador_id", "insumo_id", "quantidade", "data_entrega", "observacao"] },
  condominios: { obrigatorios: ["nome"], permitidos: ["nome", "regras_internas", "contatos", "responsaveis_areas", "horario_entrada", "horario_saida", "observacoes", "ativo"] },
  colaborador_liberacoes: { obrigatorios: ["colaborador_id", "condominio_id"], permitidos: ["colaborador_id", "condominio_id", "data_emissao", "data_validade", "status", "documento_path", "observacoes"] },
  financeiro_parcelas: { obrigatorios: ["projeto_id", "cliente_id", "valor"], permitidos: ["projeto_id", "cliente_id", "numero_parcela", "valor", "data_vencimento", "tipo", "status", "data_pagamento", "valor_recebido", "numero_nf", "data_nf", "forma_pagamento", "observacoes"] },
  financeiro_movimentacoes: { obrigatorios: ["tipo", "categoria", "descricao", "valor"], permitidos: ["tipo", "categoria", "descricao", "valor", "data_movimentacao", "fornecedor_id", "estoque_movimentacao_id", "registrado_por_nome"] },
  solicitacoes_compras: { obrigatorios: ["motivo"], permitidos: ["motivo", "link_ou_contato", "valor_estimado", "condicao_pagamento", "urgencia", "data_solicitacao", "observacoes"] },
};
export const ADMIN_UPDATE = {
  calendario_eventos: ADMIN_CREATE.calendario_eventos.permitidos,
  condominios: ADMIN_CREATE.condominios.permitidos,
  colaborador_liberacoes: ADMIN_CREATE.colaborador_liberacoes.permitidos,
  financeiro_parcelas: ["status", "data_pagamento", "valor_recebido", "numero_nf", "data_nf", "forma_pagamento", "observacoes"],
  solicitacoes_compras: ["status"],
};
export const ADMISSION_FIELDS = ["tamanho_calcado", "tamanho_camiseta", "tamanho_calca", "possui_cnh", "tipo_cnh", "possui_conducao", "tipo_conducao", "data_admissao", "data_nascimento", "cnh_validade", "tamanho_luva"];
export const CHECKS: Record<string, Record<string, readonly string[]>> = {
  colaborador_liberacoes: { status: ["ativa", "vencida", "em_renovacao", "cancelada"] },
  colaboradores: { tipo_cnh: ["A", "B", "AB", "C", "D", "E"], tipo_conducao: ["Carro", "Moto", "Ambos"], tipo_vinculo: ["interno", "terceiro"] },
  financeiro_movimentacoes: { tipo: ["entrada", "saida"] },
  solicitacoes_compras: { status: ["pendente", "aprovada", "recusada", "comprada"], urgencia: ["baixa", "media", "alta", "urgente"] },
  // Existing A Receber vocabulary, not a new database CHECK.
  financeiro_parcelas: { status: ["pendente", "pago", "vencido", "cancelado"] },
};
const uuid = z.string().uuid();
const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Data inválida; use AAAA-MM-DD.");
const booleanFields = new Set(["concluido", "recorrente", "ativo", "possui_cnh", "possui_conducao"]);
const dateFields = new Set(["data", "data_entrega", "data_emissao", "data_validade", "data_vencimento", "data_pagamento", "data_nf", "data_admissao", "data_nascimento", "cnh_validade", "data_solicitacao"]);
const numberFields = new Set(["valor", "valor_recebido", "valor_estimado", "quantidade", "numero_parcela"]);

export function validateAdministrative(table: string, input: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    const allowed = CHECKS[table]?.[key];
    if (allowed && (typeof value !== "string" || !allowed.includes(value))) return `${table}.${key}: aceitos ${allowed.join(", ")}.`;
    if (key.endsWith("_id") && !uuid.safeParse(value).success) return `${key} precisa de UUID válido.`;
    if (dateFields.has(key) && !date.safeParse(value).success) return `${key} precisa de uma data válida AAAA-MM-DD.`;
    if (booleanFields.has(key) && typeof value !== "boolean") return `${key} precisa ser verdadeiro ou falso.`;
    if (numberFields.has(key)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return `${key} precisa ser um número não negativo.`;
      if ((key === "quantidade" || key === "numero_parcela" || (table === "financeiro_movimentacoes" && key === "valor")) && value <= 0) return `${key} precisa ser maior que zero.`;
      if (key === "numero_parcela" && !Number.isInteger(value)) return "numero_parcela precisa ser inteiro.";
    }
    if (["contatos", "responsaveis_areas"].includes(key) && !Array.isArray(value)) return `${key} precisa ser uma lista.`;
  }
  return null;
}
export function financialOperation(table: string) { return table.startsWith("financeiro_"); }