-- Bucket privado para mídias do diário
insert into storage.buckets (id, name, public)
values ('diario-midias', 'diario-midias', false)
on conflict (id) do nothing;

-- Políticas de storage para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can view diario midias'
  ) THEN
    CREATE POLICY "Authenticated users can view diario midias"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'diario-midias');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload diario midias'
  ) THEN
    CREATE POLICY "Authenticated users can upload diario midias"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'diario-midias');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can update diario midias'
  ) THEN
    CREATE POLICY "Authenticated users can update diario midias"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'diario-midias')
    WITH CHECK (bucket_id = 'diario-midias');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete diario midias'
  ) THEN
    CREATE POLICY "Authenticated users can delete diario midias"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'diario-midias');
  END IF;
END $$;

-- Salva a visita completa em uma única transação
CREATE OR REPLACE FUNCTION public.create_diario_visita_with_details(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_visita_id uuid;
  v_area_id uuid;
  v_area jsonb;
  v_item jsonb;
  v_midia jsonb;
  v_projeto_id uuid;
  v_cliente_id uuid;
  v_registrado_por_nome text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  v_projeto_id := (payload->>'projeto_id')::uuid;
  v_cliente_id := (payload->>'cliente_id')::uuid;

  IF v_projeto_id IS NULL OR v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Projeto e cliente são obrigatórios';
  END IF;

  IF NOT public.can_access_diario_project(v_user_id, v_projeto_id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar visitas neste projeto';
  END IF;

  v_registrado_por_nome := COALESCE(
    NULLIF(payload->>'registrado_por_nome', ''),
    (SELECT nome FROM public.profiles WHERE id = v_user_id),
    'Equipe MFM'
  );

  INSERT INTO public.diario_visitas (
    projeto_id,
    cliente_id,
    data_visita,
    hora_inicio,
    hora_fim,
    periodo,
    observacoes_internas,
    registrado_por_nome,
    status_geral
  ) VALUES (
    v_projeto_id,
    v_cliente_id,
    COALESCE((payload->>'data_visita')::date, CURRENT_DATE),
    NULLIF(payload->>'hora_inicio', '')::time,
    NULLIF(payload->>'hora_fim', '')::time,
    NULLIF(payload->>'periodo', ''),
    NULLIF(payload->>'observacoes_internas', ''),
    v_registrado_por_nome,
    NULLIF(payload->>'status_geral', '')
  ) RETURNING id INTO v_visita_id;

  FOR v_area IN
    SELECT value FROM jsonb_array_elements(COALESCE(payload->'areas', '[]'::jsonb))
  LOOP
    INSERT INTO public.diario_areas (
      visita_id,
      projeto_id,
      nome_area,
      relato,
      servicos,
      status_area,
      status_anterior,
      houve_melhora
    ) VALUES (
      v_visita_id,
      v_projeto_id,
      COALESCE(NULLIF(v_area->>'nome_area', ''), 'Área não informada'),
      NULLIF(v_area->>'relato', ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_area->'servicos', '[]'::jsonb))), ARRAY[]::text[]),
      NULLIF(v_area->>'status_area', ''),
      NULLIF(v_area->>'status_anterior', ''),
      COALESCE((v_area->>'houve_melhora')::boolean, false)
    ) RETURNING id INTO v_area_id;

    FOR v_item IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_area->'equipe', '[]'::jsonb))
    LOOP
      INSERT INTO public.diario_equipe_area (
        area_id,
        visita_id,
        colaborador_id,
        colaborador_nome,
        funcao,
        descricao_atividade
      ) VALUES (
        v_area_id,
        v_visita_id,
        NULLIF(v_item->>'colaborador_id', '')::uuid,
        COALESCE(NULLIF(v_item->>'colaborador_nome', ''), 'Colaborador não informado'),
        NULLIF(v_item->>'funcao', ''),
        NULLIF(v_item->>'descricao_atividade', '')
      );
    END LOOP;

    FOR v_item IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_area->'insumos', '[]'::jsonb))
    LOOP
      INSERT INTO public.diario_insumos_area (
        area_id,
        visita_id,
        insumo_id,
        insumo_nome,
        quantidade,
        unidade
      ) VALUES (
        v_area_id,
        v_visita_id,
        NULLIF(v_item->>'insumo_id', '')::uuid,
        COALESCE(NULLIF(v_item->>'insumo_nome', ''), 'Insumo não informado'),
        NULLIF(v_item->>'quantidade', ''),
        NULLIF(v_item->>'unidade', '')
      );
    END LOOP;

    FOR v_item IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_area->'maquinas', '[]'::jsonb))
    LOOP
      INSERT INTO public.diario_maquinas_area (
        area_id,
        visita_id,
        maquina_id,
        maquina_nome
      ) VALUES (
        v_area_id,
        v_visita_id,
        NULLIF(v_item->>'maquina_id', '')::uuid,
        COALESCE(NULLIF(v_item->>'maquina_nome', ''), 'Máquina não informada')
      );
    END LOOP;

    FOR v_midia IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_area->'midias', '[]'::jsonb))
    LOOP
      INSERT INTO public.diario_midia (
        area_id,
        visita_id,
        tipo,
        url,
        thumbnail_url,
        descricao
      ) VALUES (
        v_area_id,
        v_visita_id,
        NULLIF(v_midia->>'tipo', ''),
        v_midia->>'url',
        NULLIF(v_midia->>'thumbnail_url', ''),
        NULLIF(v_midia->>'descricao', '')
      );
    END LOOP;
  END LOOP;

  FOR v_midia IN
    SELECT value FROM jsonb_array_elements(COALESCE(payload->'midias_gerais', '[]'::jsonb))
  LOOP
    INSERT INTO public.diario_midia (
      area_id,
      visita_id,
      tipo,
      url,
      thumbnail_url,
      descricao
    ) VALUES (
      NULL,
      v_visita_id,
      NULLIF(v_midia->>'tipo', ''),
      v_midia->>'url',
      NULLIF(v_midia->>'thumbnail_url', ''),
      NULLIF(v_midia->>'descricao', '')
    );
  END LOOP;

  IF COALESCE((payload->>'criar_alerta')::boolean, false)
     AND NULLIF(payload->>'observacoes_internas', '') IS NOT NULL THEN
    INSERT INTO public.diario_alertas (
      cliente_id,
      projeto_id,
      visita_id,
      descricao,
      resolvido,
      resolvido_em,
      resolvido_por_nome
    ) VALUES (
      v_cliente_id,
      v_projeto_id,
      v_visita_id,
      payload->>'observacoes_internas',
      false,
      NULL,
      NULL
    );
  END IF;

  INSERT INTO public.cliente_feed_eventos (
    cliente_id,
    tipo,
    titulo,
    usuario_nome,
    visivel_cliente,
    referencia_id,
    referencia_tipo,
    dados
  ) VALUES (
    v_cliente_id,
    'visita_diario',
    'Visita registrada no diário do projeto',
    v_registrado_por_nome,
    true,
    v_visita_id,
    'diario_visita',
    jsonb_build_object(
      'projeto_id', v_projeto_id,
      'data_visita', payload->>'data_visita',
      'status_geral', payload->>'status_geral'
    )
  );

  RETURN v_visita_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_diario_visita_with_details(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_diario_visita_with_details(jsonb) TO authenticated;