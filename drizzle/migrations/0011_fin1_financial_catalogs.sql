CREATE TABLE public.financeiro_contas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL UNIQUE, banco text, agencia text, numero text,
 titular text NOT NULL CHECK (titular IN ('PJ','PF')), empresa text, ativo boolean NOT NULL DEFAULT true,
 saldo_inicial numeric(14,2) NOT NULL DEFAULT 0, data_saldo_inicial date NOT NULL DEFAULT DATE '2026-01-01', ordem integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id,nome,banco,agencia,numero,titular,empresa,ativo,data_saldo_inicial,ordem,created_at,updated_at) ON public.financeiro_contas TO authenticated;
GRANT INSERT (nome,banco,agencia,numero,titular,empresa,ativo,ordem), UPDATE (nome,banco,agencia,numero,titular,empresa,ativo,ordem) ON public.financeiro_contas TO authenticated;
GRANT ALL ON public.financeiro_contas TO service_role;
ALTER TABLE public.financeiro_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY financeiro_contas_select ON public.financeiro_contas FOR SELECT TO authenticated USING ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])));
CREATE POLICY financeiro_contas_insert ON public.financeiro_contas FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])));
CREATE POLICY financeiro_contas_update ON public.financeiro_contas FOR UPDATE TO authenticated USING ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[]))) WITH CHECK ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])));
CREATE TRIGGER financeiro_contas_updated_at BEFORE UPDATE ON public.financeiro_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON COLUMN public.financeiro_contas.saldo_inicial IS 'FIN-1: valor em reais numeric(14,2), leitura exclusiva por funcao autorizada para admin/diretor.';
CREATE TABLE public.financeiro_categorias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
 grupo text NOT NULL, entra_no_resultado boolean NOT NULL DEFAULT true, ativo boolean NOT NULL DEFAULT true, ordem integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(nome,tipo)
);
GRANT SELECT,INSERT,UPDATE ON public.financeiro_categorias TO authenticated;
GRANT ALL ON public.financeiro_categorias TO service_role;
ALTER TABLE public.financeiro_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY financeiro_categorias_select ON public.financeiro_categorias FOR SELECT TO authenticated USING ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])));
CREATE POLICY financeiro_categorias_insert ON public.financeiro_categorias FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])));
CREATE POLICY financeiro_categorias_update ON public.financeiro_categorias FOR UPDATE TO authenticated USING ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[]))) WITH CHECK ((SELECT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])));
CREATE INDEX financeiro_contas_ativo_ordem_idx ON public.financeiro_contas(ativo,ordem);
CREATE INDEX financeiro_categorias_tipo_ativo_ordem_idx ON public.financeiro_categorias(tipo,ativo,ordem);
CREATE TRIGGER financeiro_categorias_updated_at BEFORE UPDATE ON public.financeiro_categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();