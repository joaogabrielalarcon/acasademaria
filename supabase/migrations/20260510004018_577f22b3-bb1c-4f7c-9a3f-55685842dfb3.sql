ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS local_id uuid REFERENCES public.locais_cliente(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orcamentos_local_id ON public.orcamentos(local_id);