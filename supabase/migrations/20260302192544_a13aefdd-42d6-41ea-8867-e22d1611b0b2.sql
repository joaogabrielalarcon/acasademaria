
-- Activity feed table for tracking all client-related changes
CREATE TABLE public.cliente_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo text NOT NULL, -- 'registro', 'proposta', 'projeto', 'cliente', 'trecho'
  acao text NOT NULL, -- 'criado', 'atualizado', 'excluido', 'status_alterado'
  descricao text NOT NULL, -- human-readable description
  entidade_id uuid, -- ID of the related entity
  dados_extras jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast client feed queries
CREATE INDEX idx_cliente_atividades_cliente_id ON public.cliente_atividades(cliente_id, created_at DESC);

-- RLS
ALTER TABLE public.cliente_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read cliente_atividades"
  ON public.cliente_atividades FOR SELECT TO authenticated
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "System can insert cliente_atividades"
  ON public.cliente_atividades FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger function for registros
CREATE OR REPLACE FUNCTION public.log_registro_atividade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _descricao text;
  _acao text;
  _dados jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'criado';
    _descricao := 'Novo registro: ' || COALESCE(NEW.tipo, '') || ' - ' || LEFT(NEW.descricao, 100);
    _dados := jsonb_build_object('tipo', NEW.tipo, 'status', NEW.status, 'data_servico', NEW.data_servico);
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'registro', _acao, _descricao, NEW.id, _dados);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _acao := 'status_alterado';
      _descricao := 'Status do registro alterado de "' || COALESCE(OLD.status,'') || '" para "' || COALESCE(NEW.status,'') || '"';
    ELSE
      _acao := 'atualizado';
      _descricao := 'Registro atualizado: ' || LEFT(NEW.descricao, 100);
    END IF;
    _dados := jsonb_build_object('tipo', NEW.tipo, 'status', NEW.status);
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'registro', _acao, _descricao, NEW.id, _dados);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id)
    VALUES (OLD.cliente_id, auth.uid(), 'registro', 'excluido', 'Registro excluído: ' || LEFT(OLD.descricao, 100), OLD.id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_registro_atividade
  AFTER INSERT OR UPDATE OR DELETE ON public.registros
  FOR EACH ROW EXECUTE FUNCTION public.log_registro_atividade();

-- Trigger function for propostas
CREATE OR REPLACE FUNCTION public.log_proposta_atividade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _descricao text;
  _acao text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'criado';
    _descricao := 'Nova proposta criada: ' || NEW.codigo || ' - ' || NEW.titulo;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'proposta', _acao, _descricao, NEW.id, jsonb_build_object('codigo', NEW.codigo, 'status', NEW.status, 'valor', NEW.valor));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _descricao := 'Proposta ' || NEW.codigo || ': status alterado de "' || OLD.status || '" para "' || NEW.status || '"';
      _acao := 'status_alterado';
    ELSE
      _descricao := 'Proposta ' || NEW.codigo || ' atualizada';
      _acao := 'atualizado';
    END IF;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'proposta', _acao, _descricao, NEW.id, jsonb_build_object('codigo', NEW.codigo, 'status', NEW.status));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_proposta_atividade
  AFTER INSERT OR UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.log_proposta_atividade();

-- Trigger function for projetos
CREATE OR REPLACE FUNCTION public.log_projeto_atividade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _descricao text;
  _acao text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'criado';
    _descricao := 'Novo projeto criado: ' || NEW.titulo;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'projeto', _acao, _descricao, NEW.id, jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _descricao := 'Projeto "' || NEW.titulo || '": status alterado de "' || OLD.status || '" para "' || NEW.status || '"';
      _acao := 'status_alterado';
    ELSE
      _descricao := 'Projeto "' || NEW.titulo || '" atualizado';
      _acao := 'atualizado';
    END IF;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'projeto', _acao, _descricao, NEW.id, jsonb_build_object('status', NEW.status));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_projeto_atividade
  AFTER INSERT OR UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.log_projeto_atividade();

-- Trigger for client profile updates
CREATE OR REPLACE FUNCTION public.log_cliente_atividade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id)
    VALUES (NEW.id, auth.uid(), 'cliente', 'atualizado', 'Cadastro do cliente atualizado', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cliente_atividade
  AFTER UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.log_cliente_atividade();
