
-- ============================================================
-- PR 2: Atendentes, atendente padrão por operador,
-- fusão de fornecedores (status fundido) e fusão de plantas/insumos
-- ============================================================

-- ---------- 1. fornecedor_atendentes ----------
CREATE TABLE IF NOT EXISTS public.fornecedor_atendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  funcao text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_atendentes_fornecedor ON public.fornecedor_atendentes(fornecedor_id);

ALTER TABLE public.fornecedor_atendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read atendentes"
  ON public.fornecedor_atendentes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin/admin pode inserir atendentes"
  ON public.fornecedor_atendentes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

CREATE POLICY "Admin/admin pode atualizar atendentes"
  ON public.fornecedor_atendentes FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

CREATE POLICY "Admin pode deletar atendentes"
  ON public.fornecedor_atendentes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER set_atendentes_audit
  BEFORE INSERT OR UPDATE ON public.fornecedor_atendentes
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- ---------- 2. operador_atendente_padrao ----------
CREATE TABLE IF NOT EXISTS public.operador_atendente_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  atendente_id uuid NOT NULL REFERENCES public.fornecedor_atendentes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operador_id, fornecedor_id)
);

CREATE INDEX IF NOT EXISTS idx_oap_operador ON public.operador_atendente_padrao(operador_id);
CREATE INDEX IF NOT EXISTS idx_oap_fornecedor ON public.operador_atendente_padrao(fornecedor_id);

ALTER TABLE public.operador_atendente_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operador vê seu próprio padrão"
  ON public.operador_atendente_padrao FOR SELECT
  TO authenticated USING (auth.uid() = operador_id);

CREATE POLICY "Operador define seu próprio padrão"
  ON public.operador_atendente_padrao FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = operador_id);

CREATE POLICY "Operador atualiza seu próprio padrão"
  ON public.operador_atendente_padrao FOR UPDATE
  TO authenticated USING (auth.uid() = operador_id);

CREATE POLICY "Operador remove seu próprio padrão"
  ON public.operador_atendente_padrao FOR DELETE
  TO authenticated USING (auth.uid() = operador_id);

-- ---------- 3. fundido_em em plantas/insumos ----------
ALTER TABLE public.plantas      ADD COLUMN IF NOT EXISTS fundido_em uuid REFERENCES public.plantas(id) ON DELETE SET NULL;
ALTER TABLE public.insumos      ADD COLUMN IF NOT EXISTS fundido_em uuid REFERENCES public.insumos(id) ON DELETE SET NULL;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS fundido_em uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- ---------- 4. Tabela de log de fusão para plantas/insumos ----------
CREATE TABLE IF NOT EXISTS public.itens_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('planta','insumo')),
  principal_id uuid NOT NULL,
  duplicado_id uuid NOT NULL,
  duplicado_nome text,
  dados_anteriores jsonb,
  contadores jsonb,
  executado_por uuid,
  executado_por_nome text,
  executado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.itens_merge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lê log fusão itens"
  ON public.itens_merge_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- ---------- 5. Atualizar merge_fornecedores: status='fundido' + atendentes ----------
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
      'fornecedor_avaliacoes', (SELECT count(*) FROM fornecedor_avaliacoes WHERE fornecedor_id = v_dup_id),
      'atendentes', (SELECT count(*) FROM fornecedor_atendentes WHERE fornecedor_id = v_dup_id)
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

    -- Atendentes: migrar com deduplicação por (nome, telefone)
    INSERT INTO public.fornecedor_atendentes (fornecedor_id, nome, telefone, funcao, email, ativo, observacoes)
    SELECT p_principal_id, a.nome, a.telefone, a.funcao, a.email, a.ativo, a.observacoes
    FROM public.fornecedor_atendentes a
    WHERE a.fornecedor_id = v_dup_id
      AND NOT EXISTS (
        SELECT 1 FROM public.fornecedor_atendentes p
        WHERE p.fornecedor_id = p_principal_id
          AND lower(coalesce(p.nome,'')) = lower(coalesce(a.nome,''))
          AND coalesce(regexp_replace(p.telefone,'[^0-9]','','g'),'') = coalesce(regexp_replace(a.telefone,'[^0-9]','','g'),'')
      );
    DELETE FROM public.fornecedor_atendentes WHERE fornecedor_id = v_dup_id;

    -- Concatenar nome_alternativo com ';'
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
      nome_alternativo = trim(both '; ' from
        COALESCE(NULLIF(nome_alternativo,''),'')
        || CASE WHEN NULLIF(nome_alternativo,'') IS NOT NULL THEN '; ' ELSE '' END
        || v_dup.nome
        || CASE WHEN NULLIF(v_dup.nome_alternativo,'') IS NOT NULL THEN '; ' || v_dup.nome_alternativo ELSE '' END
      ),
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

    -- NÃO deleta: marca como fundido
    UPDATE public.fornecedores
    SET status = 'fundido', fundido_em = p_principal_id,
        updated_at = now(), updated_by = v_user_id
    WHERE id = v_dup_id;

    v_total := v_total + 1;
  END LOOP;

  RETURN jsonb_build_object('principal_id', p_principal_id, 'mesclados', v_total);
