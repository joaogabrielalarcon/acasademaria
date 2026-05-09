ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS motivo_nao_aprovacao text,
  ADD COLUMN IF NOT EXISTS data_nao_aprovacao timestamp with time zone;

UPDATE public.orcamentos SET status = 'nao_aprovado' WHERE status = 'cancelado';