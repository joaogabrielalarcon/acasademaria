-- 1. Colunas faltantes
ALTER TABLE public.orcamento_mo
  ADD COLUMN IF NOT EXISTS colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL;

ALTER TABLE public.orcamento_fretes
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS percurso text;

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS observacao_aprovacao text;

-- 2. Snapshots imutáveis
CREATE TABLE IF NOT EXISTS public.orcamento_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('envio','aprovacao')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.orcamento_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orcamento_snapshots_select ON public.orcamento_snapshots;
CREATE POLICY orcamento_snapshots_select ON public.orcamento_snapshots
  FOR SELECT USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role])
  );

DROP POLICY IF EXISTS orcamento_snapshots_insert ON public.orcamento_snapshots;
CREATE POLICY orcamento_snapshots_insert ON public.orcamento_snapshots
  FOR INSERT WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role])
  );

-- Sem policies de UPDATE/DELETE — registro permanente

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_orcamento_mo_colaborador ON public.orcamento_mo(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_fretes_fornecedor ON public.orcamento_fretes(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_snapshots_orc ON public.orcamento_snapshots(orcamento_id, tipo);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_envio ON public.orcamentos(data_envio);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_aprovacao ON public.orcamentos(data_aprovacao);

-- 4. Trigger de auditoria de status em orcamentos
CREATE OR REPLACE FUNCTION public.log_orcamento_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT nome INTO v_nome FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.audit_status_changes (
      entity_table, entity_id, status_anterior, status_novo,
      changed_by, changed_by_nome, metadata
    ) VALUES (
      'orcamentos', NEW.id, OLD.status, NEW.status,
      auth.uid(), COALESCE(v_nome,'Sistema'),
      jsonb_build_object(
        'codigo', NEW.codigo,
        'valor_aprovado_final', NEW.valor_negociado_final
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orcamentos_status_audit ON public.orcamentos;
CREATE TRIGGER trg_orcamentos_status_audit
  AFTER UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.log_orcamento_status_change();