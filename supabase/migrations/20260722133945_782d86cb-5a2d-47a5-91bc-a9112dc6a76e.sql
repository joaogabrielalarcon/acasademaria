
CREATE OR REPLACE FUNCTION public.mcp_list_public_tables()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tabela', c.relname,
    'tipo', CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview' WHEN 'p' THEN 'partitioned' END,
    'colunas', (SELECT count(*) FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
    'rls_habilitado', c.relrowsecurity
  ) ORDER BY c.relname), '[]'::jsonb)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r','v','m','p');
$$;

CREATE OR REPLACE FUNCTION public.mcp_describe_table(p_tabela text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_oid oid;
  v_rls boolean;
  v_kind "char";
  v_colunas jsonb;
  v_pk jsonb;
  v_fks jsonb;
BEGIN
  SELECT c.oid, c.relrowsecurity, c.relkind
    INTO v_oid, v_rls, v_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = p_tabela
    AND c.relkind IN ('r','v','m','p');

  IF v_oid IS NULL THEN
    RETURN jsonb_build_object('erro', format('Tabela public.%I não encontrada', p_tabela));
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'nome', a.attname,
    'tipo', format_type(a.atttypid, a.atttypmod),
    'nullable', NOT a.attnotnull,
    'default', pg_get_expr(ad.adbin, ad.adrelid)
  ) ORDER BY a.attnum)
  INTO v_colunas
  FROM pg_attribute a
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE a.attrelid = v_oid AND a.attnum > 0 AND NOT a.attisdropped;

  SELECT jsonb_agg(a.attname ORDER BY array_position(i.indkey::int[], a.attnum))
  INTO v_pk
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  WHERE i.indrelid = v_oid AND i.indisprimary;

  SELECT jsonb_agg(jsonb_build_object(
    'nome', con.conname,
    'colunas', (
      SELECT jsonb_agg(a.attname ORDER BY x.ord)
      FROM unnest(con.conkey) WITH ORDINALITY AS x(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = x.attnum
    ),
    'referencia_tabela', cl.relname,
    'referencia_schema', ns.nspname,
    'referencia_colunas', (
      SELECT jsonb_agg(a.attname ORDER BY x.ord)
      FROM unnest(con.confkey) WITH ORDINALITY AS x(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = x.attnum
    )
  ))
  INTO v_fks
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.confrelid
  JOIN pg_namespace ns ON ns.oid = cl.relnamespace
  WHERE con.conrelid = v_oid AND con.contype = 'f';

  RETURN jsonb_build_object(
    'tabela', p_tabela,
    'tipo', CASE v_kind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview' WHEN 'p' THEN 'partitioned' END,
    'rls_habilitado', v_rls,
    'colunas', COALESCE(v_colunas, '[]'::jsonb),
    'chave_primaria', COALESCE(v_pk, '[]'::jsonb),
    'chaves_estrangeiras', COALESCE(v_fks, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_list_public_tables() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_describe_table(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_list_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_describe_table(text) TO authenticated;
