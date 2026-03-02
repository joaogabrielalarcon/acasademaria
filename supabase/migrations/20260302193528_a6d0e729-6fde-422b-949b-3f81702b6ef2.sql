
-- Processos Internos: Área → Processo → Etapas
CREATE TABLE public.processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  objetivo text,
  ordem integer DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.processo_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  responsavel text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_processos_area ON public.processos(area_id);
CREATE INDEX idx_processo_etapas_processo ON public.processo_etapas(processo_id, ordem);

-- RLS
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_etapas ENABLE ROW LEVEL SECURITY;

-- Processos policies
CREATE POLICY "Authenticated can read processos" ON public.processos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert processos" ON public.processos FOR INSERT TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can update processos" ON public.processos FOR UPDATE TO authenticated USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can delete processos" ON public.processos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Etapas policies
CREATE POLICY "Authenticated can read processo_etapas" ON public.processo_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert processo_etapas" ON public.processo_etapas FOR INSERT TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can update processo_etapas" ON public.processo_etapas FOR UPDATE TO authenticated USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Admins can delete processo_etapas" ON public.processo_etapas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Audit triggers
CREATE TRIGGER set_processos_audit BEFORE INSERT OR UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
