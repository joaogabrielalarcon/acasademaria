export const FINANCIAL_ROLES = ["admin", "administrativo", "gestor", "diretor"] as const;
export const CONSOLIDATED_ROLES = ["admin", "diretor"] as const;

export function canOperateFinance(roles: readonly string[]): boolean {
  return roles.some((role) => FINANCIAL_ROLES.some((allowed) => allowed === role));
}

export function canViewFinancialTotals(roles: readonly string[]): boolean {
  return roles.some((role) => CONSOLIDATED_ROLES.some((allowed) => allowed === role));
}