-- Add new columns to registros table for solicitação/observação type
ALTER TABLE public.registros 
ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS status_solicitacao text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.registros.prioridade IS 'Nível de prioridade: baixa, normal, alta, urgente';
COMMENT ON COLUMN public.registros.status_solicitacao IS 'Status de acompanhamento para solicitações: pendente, em_analise, resolvido';