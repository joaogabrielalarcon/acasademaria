-- Tabela de categorias/tipos de serviço
CREATE TABLE public.categorias_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT DEFAULT '#22c55e', -- cor para exibição visual
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.categorias_servico ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Authenticated users can view categorias_servico" 
ON public.categorias_servico 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert categorias_servico" 
ON public.categorias_servico 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categorias_servico" 
ON public.categorias_servico 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete categorias_servico" 
ON public.categorias_servico 
FOR DELETE 
USING (true);

-- Inserir categorias iniciais (baseadas no que já existia)
INSERT INTO public.categorias_servico (nome, ordem) VALUES
  ('Manutenção', 1),
  ('Poda', 2),
  ('Irrigação', 3),
  ('Plantio', 4),
  ('Adubação', 5),
  ('Implantação', 6),
  ('Visita Técnica', 7),
  ('Entrega', 8),
  ('Limpeza', 9),
  ('Controle de Pragas', 10);

-- Adicionar coluna de categorias no registro (substituindo 'tipo' e 'tags')
ALTER TABLE public.registros 
ADD COLUMN categorias_ids UUID[] DEFAULT '{}'::uuid[];