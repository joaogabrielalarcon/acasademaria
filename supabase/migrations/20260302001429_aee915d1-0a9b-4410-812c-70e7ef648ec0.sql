
-- Itens do orçamento de um projeto
CREATE TABLE public.orcamento_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'servico', -- 'planta', 'insumo', 'servico'
  planta_id uuid REFERENCES public.plantas(id) ON DELETE SET NULL,
  insumo_id uuid REFERENCES public.insumos(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text DEFAULT 'un',
  margem_percentual numeric DEFAULT 0, -- ex: 30 = 30%
  reserva_valor numeric DEFAULT 0,
  preco_custo numeric DEFAULT 0, -- preço do fornecedor selecionado
  preco_venda numeric DEFAULT 0, -- calculado: (custo + reserva) / (1 - margem/100)
  ordem integer DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TRIGGER set_orcamento_itens_updated_at
  BEFORE UPDATE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_orcamento_itens_audit
  BEFORE INSERT OR UPDATE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete orcamento_itens"
  ON public.orcamento_itens FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert orcamento_itens"
  ON public.orcamento_itens FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orcamento_itens"
  ON public.orcamento_itens FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can read orcamento_itens"
  ON public.orcamento_itens FOR SELECT
  USING (is_manager_or_admin(auth.uid()));

-- Cotações de fornecedores por item (até 8 por item)
CREATE TABLE public.orcamento_cotacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.orcamento_itens(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome text, -- caso fornecedor não esteja cadastrado
  preco_unitario numeric NOT NULL DEFAULT 0,
  selecionada boolean NOT NULL DEFAULT false,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete orcamento_cotacoes"
  ON public.orcamento_cotacoes FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert orcamento_cotacoes"
  ON public.orcamento_cotacoes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orcamento_cotacoes"
  ON public.orcamento_cotacoes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can read orcamento_cotacoes"
  ON public.orcamento_cotacoes FOR SELECT
  USING (is_manager_or_admin(auth.uid()));
