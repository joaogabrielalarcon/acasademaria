
-- Tabela de histórico de preços para plantas e insumos
CREATE TABLE public.historico_precos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_item text NOT NULL, -- 'planta' ou 'insumo'
  planta_id uuid REFERENCES public.plantas(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  preco_anterior numeric,
  preco_novo numeric,
  data_alteracao timestamp with time zone NOT NULL DEFAULT now(),
  usuario_id uuid,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read historico_precos" ON public.historico_precos
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can insert historico_precos" ON public.historico_precos
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para registrar automaticamente mudanças de preço em plantas
CREATE OR REPLACE FUNCTION public.log_preco_planta()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario THEN
    INSERT INTO public.historico_precos (tipo_item, planta_id, fornecedor_id, preco_anterior, preco_novo, usuario_id)
    VALUES ('planta', NEW.id, NEW.fornecedor_id, OLD.preco_unitario, NEW.preco_unitario, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_preco_planta
  BEFORE UPDATE ON public.plantas
  FOR EACH ROW
  EXECUTE FUNCTION public.log_preco_planta();

-- Trigger para registrar automaticamente mudanças de preço em insumos
CREATE OR REPLACE FUNCTION public.log_preco_insumo()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario THEN
    INSERT INTO public.historico_precos (tipo_item, insumo_id, fornecedor_id, preco_anterior, preco_novo, usuario_id)
    VALUES ('insumo', NEW.id, NEW.fornecedor_id, OLD.preco_unitario, NEW.preco_unitario, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_preco_insumo
  BEFORE UPDATE ON public.insumos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_preco_insumo();
