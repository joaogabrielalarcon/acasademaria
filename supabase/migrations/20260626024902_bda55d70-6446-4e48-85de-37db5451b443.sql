ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS memorial_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS memorial_atualizado_em timestamptz;

COMMENT ON COLUMN public.orcamentos.memorial_snapshot IS 'Snapshot da última extração do memorial (itens, insumos extraordinários, texto bruto, nome do arquivo, modo). Garante que a informação não se perca mesmo antes do save manual.';