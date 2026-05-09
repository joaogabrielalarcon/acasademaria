-- Tabela de Solicitações de Compras
CREATE TABLE public.solicitacoes_compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id UUID,
  solicitante_nome TEXT NOT NULL,
  motivo TEXT NOT NULL,
  link_ou_contato TEXT,
  valor_estimado NUMERIC(14,2),
  condicao_pagamento TEXT,
  urgencia TEXT NOT NULL DEFAULT 'media' CHECK (urgencia IN ('baixa','media','alta','urgente')),
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada','comprada')),
  motivo_recusa TEXT,
  decidido_por UUID,
  decidido_por_nome TEXT,
  decidido_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_compras_status ON public.solicitacoes_compras(status);
CREATE INDEX idx_solicitacoes_compras_solicitante ON public.solicitacoes_compras(solicitante_id);

ALTER TABLE public.solicitacoes_compras ENABLE ROW LEVEL SECURITY;

-- Visualização: todos autenticados podem ver
CREATE POLICY "Autenticados podem ver solicitacoes"
ON public.solicitacoes_compras FOR SELECT
TO authenticated
USING (true);

-- Criação: todos exceto operador_campo
CREATE POLICY "Colaboradores criam solicitacoes"
ON public.solicitacoes_compras FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role,'responsavel_obra'::user_role])
  AND solicitante_id = auth.uid()
);

-- Atualização: solicitante (enquanto pendente) ou Admin/Administrativo
CREATE POLICY "Atualizar solicitacoes"
ON public.solicitacoes_compras FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role])
  OR (solicitante_id = auth.uid() AND status = 'pendente')
);

-- Exclusão: apenas Admin
CREATE POLICY "Admin exclui solicitacoes"
ON public.solicitacoes_compras FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER trg_solicitacoes_compras_updated
BEFORE UPDATE ON public.solicitacoes_compras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();