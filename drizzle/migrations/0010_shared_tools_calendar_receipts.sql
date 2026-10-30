ALTER TABLE public.calendario_eventos
 ADD COLUMN colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
 ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
 ADD COLUMN projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
 ADD COLUMN responsavel_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
 ADD COLUMN concluido boolean NOT NULL DEFAULT false,
 ADD COLUMN observacoes text;
CREATE INDEX idx_calendario_colaborador ON public.calendario_eventos(colaborador_id);
CREATE INDEX idx_calendario_cliente ON public.calendario_eventos(cliente_id);
CREATE INDEX idx_calendario_projeto ON public.calendario_eventos(projeto_id);
CREATE INDEX idx_calendario_responsavel ON public.calendario_eventos(responsavel_id);
CREATE INDEX idx_calendario_abertos_data ON public.calendario_eventos(data) WHERE concluido=false;
ALTER TABLE public.financeiro_parcelas
 ADD COLUMN data_pagamento date,
 ADD COLUMN valor_recebido numeric(14,2),
 ADD COLUMN numero_nf text,
 ADD COLUMN data_nf date,
 ADD COLUMN forma_pagamento text;
COMMENT ON COLUMN public.financeiro_parcelas.valor_recebido IS 'Receipt amount in BRL, numeric(14,2), matching existing valor ledger units.';
CREATE INDEX IF NOT EXISTS idx_financeiro_parcelas_vencimento_aberto ON public.financeiro_parcelas(data_vencimento) WHERE status <> 'pago';