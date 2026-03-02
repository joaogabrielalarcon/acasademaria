
-- Tabela de projetos vinculados a clientes
CREATE TABLE public.projetos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'orcamento',
  valor_total numeric DEFAULT 0,
  data_inicio date,
  data_previsao date,
  data_conclusao date,
  responsavel_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Trigger para updated_at e audit fields
CREATE TRIGGER set_projetos_updated_at
  BEFORE UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_projetos_audit
  BEFORE INSERT OR UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- RLS
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins can delete projetos"
  ON public.projetos FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Admin can manage (insert/update)
CREATE POLICY "Admins can insert projetos"
  ON public.projetos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projetos"
  ON public.projetos FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Managers+ can read
CREATE POLICY "Managers can read projetos"
  ON public.projetos FOR SELECT
  USING (is_manager_or_admin(auth.uid()));
