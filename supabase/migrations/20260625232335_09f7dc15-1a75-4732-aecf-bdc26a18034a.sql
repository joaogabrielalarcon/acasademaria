
CREATE TABLE IF NOT EXISTS public.insumo_unidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  unidade text NOT NULL,
  descricao text,
  fator_para_padrao numeric,
  is_padrao boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (insumo_id, unidade)
);

CREATE INDEX IF NOT EXISTS idx_insumo_unidades_insumo ON public.insumo_unidades(insumo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumo_unidades TO authenticated;
GRANT ALL ON public.insumo_unidades TO service_role;

ALTER TABLE public.insumo_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumo_unidades_select_auth" ON public.insumo_unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumo_unidades_insert_auth" ON public.insumo_unidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insumo_unidades_update_auth" ON public.insumo_unidades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "insumo_unidades_delete_admin" ON public.insumo_unidades FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_insumo_unidades_updated
  BEFORE UPDATE ON public.insumo_unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: cada insumo ativo com unidade vira uma forma padrão
INSERT INTO public.insumo_unidades (insumo_id, unidade, is_padrao, ordem)
SELECT i.id, NULLIF(trim(i.unidade), ''), true, 0
FROM public.insumos i
WHERE i.ativo = true
  AND NULLIF(trim(i.unidade), '') IS NOT NULL
ON CONFLICT (insumo_id, unidade) DO NOTHING;
