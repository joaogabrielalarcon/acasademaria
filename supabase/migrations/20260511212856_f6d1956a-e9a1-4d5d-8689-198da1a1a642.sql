
-- ============================================
-- AUDIT: STATUS CHANGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  status_anterior text,
  status_novo text,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_nome text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_status_entity ON public.audit_status_changes(entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_status_changed_at ON public.audit_status_changes(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_status_changed_by ON public.audit_status_changes(changed_by);

ALTER TABLE public.audit_status_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Adm leem logs de status"
ON public.audit_status_changes FOR SELECT
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

-- Sem políticas de INSERT/UPDATE/DELETE: apenas SECURITY DEFINER triggers gravam.

-- ============================================
-- AUDIT: PRICE CHANGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_price_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,             -- 'plantas' | 'insumos'
  entity_id uuid NOT NULL,
  fornecedor_id uuid,
  preco_anterior numeric,
  preco_novo numeric,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_nome text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_price_entity ON public.audit_price_changes(entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_price_changed_at ON public.audit_price_changes(changed_at DESC);

ALTER TABLE public.audit_price_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Adm leem logs de preço"
ON public.audit_price_changes FOR SELECT
USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_user_nome text;
  v_old text;
  v_new text;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  -- Tabelas com coluna status (text)
  IF TG_TABLE_NAME IN ('orcamentos','fornecedores','clientes','projetos') THEN
    v_old := (to_jsonb(OLD)->>'status');
    v_new := (to_jsonb(NEW)->>'status');
  ELSIF TG_TABLE_NAME IN ('plantas','insumos') THEN
    -- Mudança em "ativo" + flag de "fundido_em"
    v_old := CASE WHEN (to_jsonb(OLD)->>'ativo')::boolean THEN 'ativo' ELSE 'inativo' END;
    v_new := CASE WHEN (to_jsonb(NEW)->>'ativo')::boolean THEN 'ativo' ELSE 'inativo' END;
    IF (to_jsonb(NEW)->>'fundido_em') IS NOT NULL
       AND (to_jsonb(OLD)->>'fundido_em') IS DISTINCT FROM (to_jsonb(NEW)->>'fundido_em') THEN
      v_new := 'fundido';
      v_meta := jsonb_build_object('fundido_em', to_jsonb(NEW)->>'fundido_em');
    END IF;
  END IF;

  IF v_old IS NOT DISTINCT FROM v_new THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_user_nome FROM public.profiles WHERE id = v_user;

  INSERT INTO public.audit_status_changes (
    entity_table, entity_id, status_anterior, status_novo,
    changed_by, changed_by_nome, metadata
  ) VALUES (
    TG_TABLE_NAME, NEW.id, v_old, v_new, v_user,
    COALESCE(v_user_nome, 'Sistema'), v_meta
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_user_nome text;
BEGIN
  IF OLD.preco_unitario IS NOT DISTINCT FROM NEW.preco_unitario THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_user_nome FROM public.profiles WHERE id = v_user;

  INSERT INTO public.audit_price_changes (
    entity_table, entity_id, fornecedor_id,
    preco_anterior, preco_novo,
    changed_by, changed_by_nome
  ) VALUES (
    TG_TABLE_NAME, NEW.id, NEW.fornecedor_id,
    OLD.preco_unitario, NEW.preco_unitario,
    v_user, COALESCE(v_user_nome, 'Sistema')
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS POR ENTIDADE
-- ============================================
DROP TRIGGER IF EXISTS trg_audit_status_orcamentos ON public.orcamentos;
CREATE TRIGGER trg_audit_status_orcamentos
AFTER UPDATE OF status ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_audit_status_fornecedores ON public.fornecedores;
CREATE TRIGGER trg_audit_status_fornecedores
AFTER UPDATE OF status ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_audit_status_clientes ON public.clientes;
CREATE TRIGGER trg_audit_status_clientes
AFTER UPDATE OF status ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_audit_status_projetos ON public.projetos;
CREATE TRIGGER trg_audit_status_projetos
AFTER UPDATE OF status ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_audit_status_plantas ON public.plantas;
CREATE TRIGGER trg_audit_status_plantas
AFTER UPDATE OF ativo, fundido_em ON public.plantas
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_audit_status_insumos ON public.insumos;
CREATE TRIGGER trg_audit_status_insumos
AFTER UPDATE OF ativo, fundido_em ON public.insumos
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_audit_price_plantas ON public.plantas;
CREATE TRIGGER trg_audit_price_plantas
AFTER UPDATE OF preco_unitario ON public.plantas
FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

DROP TRIGGER IF EXISTS trg_audit_price_insumos ON public.insumos;
CREATE TRIGGER trg_audit_price_insumos
AFTER UPDATE OF preco_unitario ON public.insumos
FOR EACH ROW EXECUTE FUNCTION public.log_price_change();
