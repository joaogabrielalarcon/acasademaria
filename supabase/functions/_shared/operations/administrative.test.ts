import { describe, expect, test } from "bun:test";
import { ADMIN_CREATE, ADMIN_UPDATE, validateAdministrative, financialOperation } from "./administrative.ts";
import { podeVerValor } from "./validation.ts";
import { daysBetween, dueWindow } from "./painel-vencimentos.ts";
import { signProposal, verifyProposal } from "./proposal.ts";

describe("administrative rules", () => {
  test("exactly seven new create tables", () => expect(Object.keys(ADMIN_CREATE)).toHaveLength(7));
  test("deliveries and movements cannot update", () => { expect("entregas_colaborador" in ADMIN_UPDATE).toBe(false); expect("financeiro_movimentacoes" in ADMIN_UPDATE).toBe(false); });
  test("values only for the four approved roles", () => {
    for (const role of ["admin", "administrativo", "gestor", "diretor"]) expect(podeVerValor([role])).toBe(true);
    for (const role of ["operador_campo", "arquitetura", "gestao_campo", "new_role"]) expect(podeVerValor([role])).toBe(false);
  });
  test("financial tables are always classified financial", () => expect(financialOperation("financeiro_parcelas")).toBe(true));
  test("liberation CHECK exact vocabulary", () => { expect(validateAdministrative("colaborador_liberacoes", { status: "em_renovacao" })).toBeNull(); expect(validateAdministrative("colaborador_liberacoes", { status: "aprovada" })).not.toBeNull(); });
  test("purchase CHECK rejects translated priorities", () => { expect(validateAdministrative("solicitacoes_compras", { urgencia: "urgente" })).toBeNull(); expect(validateAdministrative("solicitacoes_compras", { urgencia: "critica" })).not.toBeNull(); });
  test("movement value must be strictly positive", () => { expect(validateAdministrative("financeiro_movimentacoes", { valor: 0 })).not.toBeNull(); expect(validateAdministrative("financeiro_movimentacoes", { valor: 1 })).toBeNull(); });
  test("calendar invalid date rejected", () => expect(validateAdministrative("calendario_eventos", { data: "2026-02-30" })).not.toBeNull());
  test("default due horizon exactly thirty days in Sao Paulo", () => expect(dueWindow(undefined, new Date("2026-10-28T02:00:00Z"))).toEqual({ today: "2026-10-27", end: "2026-11-26" }));
  test("overdue date yields negative days", () => expect(daysBetween("2026-10-28", "2026-10-27")).toBe(-1));
  test("proposal cannot transfer to another caller or be changed", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const proposal = await signProposal({ operation: "criar_registros", input: { tabela: "calendario_eventos" }, userId: id }, "test-secret");
    expect((await verifyProposal(proposal, "test-secret", id)).operation).toBe("criar_registros");
    await expect(verifyProposal(proposal, "test-secret", "00000000-0000-4000-8000-000000000002")).rejects.toThrow();
    await expect(verifyProposal(proposal + "x", "test-secret", id)).rejects.toThrow();
  });
});