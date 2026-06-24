ALTER TABLE public.orcamento_categorias_markup ADD COLUMN IF NOT EXISTS piso_margem_pct numeric;
ALTER TABLE public.perfis_markup_categorias ADD COLUMN IF NOT EXISTS piso_margem_pct numeric;