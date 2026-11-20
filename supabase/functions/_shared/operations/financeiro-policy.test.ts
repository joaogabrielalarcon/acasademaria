import { describe, expect, test } from "bun:test";
import { canOperateFinance, canViewFinancialTotals } from "./financeiro-policy";

describe("FIN-1 role boundaries", () => {
  test("only the four named financial roles can operate", () => {
    for (const role of ["admin", "administrativo", "gestor", "diretor"]) expect(canOperateFinance([role])).toBe(true);
    for (const role of ["gestao_campo", "operador_campo", "responsavel_obra", "arquitetura", "operador", "new_role"]) expect(canOperateFinance([role])).toBe(false);
    expect(canOperateFinance([])).toBe(false);
  });
  test("totals restricted to admin and director, never administrativo or gestor", () => {
    expect(canViewFinancialTotals(["admin"])).toBe(true);
    expect(canViewFinancialTotals(["diretor"])).toBe(true);
    for (const role of ["administrativo", "gestor", "gestao_campo", "operador_campo", "new_role"]) expect(canViewFinancialTotals([role])).toBe(false);
    expect(canViewFinancialTotals([])).toBe(false);
  });
});