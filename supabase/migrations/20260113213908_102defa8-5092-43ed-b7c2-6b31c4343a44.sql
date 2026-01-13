-- Tabela: clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  telefone TEXT,
  email TEXT,
  notas TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'prospecto')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: trechos
CREATE TABLE public.trechos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: colaboradores
CREATE TABLE public.colaboradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  funcao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: registros
CREATE TABLE public.registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  trecho_id UUID REFERENCES public.trechos(id) ON DELETE SET NULL,
  data_servico DATE NOT NULL,
  hora_servico TIME,
  tipo TEXT NOT NULL CHECK (tipo IN ('manutencao', 'implantacao', 'entrega', 'visita_tecnica', 'reuniao', 'outro')),
  area_funcional TEXT CHECK (area_funcional IN ('campo', 'administrativo', 'projetos', 'direcao')),
  colaboradores_ids UUID[],
  descricao TEXT NOT NULL,
  observacoes_internas TEXT,
  tags TEXT[],
  humor_do_jardim TEXT,
  midia JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trechos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

-- Policies para usuários autenticados (sistema interno)
CREATE POLICY "Authenticated users can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view trechos" ON public.trechos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert trechos" ON public.trechos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update trechos" ON public.trechos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete trechos" ON public.trechos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view colaboradores" ON public.colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert colaboradores" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update colaboradores" ON public.colaboradores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete colaboradores" ON public.colaboradores FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view registros" ON public.registros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert registros" ON public.registros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update registros" ON public.registros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete registros" ON public.registros FOR DELETE TO authenticated USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_registros_updated_at BEFORE UPDATE ON public.registros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_registros_cliente ON public.registros(cliente_id);
CREATE INDEX idx_registros_data ON public.registros(data_servico DESC);
CREATE INDEX idx_trechos_cliente ON public.trechos(cliente_id);