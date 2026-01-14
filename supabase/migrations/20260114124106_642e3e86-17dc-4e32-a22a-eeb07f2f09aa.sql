-- Criar tabela diarias (dados gerais da visita do dia)
CREATE TABLE public.diarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  trecho_id UUID REFERENCES public.trechos(id) ON DELETE SET NULL,
  data_visita DATE NOT NULL,
  periodo TEXT NOT NULL DEFAULT 'dia_inteiro', -- 'manha', 'tarde', 'dia_inteiro'
  equipe_presente_ids UUID[] DEFAULT '{}',
  comentarios_jardim TEXT, -- antigo "humor do jardim"
  observacoes_internas TEXT, -- notas gerais da visita
  status TEXT NOT NULL DEFAULT 'realizado', -- 'realizado', 'agendado', 'cancelado'
  data_alerta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.diarias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para diarias
CREATE POLICY "Authenticated users can view diarias" 
  ON public.diarias FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert diarias" 
  ON public.diarias FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update diarias" 
  ON public.diarias FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete diarias" 
  ON public.diarias FOR DELETE USING (true);

-- Índices para performance
CREATE INDEX idx_diarias_cliente_id ON public.diarias(cliente_id);
CREATE INDEX idx_diarias_data_visita ON public.diarias(data_visita);
CREATE INDEX idx_diarias_status ON public.diarias(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_diarias_updated_at
  BEFORE UPDATE ON public.diarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar referência à diária na tabela registros
ALTER TABLE public.registros
ADD COLUMN diaria_id UUID REFERENCES public.diarias(id) ON DELETE CASCADE;

-- Índice para a nova coluna
CREATE INDEX idx_registros_diaria_id ON public.registros(diaria_id);

-- Remover campos que agora ficam na diária (opcional - manter para compatibilidade)
-- Os campos antigos ficam deprecated mas não removemos para não quebrar dados existentes