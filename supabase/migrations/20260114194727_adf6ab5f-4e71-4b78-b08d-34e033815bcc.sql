-- Tabela para armazenar histórico de alterações nos registros
CREATE TABLE public.registros_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL,
  usuario_id UUID,
  acao TEXT NOT NULL, -- 'criado', 'atualizado', 'cancelado'
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para buscar histórico de um registro específico
CREATE INDEX idx_registros_historico_registro_id ON public.registros_historico(registro_id);
CREATE INDEX idx_registros_historico_created_at ON public.registros_historico(created_at DESC);

-- Enable RLS
ALTER TABLE public.registros_historico ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ler o histórico (gestores/admins)
CREATE POLICY "Allow read access to registros_historico"
ON public.registros_historico
FOR SELECT
USING (true);

-- Política: apenas o sistema pode inserir (via trigger)
CREATE POLICY "Allow insert to registros_historico"
ON public.registros_historico
FOR INSERT
WITH CHECK (true);

-- Função para registrar histórico de alterações
CREATE OR REPLACE FUNCTION public.log_registro_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campos_alterados TEXT[] := '{}';
  dados_ant JSONB;
  dados_nov JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Novo registro criado
    INSERT INTO public.registros_historico (
      registro_id,
      usuario_id,
      acao,
      dados_anteriores,
      dados_novos,
      campos_alterados
    ) VALUES (
      NEW.id,
      auth.uid(),
      'criado',
      NULL,
      to_jsonb(NEW),
      NULL
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar quais campos foram alterados
    IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
      campos_alterados := array_append(campos_alterados, 'descricao');
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      campos_alterados := array_append(campos_alterados, 'status');
    END IF;
    IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
      campos_alterados := array_append(campos_alterados, 'tipo');
    END IF;
    IF OLD.data_servico IS DISTINCT FROM NEW.data_servico THEN
      campos_alterados := array_append(campos_alterados, 'data_servico');
    END IF;
    IF OLD.trecho_id IS DISTINCT FROM NEW.trecho_id THEN
      campos_alterados := array_append(campos_alterados, 'trecho_id');
    END IF;
    IF OLD.categorias_ids IS DISTINCT FROM NEW.categorias_ids THEN
      campos_alterados := array_append(campos_alterados, 'categorias_ids');
    END IF;
    IF OLD.executores_ids IS DISTINCT FROM NEW.executores_ids THEN
      campos_alterados := array_append(campos_alterados, 'executores_ids');
    END IF;
    IF OLD.equipe_presente_ids IS DISTINCT FROM NEW.equipe_presente_ids THEN
      campos_alterados := array_append(campos_alterados, 'equipe_presente_ids');
    END IF;
    IF OLD.solicitante IS DISTINCT FROM NEW.solicitante THEN
      campos_alterados := array_append(campos_alterados, 'solicitante');
    END IF;
    IF OLD.observacoes_internas IS DISTINCT FROM NEW.observacoes_internas THEN
      campos_alterados := array_append(campos_alterados, 'observacoes_internas');
    END IF;
    IF OLD.midia IS DISTINCT FROM NEW.midia THEN
      campos_alterados := array_append(campos_alterados, 'midia');
    END IF;
    
    -- Só registra se houve alteração real
    IF array_length(campos_alterados, 1) > 0 THEN
      -- Determinar a ação
      INSERT INTO public.registros_historico (
        registro_id,
        usuario_id,
        acao,
        dados_anteriores,
        dados_novos,
        campos_alterados
      ) VALUES (
        NEW.id,
        auth.uid(),
        CASE 
          WHEN NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN 'cancelado'
          ELSE 'atualizado'
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        campos_alterados
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger para registrar alterações
CREATE TRIGGER tr_log_registro_changes
AFTER INSERT OR UPDATE ON public.registros
FOR EACH ROW
EXECUTE FUNCTION public.log_registro_changes();