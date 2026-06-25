
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. catalogo_apelidos
CREATE TABLE IF NOT EXISTS public.catalogo_apelidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('planta','insumo')),
  item_id uuid NOT NULL,
  apelido text NOT NULL,
  apelido_norm text NOT NULL,
  confianca text NOT NULL DEFAULT 'humano' CHECK (confianca IN ('humano','ia')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_apelidos TO authenticated;
GRANT ALL ON public.catalogo_apelidos TO service_role;
ALTER TABLE public.catalogo_apelidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados leem apelidos" ON public.catalogo_apelidos;
DROP POLICY IF EXISTS "Autenticados inserem apelidos" ON public.catalogo_apelidos;
DROP POLICY IF EXISTS "Autenticados atualizam apelidos" ON public.catalogo_apelidos;
DROP POLICY IF EXISTS "Autenticados removem apelidos" ON public.catalogo_apelidos;
CREATE POLICY "Autenticados leem apelidos" ON public.catalogo_apelidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados inserem apelidos" ON public.catalogo_apelidos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam apelidos" ON public.catalogo_apelidos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados removem apelidos" ON public.catalogo_apelidos FOR DELETE TO authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS catalogo_apelidos_unico ON public.catalogo_apelidos(tipo, apelido_norm, item_id);
CREATE INDEX IF NOT EXISTS catalogo_apelidos_busca ON public.catalogo_apelidos(tipo, apelido_norm);
CREATE INDEX IF NOT EXISTS catalogo_apelidos_item ON public.catalogo_apelidos(item_id);

-- 2. Trigram indexes
CREATE INDEX IF NOT EXISTS plantas_nome_popular_trgm ON public.plantas USING gin (nome_popular gin_trgm_ops);
CREATE INDEX IF NOT EXISTS plantas_nome_cientifico_trgm ON public.plantas USING gin (nome_cientifico gin_trgm_ops);
CREATE INDEX IF NOT EXISTS insumos_nome_trgm ON public.insumos USING gin (nome gin_trgm_ops);

-- 3. Normalizador (unaccent_safe primeiro)
CREATE OR REPLACE FUNCTION public.unaccent_safe(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(
    coalesce(t,''),
    'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN'
  );
$$;

CREATE OR REPLACE FUNCTION public.norm_catalogo(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT btrim(regexp_replace(lower(public.unaccent_safe(coalesce(t,''))), '\s+', ' ', 'g'));
$$;

-- 4. match_catalogo
DROP FUNCTION IF EXISTS public.match_catalogo(text,text,int);
CREATE OR REPLACE FUNCTION public.match_catalogo(
  p_tipo text, p_query text, p_limit int DEFAULT 6
) RETURNS TABLE(
  item_id uuid, nome text, nome_secundario text, score numeric, fonte text, status text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_q text := public.norm_catalogo(p_query);
BEGIN
  IF v_q IS NULL OR length(v_q) < 2 THEN RETURN; END IF;

  IF p_tipo = 'planta' THEN
    RETURN QUERY
    WITH base AS (
      SELECT p.id AS item_id, p.nome_popular AS nome, p.nome_cientifico AS nome_secundario,
             1.0::numeric AS score, 'apelido'::text AS fonte
      FROM public.catalogo_apelidos ca JOIN public.plantas p ON p.id = ca.item_id
      WHERE ca.tipo = 'planta' AND ca.apelido_norm = v_q AND p.ativo
      UNION ALL
      SELECT p.id, p.nome_popular, p.nome_cientifico, 0.99::numeric, 'cientifico'::text
      FROM public.plantas p
      WHERE p.ativo AND p.nome_cientifico IS NOT NULL AND public.norm_catalogo(p.nome_cientifico) = v_q
      UNION ALL
      SELECT p.id, p.nome_popular, p.nome_cientifico, 0.98::numeric, 'exato'::text
      FROM public.plantas p WHERE p.ativo AND public.norm_catalogo(p.nome_popular) = v_q
      UNION ALL
      SELECT p.id, p.nome_popular, p.nome_cientifico,
             GREATEST(
               similarity(public.norm_catalogo(p.nome_popular), v_q),
               similarity(public.norm_catalogo(coalesce(p.nome_cientifico,'')), v_q)
             )::numeric, 'fuzzy'::text
      FROM public.plantas p
      WHERE p.ativo AND (public.norm_catalogo(p.nome_popular) % v_q
        OR public.norm_catalogo(coalesce(p.nome_cientifico,'')) % v_q)
    ), ranked AS (
      SELECT DISTINCT ON (b.item_id) b.item_id, b.nome, b.nome_secundario, b.score, b.fonte
      FROM base b ORDER BY b.item_id, b.score DESC
    )
    SELECT r.item_id, r.nome, r.nome_secundario, r.score, r.fonte,
           CASE WHEN r.fonte IN ('apelido','cientifico','exato') OR r.score >= 0.90 THEN 'match'
                WHEN r.score >= 0.55 THEN 'suggest' ELSE 'none' END
    FROM ranked r WHERE r.score >= 0.45 ORDER BY r.score DESC LIMIT p_limit;

  ELSIF p_tipo = 'insumo' THEN
    RETURN QUERY
    WITH base AS (
      SELECT i.id AS item_id, i.nome AS nome, i.categoria AS nome_secundario,
             1.0::numeric AS score, 'apelido'::text AS fonte
      FROM public.catalogo_apelidos ca JOIN public.insumos i ON i.id = ca.item_id
      WHERE ca.tipo = 'insumo' AND ca.apelido_norm = v_q AND i.ativo
      UNION ALL
      SELECT i.id, i.nome, i.categoria, 0.98::numeric, 'exato'::text
      FROM public.insumos i WHERE i.ativo AND public.norm_catalogo(i.nome) = v_q
      UNION ALL
      SELECT i.id, i.nome, i.categoria, similarity(public.norm_catalogo(i.nome), v_q)::numeric, 'fuzzy'::text
      FROM public.insumos i WHERE i.ativo AND public.norm_catalogo(i.nome) % v_q
    ), ranked AS (
      SELECT DISTINCT ON (b.item_id) b.item_id, b.nome, b.nome_secundario, b.score, b.fonte
      FROM base b ORDER BY b.item_id, b.score DESC
    )
    SELECT r.item_id, r.nome, r.nome_secundario, r.score, r.fonte,
           CASE WHEN r.fonte IN ('apelido','exato') OR r.score >= 0.90 THEN 'match'
                WHEN r.score >= 0.55 THEN 'suggest' ELSE 'none' END
    FROM ranked r WHERE r.score >= 0.45 ORDER BY r.score DESC LIMIT p_limit;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.match_catalogo(text,text,int) TO authenticated, service_role;

-- 5. sugerir_duplicados_catalogo
DROP FUNCTION IF EXISTS public.sugerir_duplicados_catalogo(text,numeric,int);
CREATE OR REPLACE FUNCTION public.sugerir_duplicados_catalogo(
  p_tipo text, p_limiar numeric DEFAULT 0.70, p_limit int DEFAULT 50
) RETURNS TABLE(
  a_id uuid, a_nome text, a_secundario text,
  b_id uuid, b_nome text, b_secundario text, score numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tipo = 'planta' THEN
    RETURN QUERY
    SELECT a.id, a.nome_popular, a.nome_cientifico,
           b.id, b.nome_popular, b.nome_cientifico,
           similarity(public.norm_catalogo(a.nome_popular), public.norm_catalogo(b.nome_popular))::numeric
    FROM public.plantas a JOIN public.plantas b
      ON a.id < b.id AND a.ativo AND b.ativo
      AND public.norm_catalogo(a.nome_popular) % public.norm_catalogo(b.nome_popular)
    WHERE similarity(public.norm_catalogo(a.nome_popular), public.norm_catalogo(b.nome_popular)) >= p_limiar
    ORDER BY 7 DESC LIMIT p_limit;
  ELSIF p_tipo = 'insumo' THEN
    RETURN QUERY
    SELECT a.id, a.nome, a.categoria,
           b.id, b.nome, b.categoria,
           similarity(public.norm_catalogo(a.nome), public.norm_catalogo(b.nome))::numeric
    FROM public.insumos a JOIN public.insumos b
      ON a.id < b.id AND a.ativo AND b.ativo
      AND public.norm_catalogo(a.nome) % public.norm_catalogo(b.nome)
    WHERE similarity(public.norm_catalogo(a.nome), public.norm_catalogo(b.nome)) >= p_limiar
    ORDER BY 7 DESC LIMIT p_limit;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.sugerir_duplicados_catalogo(text,numeric,int) TO authenticated, service_role;
