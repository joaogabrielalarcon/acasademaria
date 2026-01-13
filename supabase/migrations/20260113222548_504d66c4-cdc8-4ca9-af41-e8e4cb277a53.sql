-- Adicionar campos expandidos na tabela clientes
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS condominio text,
ADD COLUMN IF NOT EXISTS cpf_cnpj text,
ADD COLUMN IF NOT EXISTS inscricao_estadual text,
ADD COLUMN IF NOT EXISTS proprietarios jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS funcionarios_casa jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assessores jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS datas_importantes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS particularidades text;

-- Criar tabela de insumos (catálogo)
CREATE TABLE IF NOT EXISTS public.insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text, -- 'ferramenta', 'maquina', 'adubo', 'substrato', 'planta', 'outro'
  unidade text,   -- 'un', 'kg', 'L', 'm', 'saco'
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Criar tabela de vínculo registro-insumos
CREATE TABLE IF NOT EXISTS public.registro_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade decimal NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_insumos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para insumos
CREATE POLICY "Authenticated users can view insumos"
ON public.insumos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert insumos"
ON public.insumos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update insumos"
ON public.insumos FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete insumos"
ON public.insumos FOR DELETE
USING (true);

-- Políticas RLS para registro_insumos
CREATE POLICY "Authenticated users can view registro_insumos"
ON public.registro_insumos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert registro_insumos"
ON public.registro_insumos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update registro_insumos"
ON public.registro_insumos FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete registro_insumos"
ON public.registro_insumos FOR DELETE
USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_registro_insumos_registro_id ON public.registro_insumos(registro_id);
CREATE INDEX IF NOT EXISTS idx_registro_insumos_insumo_id ON public.registro_insumos(insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON public.insumos(categoria);
CREATE INDEX IF NOT EXISTS idx_insumos_ativo ON public.insumos(ativo);