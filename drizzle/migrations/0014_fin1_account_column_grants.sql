REVOKE ALL ON public.financeiro_contas FROM authenticated;
GRANT SELECT(id,nome,banco,agencia,numero,titular,empresa,ativo,data_saldo_inicial,ordem,created_at,updated_at) ON public.financeiro_contas TO authenticated;
GRANT INSERT(nome,banco,agencia,numero,titular,empresa,ativo,ordem),UPDATE(nome,banco,agencia,numero,titular,empresa,ativo,ordem) ON public.financeiro_contas TO authenticated;