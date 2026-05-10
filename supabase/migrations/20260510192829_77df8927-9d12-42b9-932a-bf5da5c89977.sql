DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fornecedores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fornecedores;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'plantas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.plantas;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'insumos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insumos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'historico_precos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_precos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orcamento_itens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orcamento_itens;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orcamento_cotacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orcamento_cotacoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orcamento_insumos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orcamento_insumos;
  END IF;
END $$;

ALTER TABLE public.fornecedores REPLICA IDENTITY FULL;
ALTER TABLE public.plantas REPLICA IDENTITY FULL;
ALTER TABLE public.insumos REPLICA IDENTITY FULL;
ALTER TABLE public.historico_precos REPLICA IDENTITY FULL;
ALTER TABLE public.orcamento_itens REPLICA IDENTITY FULL;
ALTER TABLE public.orcamento_cotacoes REPLICA IDENTITY FULL;
ALTER TABLE public.orcamento_insumos REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.merge_fornecedores(p_principal_id uuid, p_duplicado_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'orcamento_cotacoes', (SELECT count(*) FROM orcamento_cotacoes WHERE fornecedor_id = v_dup_id),
      'orcamento_itens', (SELECT count(*) FROM orcamento_itens WHERE fornecedor_escolhido_id = v_dup_id),
      'orcamento_insumos', (SELECT count(*) FROM orcamento_insumos WHERE fornecedor_id = v_dup_id),
      'fornecedor_avaliacoes', (SELECT count(*) FROM fornecedor_avaliacoes WHERE fornecedor_id = v_dup_id)
    );

    UPDATE plantas SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE insumos SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE historico_precos SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE estoque_movimentacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE financeiro_movimentacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE orcamento_cotacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE orcamento_itens SET fornecedor_escolhido_id = p_principal_id WHERE fornecedor_escolhido_id = v_dup_id;
    UPDATE orcamento_insumos SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;
    UPDATE fornecedor_avaliacoes SET fornecedor_id = p_principal_id WHERE fornecedor_id = v_dup_id;

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
$function$;