ALTER TABLE public.plantas
  ADD COLUMN IF NOT EXISTS embalagem text,
  ADD COLUMN IF NOT EXISTS alerta_validacao text,
  ADD COLUMN IF NOT EXISTS porte text;