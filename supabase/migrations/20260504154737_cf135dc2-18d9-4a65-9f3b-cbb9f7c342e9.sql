
-- 1. Add altura_m column to the three tables
ALTER TABLE public.plantas ADD COLUMN IF NOT EXISTS altura_m numeric;
ALTER TABLE public.recebimento_itens ADD COLUMN IF NOT EXISTS altura_m numeric;
ALTER TABLE public.memorial_descritivo ADD COLUMN IF NOT EXISTS altura_m numeric;

-- 2. Migrate existing data: parse text "porte" into altura_m (meters)
-- Strategy: extract all numeric tokens (handling comma decimals), take their average.
-- Examples: "1,50 m" -> 1.5; "1,50 m a 2,00 m" -> 1.75; "0,40 m" -> 0.4

WITH parsed AS (
  SELECT id,
    (
      SELECT AVG(REPLACE(m[1], ',', '.')::numeric)
      FROM regexp_matches(porte, '(\d+(?:[.,]\d+)?)', 'g') AS m
    ) AS valor
  FROM public.plantas
  WHERE porte IS NOT NULL AND porte <> '' AND porte <> '-'
)
UPDATE public.plantas p SET altura_m = parsed.valor
FROM parsed WHERE p.id = parsed.id AND parsed.valor IS NOT NULL AND parsed.valor > 0;

-- Also migrate any altura_cm values that exist (cm -> m)
UPDATE public.plantas SET altura_m = altura_cm / 100.0
WHERE altura_cm IS NOT NULL AND altura_cm > 0 AND altura_m IS NULL;

WITH parsed AS (
  SELECT id,
    (SELECT AVG(REPLACE(m[1], ',', '.')::numeric)
     FROM regexp_matches(porte, '(\d+(?:[.,]\d+)?)', 'g') AS m) AS valor
  FROM public.recebimento_itens
  WHERE porte IS NOT NULL AND porte <> ''
)
UPDATE public.recebimento_itens r SET altura_m = parsed.valor
FROM parsed WHERE r.id = parsed.id AND parsed.valor IS NOT NULL AND parsed.valor > 0;

UPDATE public.recebimento_itens SET altura_m = altura_cm / 100.0
WHERE altura_cm IS NOT NULL AND altura_cm > 0 AND altura_m IS NULL;

WITH parsed AS (
  SELECT id,
    (SELECT AVG(REPLACE(m[1], ',', '.')::numeric)
     FROM regexp_matches(porte, '(\d+(?:[.,]\d+)?)', 'g') AS m) AS valor
  FROM public.memorial_descritivo
  WHERE porte IS NOT NULL AND porte <> ''
)
UPDATE public.memorial_descritivo md SET altura_m = parsed.valor
FROM parsed WHERE md.id = parsed.id AND parsed.valor IS NOT NULL AND parsed.valor > 0;

-- 3. Drop redundant columns
ALTER TABLE public.plantas DROP COLUMN IF EXISTS porte;
ALTER TABLE public.plantas DROP COLUMN IF EXISTS altura_cm;
ALTER TABLE public.recebimento_itens DROP COLUMN IF EXISTS porte;
ALTER TABLE public.recebimento_itens DROP COLUMN IF EXISTS altura_cm;
ALTER TABLE public.memorial_descritivo DROP COLUMN IF EXISTS porte;
