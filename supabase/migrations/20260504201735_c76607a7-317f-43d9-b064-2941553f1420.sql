-- Add range columns for altura (meters) on plants and related tables
ALTER TABLE public.plantas
  ADD COLUMN IF NOT EXISTS altura_min_m numeric,
  ADD COLUMN IF NOT EXISTS altura_max_m numeric;

ALTER TABLE public.recebimento_itens
  ADD COLUMN IF NOT EXISTS altura_min_m numeric,
  ADD COLUMN IF NOT EXISTS altura_max_m numeric;

ALTER TABLE public.memorial_descritivo
  ADD COLUMN IF NOT EXISTS altura_min_m numeric,
  ADD COLUMN IF NOT EXISTS altura_max_m numeric;

-- Initialize min/max from existing altura_m (single point fallback)
UPDATE public.plantas
  SET altura_min_m = altura_m, altura_max_m = altura_m
  WHERE altura_m IS NOT NULL AND altura_min_m IS NULL AND altura_max_m IS NULL;

UPDATE public.recebimento_itens
  SET altura_min_m = altura_m, altura_max_m = altura_m
  WHERE altura_m IS NOT NULL AND altura_min_m IS NULL AND altura_max_m IS NULL;

UPDATE public.memorial_descritivo
  SET altura_min_m = altura_m, altura_max_m = altura_m
  WHERE altura_m IS NOT NULL AND altura_min_m IS NULL AND altura_max_m IS NULL;