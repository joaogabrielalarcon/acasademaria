ALTER TABLE public.locais_cliente
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS rua text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text;