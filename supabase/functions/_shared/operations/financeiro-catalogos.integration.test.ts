import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

describe.skipIf(!Bun.env.FIN1_SESSION_FILE)("FIN-1 catalog integration", () => {
  async function client() {
    const path = Bun.env.FIN1_SESSION_FILE;
    const url = Bun.env.VITE_SUPABASE_URL;
    const key = Bun.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!path || !url || !key) throw new Error("Provide authenticated FIN1_SESSION_FILE and the app's public configuration.");
    const parsed = z.object({ session: z.object({ access_token: z.string() }) }).parse(JSON.parse(await readFile(path, "utf8")));
    return createClient(url, key, { global: { headers: { Authorization: `Bearer ${parsed.session.access_token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  }

  test("four exact accounts, only the legacy Conta Azul account inactive", async () => {
    const db = await client();
    const { data, error } = await db.from("financeiro_contas").select("nome,banco,agencia,numero,titular,ativo,data_saldo_inicial").order("ordem");
    expect(error).toBeNull();
    expect(data).toEqual([
      { nome: "PJ Itaú", banco: "Itaú", agencia: "6915", numero: "105404", titular: "PJ", ativo: true, data_saldo_inicial: "2026-01-01" },
      { nome: "PJ Safra", banco: "Safra", agencia: "0288", numero: "0452818", titular: "PJ", ativo: true, data_saldo_inicial: "2026-01-01" },
      { nome: "PF Nubank", banco: "Nubank", agencia: null, numero: null, titular: "PF", ativo: true, data_saldo_inicial: "2026-01-01" },
      { nome: "Conta PJ Conta Azul IP", banco: null, agencia: null, numero: null, titular: "PJ", ativo: false, data_saldo_inicial: "2026-01-01" },
    ]);
  });
  test("36 categories including the approved A classificar income addition", async () => {
    const db = await client();
    const { data, error } = await db.from("financeiro_categorias").select("nome,tipo,grupo,entra_no_resultado").order("ordem");
    expect(error).toBeNull();
    const groups: Array<{ tipo: string; grupo: string; names: string[]; result: boolean }> = [
      { tipo: "entrada", grupo: "Receitas", result: true, names: ["Receita de desenvolvimento de projeto", "Receita de implantação", "Receita de manutenção", "Receita de execução e mão de obra", "Receita de fornecimento", "Receita de relatório técnico", "Reembolso de cliente", "Outras receitas"] },
      { tipo: "entrada", grupo: "Financeiro", result: true, names: ["Rendimentos e juros recebidos"] },
      { tipo: "entrada", grupo: "Financeiro", result: false, names: ["Aporte ou empréstimo recebido", "Transferência entre contas (entrada)"] },
      { tipo: "saida", grupo: "Custo da operação", result: true, names: ["Plantas", "Insumos e materiais", "Mão de obra terceirizada", "Fretes", "Máquinas e equipamentos (compra e manutenção)", "Combustível e veículos"] },
      { tipo: "saida", grupo: "Pessoas", result: true, names: ["Salários", "Encargos (FGTS, INSS, 13º, férias, rescisão)", "Benefícios (VR, cesta, plano)", "Reembolsos a colaboradores"] },
      { tipo: "saida", grupo: "Estrutura", result: true, names: ["Aluguel, condomínio e IPTU", "Energia, água e internet", "Contabilidade e honorários", "Software e assinaturas", "Marketing", "Escritório e copa"] },
      { tipo: "saida", grupo: "Impostos e banco", result: true, names: ["Impostos", "Tarifas bancárias e juros pagos"] },
      { tipo: "saida", grupo: "Sócios e financeiro", result: false, names: ["Pró-labore e retiradas", "Pagamento de empréstimo", "Transferência entre contas (saída)", "Pessoal, fora da empresa"] },
      { tipo: "saida", grupo: "Outros", result: true, names: ["Outras despesas", "A classificar"] },
      { tipo: "entrada", grupo: "Receitas", result: true, names: ["A classificar"] },
    ];
    expect(data).toEqual(groups.flatMap((g) => g.names.map((nome) => ({ nome, tipo: g.tipo, grupo: g.grupo, entra_no_resultado: g.result }))));
    expect(data).toHaveLength(36);
  });
  test("raw opening balances denied through the ordinary Data API", async () => {
    const db = await client();
    const { data, error } = await db.from("financeiro_contas").select("saldo_inicial");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});