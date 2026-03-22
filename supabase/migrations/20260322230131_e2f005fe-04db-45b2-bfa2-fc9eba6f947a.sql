
-- Tabela locais_cliente
CREATE TABLE public.locais_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  endereco_completo text,
  cnpj text,
  assessores text,
  funcionarios_casa text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.locais_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select locais_cliente" ON public.locais_cliente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert locais_cliente" ON public.locais_cliente FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update locais_cliente" ON public.locais_cliente FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete locais_cliente" ON public.locais_cliente FOR DELETE TO authenticated USING (true);

-- Adicionar local_id na tabela projetos
ALTER TABLE public.projetos ADD COLUMN local_id uuid REFERENCES public.locais_cliente(id) ON DELETE SET NULL;
