ALTER TABLE public.orcamento_itens
ADD COLUMN IF NOT EXISTS planta_id uuid REFERENCES public.plantas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_planta_id ON public.orcamento_itens(planta_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_insumo_id ON public.orcamento_itens(insumo_id);