ALTER TABLE public.insumos DROP CONSTRAINT IF EXISTS insumos_categoria_check;
ALTER TABLE public.insumos ADD CONSTRAINT insumos_categoria_check
  CHECK (categoria IS NULL OR categoria = ANY (ARRAY[
    'Fertilizante','Substrato','Defensivo','Semente','Ferramenta','Irrigação',
    'Vasos / Decoração','Materiais Construtivos','Outros','Insumos','Vasos'
  ]));