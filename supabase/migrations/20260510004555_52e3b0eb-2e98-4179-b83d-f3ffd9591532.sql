ALTER TABLE public.locais_cliente
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado character(2),
  ADD COLUMN IF NOT EXISTS tipo_cliente text;

ALTER TABLE public.locais_cliente
  DROP CONSTRAINT IF EXISTS locais_cliente_tipo_cliente_check;

ALTER TABLE public.locais_cliente
  ADD CONSTRAINT locais_cliente_tipo_cliente_check
  CHECK (tipo_cliente IS NULL OR tipo_cliente = ANY (ARRAY['residencial','condominio','resort','hotel','comercial']));