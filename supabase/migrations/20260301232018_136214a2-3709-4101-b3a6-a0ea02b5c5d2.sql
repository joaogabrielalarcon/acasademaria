
-- Tabela de custos de equipe (salários)
CREATE TABLE public.custos_equipe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  salario_mensal NUMERIC NOT NULL DEFAULT 0,
  custo_dia_util NUMERIC GENERATED ALWAYS AS (ROUND(salario_mensal / 21, 2)) STORED,
  data_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  observacoes TEXT
);

-- Histórico de alterações de salário
CREATE TABLE public.historico_salarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  salario_anterior NUMERIC,
  salario_novo NUMERIC NOT NULL,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID,
  observacao TEXT
);

-- RLS
ALTER TABLE public.custos_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_salarios ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas admin pode gerenciar custos
CREATE POLICY "Admins can read custos_equipe" ON public.custos_equipe FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can insert custos_equipe" ON public.custos_equipe FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update custos_equipe" ON public.custos_equipe FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete custos_equipe" ON public.custos_equipe FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can read historico_salarios" ON public.historico_salarios FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can insert historico_salarios" ON public.historico_salarios FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION public.log_alteracao_salario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.salario_mensal IS DISTINCT FROM NEW.salario_mensal THEN
    INSERT INTO public.historico_salarios (colaborador_id, salario_anterior, salario_novo, usuario_id)
    VALUES (NEW.colaborador_id, OLD.salario_mensal, NEW.salario_mensal, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_salario
AFTER UPDATE ON public.custos_equipe
FOR EACH ROW
EXECUTE FUNCTION public.log_alteracao_salario();
