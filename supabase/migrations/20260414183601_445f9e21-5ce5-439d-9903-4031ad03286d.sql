
-- Table: estoque_movimentacoes
CREATE TABLE public.estoque_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_tipo text NOT NULL CHECK (item_tipo IN ('insumo', 'planta')),
  tipo_movimento text NOT NULL CHECK (tipo_movimento IN ('entrada', 'saida')),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric DEFAULT 0,
  valor_total numeric GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'diario', 'compra')),
  referencia_id uuid,
  observacoes text,
  registrado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock movements"
  ON public.estoque_movimentacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert stock movements"
  ON public.estoque_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update stock movements"
  ON public.estoque_movimentacoes FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can delete stock movements"
  ON public.estoque_movimentacoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE INDEX idx_estoque_mov_item ON public.estoque_movimentacoes (item_id, item_tipo);
CREATE INDEX idx_estoque_mov_created ON public.estoque_movimentacoes (created_at DESC);

-- View: estoque_saldo (balance per item)
CREATE OR REPLACE VIEW public.estoque_saldo AS
SELECT
  item_id,
  item_tipo,
  COALESCE(SUM(CASE WHEN tipo_movimento = 'entrada' THEN quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN tipo_movimento = 'saida' THEN quantidade ELSE 0 END), 0) AS saldo,
  COALESCE(SUM(CASE WHEN tipo_movimento = 'entrada' THEN quantidade ELSE 0 END), 0) AS total_entradas,
  COALESCE(SUM(CASE WHEN tipo_movimento = 'saida' THEN quantidade ELSE 0 END), 0) AS total_saidas,
  MAX(created_at) AS ultima_movimentacao
FROM public.estoque_movimentacoes
GROUP BY item_id, item_tipo;

-- Table: financeiro_movimentacoes
CREATE TABLE public.financeiro_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria text NOT NULL DEFAULT 'compra_insumo',
  descricao text NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  data_movimentacao date NOT NULL DEFAULT CURRENT_DATE,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  estoque_movimentacao_id uuid REFERENCES public.estoque_movimentacoes(id),
  registrado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance users can view financial movements"
  ON public.financeiro_movimentacoes FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Finance users can insert financial movements"
  ON public.financeiro_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Finance users can update financial movements"
  ON public.financeiro_movimentacoes FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admins can delete financial movements"
  ON public.financeiro_movimentacoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE INDEX idx_fin_mov_data ON public.financeiro_movimentacoes (data_movimentacao DESC);
CREATE INDEX idx_fin_mov_tipo ON public.financeiro_movimentacoes (tipo);

-- Trigger: auto-create financial movement when stock entry (compra) is inserted
CREATE OR REPLACE FUNCTION public.auto_financeiro_on_stock_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item_nome text;
BEGIN
  IF NEW.tipo_movimento != 'entrada' OR NEW.origem != 'compra' THEN
    RETURN NEW;
  END IF;

  -- Get item name
  IF NEW.item_tipo = 'insumo' THEN
    SELECT nome INTO v_item_nome FROM public.insumos WHERE id = NEW.item_id;
  ELSE
    SELECT nome_popular INTO v_item_nome FROM public.plantas WHERE id = NEW.item_id;
  END IF;

  INSERT INTO public.financeiro_movimentacoes (
    tipo, categoria, descricao, valor, data_movimentacao,
    fornecedor_id, estoque_movimentacao_id, registrado_por_nome
  ) VALUES (
    'saida',
    'compra_' || NEW.item_tipo,
    'Compra: ' || COALESCE(v_item_nome, 'Item') || ' (x' || NEW.quantidade || ')',
    NEW.quantidade * COALESCE(NEW.preco_unitario, 0),
    CURRENT_DATE,
    NEW.fornecedor_id,
    NEW.id,
    NEW.registrado_por_nome
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_financeiro_stock_entry
AFTER INSERT ON public.estoque_movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.auto_financeiro_on_stock_entry();

-- Trigger: auto stock exit when diario_insumos_area is inserted
CREATE OR REPLACE FUNCTION public.auto_estoque_saida_diario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_qty numeric;
  v_nome text;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;

  v_qty := COALESCE(NULLIF(NEW.quantidade, '')::numeric, 1);
  
  SELECT nome INTO v_nome FROM public.insumos WHERE id = NEW.insumo_id;

  INSERT INTO public.estoque_movimentacoes (
    item_id, item_tipo, tipo_movimento, quantidade, origem, referencia_id,
    observacoes, registrado_por_nome
  ) VALUES (
    NEW.insumo_id,
    'insumo',
    'saida',
    v_qty,
    'diario',
    NEW.visita_id,
    'Saída automática via diário de visita',
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_estoque_saida_diario
AFTER INSERT ON public.diario_insumos_area
FOR EACH ROW
EXECUTE FUNCTION public.auto_estoque_saida_diario();

-- Trigger for updated_at on financeiro_movimentacoes
CREATE TRIGGER update_financeiro_movimentacoes_updated_at
BEFORE UPDATE ON public.financeiro_movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
