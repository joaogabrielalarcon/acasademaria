
-- 0. Limpeza de dados de teste
DELETE FROM public.demandas WHERE projeto_id IS NOT NULL;
DELETE FROM public.escala_alocacoes WHERE projeto_id IS NOT NULL;
DELETE FROM public.propostas;
DELETE FROM public.crm_cards;
DELETE FROM public.projetos;

-- 1. Novas colunas em projetos
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS substatus text,
  ADD COLUMN IF NOT EXISTS temperatura text CHECK (temperatura IN ('quente','morno','frio')),
  ADD COLUMN IF NOT EXISTS data_retorno_prometida date,
  ADD COLUMN IF NOT EXISTS proximo_contato_em date,
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS data_prometida_cliente date,
  ADD COLUMN IF NOT EXISTS data_alvo_interna date;

-- 2. Default do funil
ALTER TABLE public.projetos ALTER COLUMN status SET DEFAULT 'prospeccao';

-- 3. Proposta pertence ao Negócio
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_propostas_projeto_id ON public.propostas(projeto_id);

-- 4. Depreciar crm_cards (rename, seguro para a rota /crm)
ALTER TABLE IF EXISTS public.crm_cards RENAME TO crm_cards_deprecated;

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS idx_projetos_status ON public.projetos(status);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente_id ON public.projetos(cliente_id);
