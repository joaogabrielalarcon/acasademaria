-- Criar tabela de propostas comerciais
CREATE TABLE public.propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  data_envio DATE,
  data_resposta DATE,
  valor DECIMAL(12,2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo proposta_id na tabela registros
ALTER TABLE public.registros 
ADD COLUMN proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL;

-- Adicionar campos de equipe detalhada na tabela registros
ALTER TABLE public.registros 
ADD COLUMN equipe_presente_ids UUID[] DEFAULT '{}',
ADD COLUMN executores_ids UUID[] DEFAULT '{}',
ADD COLUMN solicitante TEXT;

-- Enable RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Policies para propostas
CREATE POLICY "Authenticated users can view propostas" 
ON public.propostas FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert propostas" 
ON public.propostas FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update propostas" 
ON public.propostas FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete propostas" 
ON public.propostas FOR DELETE USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_propostas_updated_at
BEFORE UPDATE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_propostas_cliente_id ON public.propostas(cliente_id);
CREATE INDEX idx_propostas_status ON public.propostas(status);
CREATE INDEX idx_registros_proposta_id ON public.registros(proposta_id);