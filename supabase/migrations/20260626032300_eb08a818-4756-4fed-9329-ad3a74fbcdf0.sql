
-- Tabela de fornecedores selecionados por item de orçamento (principal + reservas)
CREATE TABLE public.orcamento_item_fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_item_id uuid NOT NULL REFERENCES public.orcamento_itens(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  rank smallint NOT NULL DEFAULT 1,
  preco_unitario numeric,
  unidade text,
  observacao text,
  foto_url text,
  estrelas smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (orcamento_item_id, fornecedor_id)
);

CREATE INDEX idx_oif_item ON public.orcamento_item_fornecedores(orcamento_item_id);
CREATE INDEX idx_oif_fornecedor ON public.orcamento_item_fornecedores(fornecedor_id);
CREATE INDEX idx_oif_item_rank ON public.orcamento_item_fornecedores(orcamento_item_id, rank);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_item_fornecedores TO authenticated;
GRANT ALL ON public.orcamento_item_fornecedores TO service_role;

ALTER TABLE public.orcamento_item_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read item fornecedores"
  ON public.orcamento_item_fornecedores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert item fornecedores"
  ON public.orcamento_item_fornecedores FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update item fornecedores"
  ON public.orcamento_item_fornecedores FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete item fornecedores"
  ON public.orcamento_item_fornecedores FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_oif_updated_at
  BEFORE UPDATE ON public.orcamento_item_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
