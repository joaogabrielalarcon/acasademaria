
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.fornecedores_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id uuid NOT NULL,
  duplicado_id uuid NOT NULL,
  duplicado_nome text NOT NULL,
  dados_anteriores jsonb NOT NULL,
  contadores jsonb NOT NULL DEFAULT '{}'::jsonb,
  executado_por uuid,
  executado_por_nome text,
  executado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Administrativo podem ver merge log"
ON public.fornecedores_merge_log FOR SELECT
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_trgm
  ON public.fornecedores USING gin (lower(nome) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.normalize_fornecedor_nome(_nome text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(coalesce(_nome, '')), '[^a-z0-9]+', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.normalize_cnpj(_cnpj text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(coalesce(_cnpj, ''), '[^0-9]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.detectar_fornecedores_duplicados()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_groups jsonb;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  WITH base AS (
    SELECT
      f.id, f.nome, f.nome_alternativo, f.cnpj, f.telefone, f.email, f.cidade, f.mercado,
      public.normalize_fornecedor_nome(f.nome) AS nome_norm,
      public.normalize_cnpj(f.cnpj) AS cnpj_norm,
      (SELECT count(*) FROM plantas WHERE fornecedor_id = f.id) AS qtd_plantas,
      (SELECT count(*) FROM insumos WHERE fornecedor_id = f.id) AS qtd_insumos,
      (SELECT count(*) FROM historico_precos WHERE fornecedor_id = f.id) AS qtd_historico,
      (SELECT count(*) FROM estoque_movimentacoes WHERE fornecedor_id = f.id) AS qtd_estoque,
      (SELECT count(*) FROM financeiro_movimentacoes WHERE fornecedor_id = f.id) AS qtd_fin,
      (SELECT count(*) FROM orcamento_cotacoes WHERE fornecedor_id = f.id) AS qtd_cotacoes
    FROM fornecedores f
  ),
  por_cnpj AS (
    SELECT 'cnpj:' || cnpj_norm AS grupo_key, 'alta' AS confianca, id
    FROM base WHERE cnpj_norm IS NOT NULL
  ),
  por_nome AS (
    SELECT 'nome:' || nome_norm AS grupo_key, 'alta' AS confianca, id
    FROM base WHERE nome_norm <> ''
  ),
  pares_sim AS (
    SELECT a.id AS id_a, b.id AS id_b
    FROM base a JOIN base b ON a.id < b.id
      AND a.nome_norm <> '' AND b.nome_norm <> ''
      AND a.nome_norm <> b.nome_norm
      AND (a.cnpj_norm IS NULL OR b.cnpj_norm IS NULL OR a.cnpj_norm <> b.cnpj_norm)
      AND similarity(lower(a.nome), lower(b.nome)) >= 0.85
  ),
  por_sim AS (
    SELECT 'sim:' || least(id_a::text, id_b::text) || ':' || greatest(id_a::text, id_b::text) AS grupo_key,
           'media' AS confianca, id_a AS id FROM pares_sim
    UNION ALL
    SELECT 'sim:' || least(id_a::text, id_b::text) || ':' || greatest(id_a::text, id_b::text),
           'media', id_b FROM pares_sim
  ),
  todos AS (
    SELECT * FROM por_cnpj UNION SELECT * FROM por_nome UNION SELECT * FROM por_sim
  ),
  grupos AS (
    SELECT grupo_key, confianca, array_agg(DISTINCT id) AS ids
    FROM todos GROUP BY grupo_key, confianca
    HAVING count(DISTINCT id) > 1
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'grupo_key', g.grupo_key,
      'confianca', g.confianca,
      'fornecedores', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', b.id, 'nome', b.nome, 'nome_alternativo', b.nome_alternativo,
          'cnpj', b.cnpj, 'telefone', b.telefone, 'email', b.email,
          'cidade', b.cidade, 'mercado', b.mercado,
          'qtd_plantas', b.qtd_plantas, 'qtd_insumos', b.qtd_insumos,
          'qtd_historico', b.qtd_historico, 'qtd_estoque', b.qtd_estoque,
          'qtd_fin', b.qtd_fin, 'qtd_cotacoes', b.qtd_cotacoes,
          'total_uso', b.qtd_plantas + b.qtd_insumos + b.qtd_historico + b.qtd_estoque + b.qtd_fin + b.qtd_cotacoes
        ) ORDER BY b.nome)
        FROM base b WHERE b.id = ANY(g.ids)
      )
    )
    ORDER BY (g.confianca = 'alta') DESC, g.grupo_key
  ), '[]'::jsonb) INTO v_groups
  FROM grupos g;

  RETURN v_groups;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_fornecedores(
  p_principal_id uuid,
  p_duplicado_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_nome text;
  v_dup_id uuid;
  v_dup record;
  v_contadores jsonb;
  v_total integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_any_role(v_user_id, ARRAY['admin'::user_role, 'administrativo'::user_role]) THEN
    RAISE EXCEPTION 'Sem permissão para mesclar fornecedores';
  END IF;
  IF p_principal_id IS NULL OR p_duplicado_ids IS NULL OR array_length(p_duplicado_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Parâmetros inválidos';
  END IF;
  IF p_principal_id = ANY(p_duplicado_ids) THEN
    RAISE EXCEPTION 'O principal não pode estar nos duplicados';
  END IF;

  SELECT nome INTO v_user_nome FROM public.profiles WHERE id = v_user_id;

  PERFORM 1 FROM public.fornecedores WHERE id = p_principal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fornecedor principal não encontrado'; END IF;

  FOREACH v_dup_id IN ARRAY p_duplicado_ids LOOP
    SELECT * INTO v_dup FROM public.fornecedores WHERE id = v_dup_id FOR UPDATE;
    CONTINUE WHEN NOT FOUND;

    v_contadores := jsonb_build_object(
      'plantas', (SELECT count(*) FROM plantas WHERE fornecedor_id = v_dup_id),
      'insumos', (SELECT count(*) FROM insumos WHERE fornecedor_id = v_dup_id),
      'historico_precos', (SELECT count(*) FROM historico_precos WHERE fornecedor_id = v_dup_id),
      'estoque_movimentacoes', (SELECT count(*) FROM estoque_movimentacoes WHERE fornecedor_id = v_dup_id),
      'financeiro_movimentacoes', (SELECT count(*) FROM financeiro_movimentacoes WHERE fornecedor_id = v_dup_id),
      'orcamento_cotacoes', (SELECT count(*) FROM orcamento_cotacoes WHERE fornecedor_id = v_dup_id)
    );

    UPDATE plantas SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE insumos SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE historico_precos SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE estoque_movimentacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE financeiro_movimentacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE orcamento_cotacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;

    UPDATE public.fornecedores SET
      cnpj = COALESCE(NULLIF(cnpj, ''), v_dup.cnpj),
      telefone = COALESCE(NULLIF(telefone, ''), v_dup.telefone),
      whatsapp = COALESCE(NULLIF(whatsapp, ''), v_dup.whatsapp),
      email = COALESCE(NULLIF(email, ''), v_dup.email),
      endereco = COALESCE(NULLIF(endereco, ''), v_dup.endereco),
      cidade = COALESCE(NULLIF(cidade, ''), v_dup.cidade),
      estado = COALESCE(NULLIF(estado, ''), v_dup.estado),
      categoria_fornecedor = COALESCE(NULLIF(categoria_fornecedor, ''), v_dup.categoria_fornecedor),
      mercado = COALESCE(NULLIF(mercado, ''), v_dup.mercado),
      nome_alternativo = COALESCE(NULLIF(nome_alternativo, ''), v_dup.nome_alternativo),
      observacoes = CASE
        WHEN observacoes IS NULL OR observacoes = '' THEN v_dup.observacoes
        WHEN v_dup.observacoes IS NULL OR v_dup.observacoes = '' THEN observacoes
        ELSE observacoes || E'\n— Mesclado de "' || v_dup.nome || '": ' || v_dup.observacoes
      END,
      updated_at = now(),
      updated_by = v_user_id
    WHERE id = p_principal_id;

    INSERT INTO public.fornecedores_merge_log (
      principal_id, duplicado_id, duplicado_nome, dados_anteriores, contadores,
      executado_por, executado_por_nome
    ) VALUES (
      p_principal_id, v_dup_id, v_dup.nome, to_jsonb(v_dup), v_contadores,
      v_user_id, COALESCE(v_user_nome, 'Equipe MFM')
    );

    DELETE FROM public.fornecedores WHERE id = v_dup_id;
    v_total := v_total + 1;
  END LOOP;

  RETURN jsonb_build_object('principal_id', p_principal_id, 'mesclados', v_total);
END;
$$;
