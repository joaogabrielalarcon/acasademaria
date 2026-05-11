-- Adiciona categoria "Condicionadores de Solo" como flag em insumos
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS tipo_produto text NOT NULL DEFAULT 'insumo'
  CHECK (tipo_produto IN ('insumo', 'condicionador_solo'));

CREATE INDEX IF NOT EXISTS idx_insumos_tipo_produto ON public.insumos(tipo_produto);