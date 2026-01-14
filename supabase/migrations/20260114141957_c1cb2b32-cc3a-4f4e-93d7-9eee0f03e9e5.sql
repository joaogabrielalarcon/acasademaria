-- Tabela de Fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fornecedores"
  ON public.fornecedores FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert fornecedores"
  ON public.fornecedores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fornecedores"
  ON public.fornecedores FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete fornecedores"
  ON public.fornecedores FOR DELETE
  USING (true);

-- Tabela de Categorias de Plantas (editável pelo admin)
CREATE TABLE public.categorias_plantas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  campos_obrigatorios JSONB DEFAULT '["porte", "unidade"]'::jsonb,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para categorias_plantas
ALTER TABLE public.categorias_plantas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categorias_plantas"
  ON public.categorias_plantas FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categorias_plantas"
  ON public.categorias_plantas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categorias_plantas"
  ON public.categorias_plantas FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete categorias_plantas"
  ON public.categorias_plantas FOR DELETE
  USING (true);

-- Inserir categorias padrão
INSERT INTO public.categorias_plantas (nome, campos_obrigatorios, ordem) VALUES
  ('Forração', '["porte", "unidade"]', 1),
  ('Arbusto', '["porte", "unidade"]', 2),
  ('Árvore', '["altura", "dap", "unidade"]', 3),
  ('Palmeira', '["altura", "dap", "unidade"]', 4);

-- Tabela de Plantas
CREATE TABLE public.plantas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_popular TEXT NOT NULL,
  nome_cientifico TEXT,
  categoria_id UUID REFERENCES public.categorias_plantas(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  porte TEXT,
  altura_cm NUMERIC,
  dap_cm NUMERIC,
  unidade TEXT,
  nota_qualidade INTEGER CHECK (nota_qualidade >= 1 AND nota_qualidade <= 5),
  preco_unitario NUMERIC,
  ultima_compra DATE,
  midia JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_plantas_updated_at
  BEFORE UPDATE ON public.plantas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para plantas
ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plantas"
  ON public.plantas FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert plantas"
  ON public.plantas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update plantas"
  ON public.plantas FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete plantas"
  ON public.plantas FOR DELETE
  USING (true);

-- Tabela para itens recebidos em um registro de recebimento
CREATE TABLE public.recebimento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  tipo_item TEXT NOT NULL, -- 'planta' ou 'insumo'
  planta_id UUID REFERENCES public.plantas(id),
  insumo_id UUID REFERENCES public.insumos(id),
  quantidade NUMERIC NOT NULL,
  unidade TEXT,
  porte TEXT,
  altura_cm NUMERIC,
  dap_cm NUMERIC,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir que pelo menos planta_id ou insumo_id está preenchido
  CONSTRAINT check_item_type CHECK (
    (tipo_item = 'planta' AND planta_id IS NOT NULL AND insumo_id IS NULL) OR
    (tipo_item = 'insumo' AND insumo_id IS NOT NULL AND planta_id IS NULL)
  )
);

-- RLS para recebimento_itens
ALTER TABLE public.recebimento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recebimento_itens"
  ON public.recebimento_itens FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert recebimento_itens"
  ON public.recebimento_itens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recebimento_itens"
  ON public.recebimento_itens FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete recebimento_itens"
  ON public.recebimento_itens FOR DELETE
  USING (true);

-- Adicionar fornecedor_id na tabela insumos
ALTER TABLE public.insumos
  ADD COLUMN fornecedor_id UUID REFERENCES public.fornecedores(id),
  ADD COLUMN preco_unitario NUMERIC,
  ADD COLUMN ultima_compra DATE,
  ADD COLUMN observacoes TEXT;