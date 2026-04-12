
CREATE TABLE public.financeiro_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_parcela integer NOT NULL DEFAULT 1,
  valor numeric NOT NULL DEFAULT 0,
  data_vencimento date,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e adm podem ver parcelas"
  ON public.financeiro_parcelas FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));

CREATE POLICY "Admin e adm podem criar parcelas"
  ON public.financeiro_parcelas FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e adm podem editar parcelas"
  ON public.financeiro_parcelas FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e adm podem excluir parcelas"
  ON public.financeiro_parcelas FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE TRIGGER update_financeiro_parcelas_updated_at
  BEFORE UPDATE ON public.financeiro_parcelas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a single "parcela" when a project is approved
CREATE OR REPLACE FUNCTION public.auto_create_parcela_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    INSERT INTO public.financeiro_parcelas (projeto_id, cliente_id, numero_parcela, valor)
    VALUES (NEW.id, NEW.cliente_id, 1, COALESCE(NEW.valor_total, 0));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_parcela_on_approval
  AFTER UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_parcela_on_approval();
