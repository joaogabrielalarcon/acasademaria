
-- Tabela de regras de identificação
CREATE TABLE public.conciliacao_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  chave_pix text,
  conta text,
  agencia text,
  nome_remetente text,
  descricao_padrao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conciliacao_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e administrativo podem ver regras"
  ON public.conciliacao_regras FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem criar regras"
  ON public.conciliacao_regras FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem editar regras"
  ON public.conciliacao_regras FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem excluir regras"
  ON public.conciliacao_regras FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

-- Tabela de extratos importados
CREATE TABLE public.conciliacao_extratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco text NOT NULL CHECK (banco IN ('nubank', 'itau', 'safra', 'outro')),
  data_extrato date NOT NULL,
  arquivo_nome text,
  processado_em timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL
);

ALTER TABLE public.conciliacao_extratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e administrativo podem ver extratos"
  ON public.conciliacao_extratos FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem criar extratos"
  ON public.conciliacao_extratos FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem editar extratos"
  ON public.conciliacao_extratos FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem excluir extratos"
  ON public.conciliacao_extratos FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

-- Tabela de lançamentos extraídos
CREATE TABLE public.conciliacao_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extrato_id uuid REFERENCES public.conciliacao_extratos(id) ON DELETE CASCADE,
  data_lancamento date NOT NULL,
  valor numeric(10,2) NOT NULL,
  descricao text,
  remetente_raw text,
  conta_raw text,
  chave_pix_raw text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('identificado', 'pendente', 'em_aberto', 'baixado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conciliacao_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e administrativo podem ver lancamentos"
  ON public.conciliacao_lancamentos FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem criar lancamentos"
  ON public.conciliacao_lancamentos FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem editar lancamentos"
  ON public.conciliacao_lancamentos FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e administrativo podem excluir lancamentos"
  ON public.conciliacao_lancamentos FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

-- Trigger para updated_at na tabela de regras
CREATE TRIGGER update_conciliacao_regras_updated_at
  BEFORE UPDATE ON public.conciliacao_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
