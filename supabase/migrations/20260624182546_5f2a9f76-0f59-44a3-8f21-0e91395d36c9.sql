
-- Fase 1: marcação "base/recorrente" para insumos
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS is_base boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_ordem integer;

CREATE INDEX IF NOT EXISTS idx_insumos_is_base ON public.insumos (is_base) WHERE is_base = true;

COMMENT ON COLUMN public.insumos.is_base IS 'Insumo recorrente do projeto: entra automaticamente como linha na etapa 3 do orçamento. Editável por admin/administrativo.';
COMMENT ON COLUMN public.insumos.base_ordem IS 'Ordem de exibição dos insumos base na lista do projeto (menor primeiro).';

-- Seed: marcar como base os recorrentes (match por nome insensível a maiúsculas/acentos parciais)
WITH base_nomes(nome, ordem) AS (
  VALUES
    ('terra', 1),
    ('torta de mamona', 2),
    ('yoorin', 3),
    ('k-forte', 4),
    ('algen', 5),
    ('algen (lithothamnium)', 5),
    ('lithothamnium', 5),
    ('bokashi', 6),
    ('terra preta', 7),
    ('adubo preparado', 8),
    ('corda', 9),
    ('corda (10mm)', 9),
    ('corda 10mm', 9),
    ('bidin', 10),
    ('bidim', 10),
    ('limitador', 11),
    ('lona', 12)
)
UPDATE public.insumos i
SET is_base = true,
    base_ordem = bn.ordem
FROM base_nomes bn
WHERE lower(trim(i.nome)) = bn.nome
  AND i.ativo = true;
