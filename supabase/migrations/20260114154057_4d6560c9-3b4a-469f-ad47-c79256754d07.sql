-- Renomear funcao para cargo e adicionar novos campos
ALTER TABLE public.colaboradores 
  RENAME COLUMN funcao TO cargo;

-- Adicionar novos campos
ALTER TABLE public.colaboradores
  ADD COLUMN area text,
  ADD COLUMN telefone text,
  ADD COLUMN endereco text,
  ADD COLUMN cidade text,
  ADD COLUMN estado text,
  ADD COLUMN cep text,
  ADD COLUMN maquinas_ids uuid[] DEFAULT '{}',
  ADD COLUMN tamanho_camiseta text,
  ADD COLUMN tamanho_calca text,
  ADD COLUMN tamanho_calcado text;

-- Criar tabela para registrar entregas de materiais/uniformes aos colaboradores
CREATE TABLE public.entregas_colaborador (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade numeric NOT NULL DEFAULT 1,
  data_entrega date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.entregas_colaborador ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view entregas_colaborador"
ON public.entregas_colaborador FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert entregas_colaborador"
ON public.entregas_colaborador FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update entregas_colaborador"
ON public.entregas_colaborador FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete entregas_colaborador"
ON public.entregas_colaborador FOR DELETE USING (true);