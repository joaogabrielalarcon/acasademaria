-- Server-side catalog search for pickers. SECURITY INVOKER: table RLS still applies.
CREATE OR REPLACE FUNCTION public.buscar_plantas(p_query text, p_limit integer DEFAULT 30)
RETURNS TABLE(id uuid, nome_popular text, nome_cientifico text, unidade text, porte text, altura_m numeric, dap_cm numeric, categoria_id uuid, preco_unitario numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH q AS (SELECT public.unaccent_safe(lower(trim(coalesce(p_query,'')))) AS t)
  SELECT p.id, p.nome_popular, p.nome_cientifico, p.unidade::text, p.porte::text, p.altura_m::numeric, p.dap_cm::numeric, p.categoria_id, p.preco_unitario::numeric
  FROM public.plantas p, q
  WHERE p.ativo = true AND q.t <> ''
    AND (p.nome_popular ILIKE '%'||trim(p_query)||'%' OR p.nome_cientifico ILIKE '%'||trim(p_query)||'%'
         OR public.unaccent_safe(lower(p.nome_popular)) LIKE '%'||q.t||'%'
         OR public.unaccent_safe(lower(coalesce(p.nome_cientifico,''))) LIKE '%'||q.t||'%')
  ORDER BY greatest(similarity(lower(p.nome_popular), q.t), similarity(lower(coalesce(p.nome_cientifico,'')), q.t)) DESC, p.nome_popular
  LIMIT least(greatest(coalesce(p_limit,30),1),30);
$$;

CREATE OR REPLACE FUNCTION public.buscar_insumos(p_query text, p_limit integer DEFAULT 30)
RETURNS TABLE(id uuid, nome text, categoria text, unidade text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH q AS (SELECT public.unaccent_safe(lower(trim(coalesce(p_query,'')))) AS t)
  SELECT i.id, i.nome, i.categoria::text, i.unidade::text
  FROM public.insumos i, q
  WHERE i.ativo = true AND (q.t = '' OR i.nome ILIKE '%'||trim(p_query)||'%' OR public.unaccent_safe(lower(i.nome)) LIKE '%'||q.t||'%')
  ORDER BY similarity(lower(i.nome), q.t) DESC, i.nome
  LIMIT least(greatest(coalesce(p_limit,30),1),30);
$$;

CREATE OR REPLACE FUNCTION public.buscar_fornecedores(p_query text, p_limit integer DEFAULT 30)
RETURNS TABLE(id uuid, nome text, cidade text, estado text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH q AS (SELECT public.unaccent_safe(lower(trim(coalesce(p_query,'')))) AS t)
  SELECT f.id, f.nome, f.cidade::text, f.estado::text
  FROM public.fornecedores f, q
  WHERE f.status = 'ativo' AND (q.t = '' OR lower(f.nome) LIKE '%'||lower(trim(p_query))||'%' OR public.unaccent_safe(lower(f.nome)) LIKE '%'||q.t||'%')
  ORDER BY similarity(lower(f.nome), q.t) DESC, f.nome
  LIMIT least(greatest(coalesce(p_limit,30),1),30);
$$;

REVOKE ALL ON FUNCTION public.buscar_plantas(text,integer), public.buscar_insumos(text,integer), public.buscar_fornecedores(text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_plantas(text,integer), public.buscar_insumos(text,integer), public.buscar_fornecedores(text,integer) TO authenticated, service_role;