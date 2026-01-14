-- Tabela de máquinas/equipamentos
CREATE TABLE public.maquinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  modelo TEXT,
  marca TEXT,
  numero_serie TEXT,
  codigo_interno TEXT,
  categoria TEXT, -- roçadeira, soprador, motosserra, etc.
  horas_acumuladas NUMERIC NOT NULL DEFAULT 0,
  horas_limite_manutencao NUMERIC NOT NULL DEFAULT 100, -- limite para alerta
  ultima_manutencao DATE,
  proxima_manutencao_em NUMERIC, -- em quantas horas precisa de manutenção
  status TEXT NOT NULL DEFAULT 'ativa', -- ativa, em_manutencao, inativa
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;

-- Policies para maquinas
CREATE POLICY "Authenticated users can view maquinas"
  ON public.maquinas FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert maquinas"
  ON public.maquinas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update maquinas"
  ON public.maquinas FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete maquinas"
  ON public.maquinas FOR DELETE
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_maquinas_updated_at
  BEFORE UPDATE ON public.maquinas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de registro de uso de máquinas em serviços
CREATE TABLE public.registro_maquinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  maquina_id UUID NOT NULL REFERENCES public.maquinas(id) ON DELETE RESTRICT,
  horas_utilizadas NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registro_maquinas ENABLE ROW LEVEL SECURITY;

-- Policies para registro_maquinas
CREATE POLICY "Authenticated users can view registro_maquinas"
  ON public.registro_maquinas FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert registro_maquinas"
  ON public.registro_maquinas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update registro_maquinas"
  ON public.registro_maquinas FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete registro_maquinas"
  ON public.registro_maquinas FOR DELETE
  USING (true);

-- Função para atualizar horas acumuladas da máquina
CREATE OR REPLACE FUNCTION public.atualizar_horas_maquina()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Soma as horas na máquina
    UPDATE public.maquinas
    SET horas_acumuladas = horas_acumuladas + NEW.horas_utilizadas
    WHERE id = NEW.maquina_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ajusta a diferença de horas
    UPDATE public.maquinas
    SET horas_acumuladas = horas_acumuladas - OLD.horas_utilizadas + NEW.horas_utilizadas
    WHERE id = NEW.maquina_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtrai as horas
    UPDATE public.maquinas
    SET horas_acumuladas = horas_acumuladas - OLD.horas_utilizadas
    WHERE id = OLD.maquina_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar horas automaticamente
CREATE TRIGGER trigger_atualizar_horas_maquina
  AFTER INSERT OR UPDATE OR DELETE ON public.registro_maquinas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_horas_maquina();

-- Função para verificar se máquina precisa de manutenção
CREATE OR REPLACE FUNCTION public.verificar_manutencao_maquina()
RETURNS TRIGGER AS $$
BEGIN
  -- Se horas acumuladas >= limite, atualiza status para precisando manutenção
  IF NEW.horas_acumuladas >= NEW.horas_limite_manutencao AND NEW.status = 'ativa' THEN
    NEW.status := 'manutencao_pendente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para verificar manutenção
CREATE TRIGGER trigger_verificar_manutencao
  BEFORE UPDATE ON public.maquinas
  FOR EACH ROW
  EXECUTE FUNCTION public.verificar_manutencao_maquina();