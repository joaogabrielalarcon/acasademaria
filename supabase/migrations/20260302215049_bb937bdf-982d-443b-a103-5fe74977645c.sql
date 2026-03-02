
-- Tabela para eventos manuais do calendário inseridos pelo administrativo/diretoria
CREATE TABLE public.calendario_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  data date NOT NULL,
  recorrente boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'evento',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendario_eventos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver
CREATE POLICY "Authenticated can read calendario_eventos"
ON public.calendario_eventos FOR SELECT
TO authenticated
USING (true);

-- Admin e gestor podem inserir
CREATE POLICY "Managers can insert calendario_eventos"
ON public.calendario_eventos FOR INSERT
TO authenticated
WITH CHECK (is_manager_or_admin(auth.uid()));

-- Admin e gestor podem atualizar
CREATE POLICY "Managers can update calendario_eventos"
ON public.calendario_eventos FOR UPDATE
TO authenticated
USING (is_manager_or_admin(auth.uid()));

-- Admin pode deletar
CREATE POLICY "Admins can delete calendario_eventos"
ON public.calendario_eventos FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_calendario_eventos_updated_at
BEFORE UPDATE ON public.calendario_eventos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para audit
CREATE TRIGGER set_calendario_eventos_audit
BEFORE INSERT OR UPDATE ON public.calendario_eventos
FOR EACH ROW
EXECUTE FUNCTION public.set_audit_fields();
