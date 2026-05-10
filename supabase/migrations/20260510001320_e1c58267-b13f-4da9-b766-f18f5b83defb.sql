
-- 1) Adicionar coluna 'porte' ao histórico de preços para registrar a altura/porte cotado
ALTER TABLE public.historico_precos
  ADD COLUMN IF NOT EXISTS porte text,
  ADD COLUMN IF NOT EXISTS unidade text;

CREATE INDEX IF NOT EXISTS idx_historico_porte ON public.historico_precos (item_id, porte);

-- 2) Tabela de avaliações de fornecedor por item (planta/insumo)
CREATE TABLE IF NOT EXISTS public.fornecedor_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_tipo text NOT NULL CHECK (item_tipo IN ('planta','insumo')),
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  criado_por uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aval_fornecedor ON public.fornecedor_avaliacoes (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_aval_item ON public.fornecedor_avaliacoes (item_id, item_tipo);

ALTER TABLE public.fornecedor_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_aval" ON public.fornecedor_avaliacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_aval" ON public.fornecedor_avaliacoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_aval" ON public.fornecedor_avaliacoes
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_aval" ON public.fornecedor_avaliacoes
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_aval_updated_at
  BEFORE UPDATE ON public.fornecedor_avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
