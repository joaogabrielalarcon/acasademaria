-- Adicionar status do registro (realizado, agendado, cancelado)
ALTER TABLE public.registros
ADD COLUMN status TEXT NOT NULL DEFAULT 'realizado';

-- Adicionar campo para data/hora do alerta
ALTER TABLE public.registros
ADD COLUMN data_alerta TIMESTAMP WITH TIME ZONE;

-- Índice para performance em consultas por status
CREATE INDEX idx_registros_status ON public.registros(status);

-- Índice composto para consultas de calendário (cliente + data + status)
CREATE INDEX idx_registros_calendario ON public.registros(cliente_id, data_servico, status);