
-- ============== POLICIES: PIPELINES ==============
DROP POLICY IF EXISTS "pipelines_all" ON public.pipelines;
DROP POLICY IF EXISTS "pipelines_select" ON public.pipelines;
DROP POLICY IF EXISTS "pipelines_write" ON public.pipelines;

CREATE POLICY "pipelines_select" ON public.pipelines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pipelines_write" ON public.pipelines
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- ============== POLICIES: PIPELINES_ETAPAS ==============
DROP POLICY IF EXISTS "pipelines_etapas_all" ON public.pipelines_etapas;
DROP POLICY IF EXISTS "pipelines_etapas_select" ON public.pipelines_etapas;
DROP POLICY IF EXISTS "pipelines_etapas_write" ON public.pipelines_etapas;

CREATE POLICY "pipelines_etapas_select" ON public.pipelines_etapas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pipelines_etapas_write" ON public.pipelines_etapas
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- ============== HELPER: pode ver demanda ==============
CREATE OR REPLACE FUNCTION public.can_view_demanda(_user_id uuid, _demanda_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_any_role(_user_id, ARRAY[
      'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
      'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
    ])
    OR EXISTS (
      SELECT 1 FROM public.demandas d
      JOIN public.colaboradores c ON c.user_id = _user_id AND c.ativo = true
      WHERE d.id = _demanda_id
        AND (
          d.responsavel_atual_id = c.id
          OR EXISTS (
            SELECT 1 FROM public.demanda_responsaveis dr
            WHERE dr.demanda_id = d.id AND dr.colaborador_id = c.id
          )
        )
    )
$$;

-- ============== POLICIES: DEMANDAS ==============
DROP POLICY IF EXISTS "demandas_all" ON public.demandas;
DROP POLICY IF EXISTS "demandas_select" ON public.demandas;
DROP POLICY IF EXISTS "demandas_insert" ON public.demandas;
DROP POLICY IF EXISTS "demandas_update" ON public.demandas;
DROP POLICY IF EXISTS "demandas_delete" ON public.demandas;

CREATE POLICY "demandas_select" ON public.demandas
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
      'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
    ])
    OR responsavel_atual_id = public.get_colaborador_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.demanda_responsaveis dr
      WHERE dr.demanda_id = demandas.id
        AND dr.colaborador_id = public.get_colaborador_id(auth.uid())
    )
  );

CREATE POLICY "demandas_insert" ON public.demandas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
    'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
  ]));

CREATE POLICY "demandas_update" ON public.demandas
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
      'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
    ])
    OR responsavel_atual_id = public.get_colaborador_id(auth.uid())
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
      'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
    ])
    OR responsavel_atual_id = public.get_colaborador_id(auth.uid())
  );

CREATE POLICY "demandas_delete" ON public.demandas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- ============== POLICIES: DEMANDA_RESPONSAVEIS ==============
DROP POLICY IF EXISTS "demanda_responsaveis_all" ON public.demanda_responsaveis;
DROP POLICY IF EXISTS "demanda_responsaveis_select" ON public.demanda_responsaveis;
DROP POLICY IF EXISTS "demanda_responsaveis_write" ON public.demanda_responsaveis;

CREATE POLICY "demanda_responsaveis_select" ON public.demanda_responsaveis
  FOR SELECT TO authenticated
  USING (public.can_view_demanda(auth.uid(), demanda_id));

CREATE POLICY "demanda_responsaveis_write" ON public.demanda_responsaveis
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY[
    'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
    'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
  ]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
    'admin'::user_role,'administrativo'::user_role,'gestor'::user_role,
    'diretor'::user_role,'gestao_campo'::user_role,'arquitetura'::user_role
  ]));

-- ============== POLICIES: DEMANDA_ETAPAS_HISTORICO (imutável) ==============
DROP POLICY IF EXISTS "demanda_etapas_historico_all" ON public.demanda_etapas_historico;
DROP POLICY IF EXISTS "demanda_etapas_historico_select" ON public.demanda_etapas_historico;

CREATE POLICY "demanda_etapas_historico_select" ON public.demanda_etapas_historico
  FOR SELECT TO authenticated
  USING (public.can_view_demanda(auth.uid(), demanda_id));
-- Sem policies de INSERT/UPDATE/DELETE: gravação só via trigger SECURITY DEFINER.

-- ============== TRIGGER: histórico automático de etapa ==============
CREATE OR REPLACE FUNCTION public.log_demanda_etapa_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_last_at timestamptz;
  v_dias numeric(8,2);
BEGIN
  IF NEW.etapa_atual_id IS DISTINCT FROM OLD.etapa_atual_id THEN
    SELECT created_at INTO v_last_at
    FROM public.demanda_etapas_historico
    WHERE demanda_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    v_dias := EXTRACT(EPOCH FROM (now() - COALESCE(v_last_at, NEW.created_at))) / 86400.0;

    INSERT INTO public.demanda_etapas_historico
      (demanda_id, etapa_de_id, etapa_para_id, movido_por, tempo_na_etapa_dias)
    VALUES
      (NEW.id, OLD.etapa_atual_id, NEW.etapa_atual_id,
       public.get_colaborador_id(auth.uid()), v_dias);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demandas_log_etapa ON public.demandas;
CREATE TRIGGER demandas_log_etapa
  AFTER UPDATE OF etapa_atual_id ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.log_demanda_etapa_change();

-- ============== GRANTS (idempotente) ==============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines_etapas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demanda_responsaveis TO authenticated;
GRANT SELECT ON public.demanda_etapas_historico TO authenticated;
GRANT ALL ON public.pipelines, public.pipelines_etapas, public.demandas,
             public.demanda_responsaveis, public.demanda_etapas_historico TO service_role;