END;
$function$;

-- ---------- 6. merge_plantas ----------
CREATE OR REPLACE FUNCTION public.merge_plantas(p_principal_id uuid, p_duplicado_ids uuid[])
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
  v_max_data date;
  v_max_preco numeric;
  v_max_fornecedor uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_any_role(v_user_id, ARRAY['admin'::user_role, 'administrativo'::user_role]) THEN
    RAISE EXCEPTION 'Sem permissão para mesclar plantas';
  END IF;
  IF p_principal_id IS NULL OR p_duplicado_ids IS NULL OR array_length(p_duplicado_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Parâmetros inválidos';
  END IF;
  IF p_principal_id = ANY(p_duplicado_ids) THEN
    RAISE EXCEPTION 'A planta principal não pode estar nos duplicados';
  END IF;

  SELECT nome INTO v_user_nome FROM public.profiles WHERE id = v_user_id;

  PERFORM 1 FROM public.plantas WHERE id = p_principal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Planta principal não encontrada'; END IF;

  FOREACH v_dup_id IN ARRAY p_duplicado_ids LOOP
    SELECT * INTO v_dup FROM public.plantas WHERE id = v_dup_id FOR UPDATE;
    CONTINUE WHEN NOT FOUND;

    v_contadores := jsonb_build_object(
      'historico_precos', (SELECT count(*) FROM historico_precos WHERE item_tipo='planta' AND item_id = v_dup_id),
      'orcamento_itens', (SELECT count(*) FROM orcamento_itens WHERE planta_id = v_dup_id),
      'memorial_descritivo', (SELECT count(*) FROM memorial_descritivo WHERE planta_id = v_dup_id),
      'estoque_movimentacoes', (SELECT count(*) FROM estoque_movimentacoes WHERE item_tipo='planta' AND item_id = v_dup_id),
      'estoque_saldo', (SELECT count(*) FROM estoque_saldo WHERE item_tipo='planta' AND item_id = v_dup_id),
      'orcamento_cotacoes', (SELECT count(*) FROM orcamento_cotacoes WHERE item_id = v_dup_id),
      'orcamento_checklist', (SELECT count(*) FROM orcamento_checklist WHERE item_id = v_dup_id),
      'recebimento_itens', (SELECT count(*) FROM recebimento_itens WHERE planta_id = v_dup_id),
      'fornecedor_avaliacoes', (SELECT count(*) FROM fornecedor_avaliacoes WHERE item_id = v_dup_id),
      'historico_precos_fornecedor', (SELECT count(*) FROM historico_precos_fornecedor WHERE planta_id = v_dup_id)
    );

    -- Garantir que o preço atual do duplicado vire histórico (se ainda não existir entrada igual)
    IF v_dup.preco_unitario IS NOT NULL THEN
      INSERT INTO public.historico_precos (item_id, item_tipo, fornecedor_id, preco, data_orcamento, observacoes, registrado_por)
      SELECT p_principal_id, 'planta', v_dup.fornecedor_id, v_dup.preco_unitario,
             COALESCE(v_dup.ultima_compra, CURRENT_DATE),
             'Importado da fusão de "' || v_dup.nome_popular || '"',
             (SELECT id FROM colaboradores WHERE user_id = v_user_id AND ativo = true LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM historico_precos h
        WHERE h.item_id = p_principal_id AND h.item_tipo = 'planta'
          AND h.preco = v_dup.preco_unitario
          AND COALESCE(h.fornecedor_id::text,'') = COALESCE(v_dup.fornecedor_id::text,'')
          AND h.data_orcamento = COALESCE(v_dup.ultima_compra, CURRENT_DATE)
      );
    END IF;

    -- Migrar referências
    UPDATE historico_precos SET item_id = p_principal_id WHERE item_tipo='planta' AND item_id = v_dup_id;
    UPDATE orcamento_itens SET planta_id = p_principal_id WHERE planta_id = v_dup_id;
    UPDATE memorial_descritivo SET planta_id = p_principal_id WHERE planta_id = v_dup_id;
    UPDATE estoque_movimentacoes SET item_id = p_principal_id WHERE item_tipo='planta' AND item_id = v_dup_id;
    UPDATE estoque_saldo SET item_id = p_principal_id WHERE item_tipo='planta' AND item_id = v_dup_id;
    UPDATE orcamento_cotacoes SET item_id = p_principal_id WHERE item_id = v_dup_id;
    UPDATE orcamento_checklist SET item_id = p_principal_id WHERE item_id = v_dup_id;
    UPDATE recebimento_itens SET planta_id = p_principal_id WHERE planta_id = v_dup_id;
    UPDATE fornecedor_avaliacoes SET item_id = p_principal_id WHERE item_id = v_dup_id;
    UPDATE historico_precos_fornecedor SET planta_id = p_principal_id WHERE planta_id = v_dup_id;

    -- Preencher campos vazios do principal
    UPDATE public.plantas SET
      nome_cientifico = COALESCE(NULLIF(nome_cientifico,''), v_dup.nome_cientifico),
      categoria_id = COALESCE(categoria_id, v_dup.categoria_id),
      fornecedor_id = COALESCE(fornecedor_id, v_dup.fornecedor_id),
      altura_m = COALESCE(altura_m, v_dup.altura_m),
      altura_min_m = COALESCE(altura_min_m, v_dup.altura_min_m),
      altura_max_m = COALESCE(altura_max_m, v_dup.altura_max_m),
      dap_cm = COALESCE(dap_cm, v_dup.dap_cm),
      unidade = COALESCE(NULLIF(unidade,''), v_dup.unidade),
      embalagem = COALESCE(NULLIF(embalagem,''), v_dup.embalagem),
      nota_qualidade = COALESCE(nota_qualidade, v_dup.nota_qualidade),
      midia = CASE
        WHEN coalesce(jsonb_array_length(midia),0) = 0 THEN COALESCE(v_dup.midia, midia)
        ELSE midia || COALESCE(v_dup.midia, '[]'::jsonb)
      END,
      observacoes = CASE
        WHEN observacoes IS NULL OR observacoes = '' THEN v_dup.observacoes
        WHEN v_dup.observacoes IS NULL OR v_dup.observacoes = '' THEN observacoes
        ELSE observacoes || E'\n— Mesclado de "' || v_dup.nome_popular || '": ' || v_dup.observacoes
      END,
      updated_at = now(),
      updated_by = v_user_id
    WHERE id = p_principal_id;

    INSERT INTO public.itens_merge_log (
      tipo, principal_id, duplicado_id, duplicado_nome, dados_anteriores, contadores,
      executado_por, executado_por_nome
    ) VALUES (
      'planta', p_principal_id, v_dup_id, v_dup.nome_popular, to_jsonb(v_dup), v_contadores,
      v_user_id, COALESCE(v_user_nome, 'Equipe MFM')
    );

    -- Marca como inativo + fundido_em (não deleta)
    UPDATE public.plantas
    SET ativo = false, fundido_em = p_principal_id,
        updated_at = now(), updated_by = v_user_id
    WHERE id = v_dup_id;

    v_total := v_total + 1;
  END LOOP;

  -- Após mesclar tudo, define preço atual do canônico = preço mais recente do histórico
  SELECT preco, fornecedor_id, data_orcamento INTO v_max_preco, v_max_fornecedor, v_max_data
  FROM public.historico_precos
  WHERE item_id = p_principal_id AND item_tipo = 'planta'
  ORDER BY data_orcamento DESC NULLS LAST, criado_em DESC NULLS LAST
  LIMIT 1;

  IF v_max_preco IS NOT NULL THEN
    UPDATE public.plantas
    SET preco_unitario = v_max_preco,
        ultima_compra = COALESCE(v_max_data, ultima_compra),
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = p_principal_id;
  END IF;

  RETURN jsonb_build_object('principal_id', p_principal_id, 'mesclados', v_total);
END;
$function$;

-- ---------- 7. merge_insumos (cobre insumos e condicionadores de solo) ----------
CREATE OR REPLACE FUNCTION public.merge_insumos(p_principal_id uuid, p_duplicado_ids uuid[])
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
  v_max_data date;
  v_max_preco numeric;
  v_max_fornecedor uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_any_role(v_user_id, ARRAY['admin'::user_role, 'administrativo'::user_role]) THEN
    RAISE EXCEPTION 'Sem permissão para mesclar insumos';
  END IF;
  IF p_principal_id IS NULL OR p_duplicado_ids IS NULL OR array_length(p_duplicado_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Parâmetros inválidos';
  END IF;
  IF p_principal_id = ANY(p_duplicado_ids) THEN
    RAISE EXCEPTION 'O insumo principal não pode estar nos duplicados';
  END IF;

  SELECT nome INTO v_user_nome FROM public.profiles WHERE id = v_user_id;

  PERFORM 1 FROM public.insumos WHERE id = p_principal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo principal não encontrado'; END IF;

  FOREACH v_dup_id IN ARRAY p_duplicado_ids LOOP
    SELECT * INTO v_dup FROM public.insumos WHERE id = v_dup_id FOR UPDATE;
    CONTINUE WHEN NOT FOUND;

    v_contadores := jsonb_build_object(
      'historico_precos', (SELECT count(*) FROM historico_precos WHERE item_tipo='insumo' AND item_id = v_dup_id),
      'orcamento_itens', (SELECT count(*) FROM orcamento_itens WHERE insumo_id = v_dup_id),
      'orcamento_insumos', (SELECT count(*) FROM orcamento_insumos WHERE insumo_id = v_dup_id),
      'memorial_descritivo', (SELECT count(*) FROM memorial_descritivo WHERE insumo_id = v_dup_id),
      'estoque_movimentacoes', (SELECT count(*) FROM estoque_movimentacoes WHERE item_tipo='insumo' AND item_id = v_dup_id),
      'estoque_saldo', (SELECT count(*) FROM estoque_saldo WHERE item_tipo='insumo' AND item_id = v_dup_id),
      'diario_insumos_area', (SELECT count(*) FROM diario_insumos_area WHERE insumo_id = v_dup_id),
      'entregas_colaborador', (SELECT count(*) FROM entregas_colaborador WHERE insumo_id = v_dup_id),
      'manutencao_recursos', (SELECT count(*) FROM manutencao_recursos WHERE insumo_id = v_dup_id),
      'recebimento_itens', (SELECT count(*) FROM recebimento_itens WHERE insumo_id = v_dup_id),
      'registro_insumos', (SELECT count(*) FROM registro_insumos WHERE insumo_id = v_dup_id),
      'orcamento_cotacoes', (SELECT count(*) FROM orcamento_cotacoes WHERE item_id = v_dup_id),
      'orcamento_checklist', (SELECT count(*) FROM orcamento_checklist WHERE item_id = v_dup_id),
      'fornecedor_avaliacoes', (SELECT count(*) FROM fornecedor_avaliacoes WHERE item_id = v_dup_id)
    );

    IF v_dup.preco_unitario IS NOT NULL THEN
      INSERT INTO public.historico_precos (item_id, item_tipo, fornecedor_id, preco, data_orcamento, observacoes, registrado_por)
      SELECT p_principal_id, 'insumo', v_dup.fornecedor_id, v_dup.preco_unitario,
             COALESCE(v_dup.ultima_compra, CURRENT_DATE),
             'Importado da fusão de "' || v_dup.nome || '"',
             (SELECT id FROM colaboradores WHERE user_id = v_user_id AND ativo = true LIMIT 1)
      WHERE NOT EXISTS (
        SELECT 1 FROM historico_precos h
        WHERE h.item_id = p_principal_id AND h.item_tipo = 'insumo'
          AND h.preco = v_dup.preco_unitario
          AND COALESCE(h.fornecedor_id::text,'') = COALESCE(v_dup.fornecedor_id::text,'')
          AND h.data_orcamento = COALESCE(v_dup.ultima_compra, CURRENT_DATE)
      );
    END IF;

    UPDATE historico_precos SET item_id = p_principal_id WHERE item_tipo='insumo' AND item_id = v_dup_id;
    UPDATE orcamento_itens SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE orcamento_insumos SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE memorial_descritivo SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE estoque_movimentacoes SET item_id = p_principal_id WHERE item_tipo='insumo' AND item_id = v_dup_id;
    UPDATE estoque_saldo SET item_id = p_principal_id WHERE item_tipo='insumo' AND item_id = v_dup_id;
    UPDATE diario_insumos_area SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE entregas_colaborador SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE manutencao_recursos SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE recebimento_itens SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE registro_insumos SET insumo_id = p_principal_id WHERE insumo_id = v_dup_id;
    UPDATE orcamento_cotacoes SET item_id = p_principal_id WHERE item_id = v_dup_id;
    UPDATE orcamento_checklist SET item_id = p_principal_id WHERE item_id = v_dup_id;
    UPDATE fornecedor_avaliacoes SET item_id = p_principal_id WHERE item_id = v_dup_id;

    UPDATE public.insumos SET
      categoria = COALESCE(NULLIF(categoria,''), v_dup.categoria),
      unidade = COALESCE(NULLIF(unidade,''), v_dup.unidade),
      fornecedor_id = COALESCE(fornecedor_id, v_dup.fornecedor_id),
      descricao_produto = COALESCE(NULLIF(descricao_produto,''), v_dup.descricao_produto),
      volume_apresentacao = COALESCE(NULLIF(volume_apresentacao,''), v_dup.volume_apresentacao),
      observacoes = CASE
        WHEN observacoes IS NULL OR observacoes = '' THEN v_dup.observacoes
        WHEN v_dup.observacoes IS NULL OR v_dup.observacoes = '' THEN observacoes
        ELSE observacoes || E'\n— Mesclado de "' || v_dup.nome || '": ' || v_dup.observacoes
      END,
      updated_at = now(),
      updated_by = v_user_id
    WHERE id = p_principal_id;

    INSERT INTO public.itens_merge_log (
      tipo, principal_id, duplicado_id, duplicado_nome, dados_anteriores, contadores,
      executado_por, executado_por_nome
    ) VALUES (
      'insumo', p_principal_id, v_dup_id, v_dup.nome, to_jsonb(v_dup), v_contadores,
      v_user_id, COALESCE(v_user_nome, 'Equipe MFM')
    );

    UPDATE public.insumos
    SET ativo = false, fundido_em = p_principal_id,
        updated_at = now(), updated_by = v_user_id
    WHERE id = v_dup_id;

    v_total := v_total + 1;
  END LOOP;

  SELECT preco, fornecedor_id, data_orcamento INTO v_max_preco, v_max_fornecedor, v_max_data
  FROM public.historico_precos
  WHERE item_id = p_principal_id AND item_tipo = 'insumo'
  ORDER BY data_orcamento DESC NULLS LAST, criado_em DESC NULLS LAST
  LIMIT 1;

  IF v_max_preco IS NOT NULL THEN
    UPDATE public.insumos
    SET preco_unitario = v_max_preco,
        ultima_compra = COALESCE(v_max_data, ultima_compra),
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = p_principal_id;
  END IF;

  RETURN jsonb_build_object('principal_id', p_principal_id, 'mesclados', v_total);
END;
$function$;
