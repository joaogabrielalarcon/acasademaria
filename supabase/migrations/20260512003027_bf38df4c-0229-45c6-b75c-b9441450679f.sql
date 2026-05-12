
-- Adicionar campos faltantes em perfis_markup
ALTER TABLE public.perfis_markup
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Adicionar margem_pct em perfis_markup_categorias (espelho do markup)
ALTER TABLE public.perfis_markup_categorias
  ADD COLUMN IF NOT EXISTS margem_pct numeric(8,4);

-- Backfill margem para registros existentes (margem = markup / (1 + markup))
UPDATE public.perfis_markup_categorias
SET margem_pct = ROUND((markup_pct / (1 + markup_pct/100)), 4)
WHERE margem_pct IS NULL AND markup_pct IS NOT NULL;

-- Garantir unicidade de nome em perfis_markup
CREATE UNIQUE INDEX IF NOT EXISTS perfis_markup_nome_uniq
  ON public.perfis_markup (lower(nome)) WHERE arquivado = false;

-- Tabela de markup por categoria por orçamento
CREATE TABLE IF NOT EXISTS public.orcamento_categorias_markup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  markup_pct numeric(8,4) NOT NULL,
  margem_pct numeric(8,4) NOT NULL,
  perfil_id_aplicado uuid REFERENCES public.perfis_markup(id) ON DELETE SET NULL,
  ajustado_manualmente boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (orcamento_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_ocm_orcamento ON public.orcamento_categorias_markup(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_ocm_perfil ON public.orcamento_categorias_markup(perfil_id_aplicado);

ALTER TABLE public.orcamento_categorias_markup ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado (acesso ao orçamento já é controlado pela tela)
CREATE POLICY "ocm_select_authenticated"
  ON public.orcamento_categorias_markup FOR SELECT
  TO authenticated
  USING (true);

-- Mutação: admin/administrativo/diretor
CREATE POLICY "ocm_insert_admin"
  ON public.orcamento_categorias_markup FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "ocm_update_admin"
  ON public.orcamento_categorias_markup FOR UPDATE
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "ocm_delete_admin"
  ON public.orcamento_categorias_markup FOR DELETE
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

-- Trigger updated_at e auditoria de alterações manuais
CREATE TRIGGER trg_ocm_updated_at
  BEFORE UPDATE ON public.orcamento_categorias_markup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ocm_audit_fields
  BEFORE INSERT OR UPDATE ON public.orcamento_categorias_markup
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- Auditoria: registra mudanças manuais de markup/margem
CREATE OR REPLACE FUNCTION public.audit_orcamento_markup_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nome text;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.markup_pct IS DISTINCT FROM NEW.markup_pct
    OR OLD.margem_pct IS DISTINCT FROM NEW.margem_pct
  ) AND NEW.ajustado_manualmente = true THEN
    SELECT nome INTO v_nome FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.audit_status_changes (
      entity_table, entity_id, status_anterior, status_novo,
      changed_by, changed_by_nome, metadata
    ) VALUES (
      'orcamento_markup', NEW.orcamento_id,
      OLD.markup_pct::text, NEW.markup_pct::text,
      auth.uid(), COALESCE(v_nome, 'Equipe MFM'),
      jsonb_build_object(
        'categoria', NEW.categoria,
        'markup_anterior', OLD.markup_pct,
        'markup_novo', NEW.markup_pct,
        'margem_anterior', OLD.margem_pct,
        'margem_nova', NEW.margem_pct,
        'perfil_aplicado_no_momento', NEW.perfil_id_aplicado,
        'motivo', current_setting('app.markup_motivo', true)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ocm_audit_change
  AFTER UPDATE ON public.orcamento_categorias_markup
  FOR EACH ROW EXECUTE FUNCTION public.audit_orcamento_markup_change();

-- Trigger updated_at em perfis_markup
DROP TRIGGER IF EXISTS trg_perfis_markup_updated_at ON public.perfis_markup;
CREATE TRIGGER trg_perfis_markup_updated_at
  BEFORE UPDATE ON public.perfis_markup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
