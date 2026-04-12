
CREATE TABLE public.maquinas_manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id uuid NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
  data_manutencao date NOT NULL,
  tipo text NOT NULL DEFAULT 'corretiva' CHECK (tipo IN ('preventiva', 'corretiva', 'troca_peca')),
  descricao text NOT NULL,
  custo numeric(10,2),
  realizado_por text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_manut_maquina ON public.maquinas_manutencoes(maquina_id, data_manutencao DESC);

ALTER TABLE public.maquinas_manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maquinas_manutencoes"
  ON public.maquinas_manutencoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maquinas_manutencoes"
  ON public.maquinas_manutencoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maquinas_manutencoes"
  ON public.maquinas_manutencoes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete maquinas_manutencoes"
  ON public.maquinas_manutencoes FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maquinas_manutencoes TO authenticated;
GRANT SELECT ON public.maquinas_manutencoes TO anon;
