
CREATE TABLE public.crm_correcoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  o_que_fez text NOT NULL,
  o_que_deveria_ter_feito text NOT NULL,
  contexto text,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_correcoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read crm_correcoes_ia" ON public.crm_correcoes_ia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert crm_correcoes_ia" ON public.crm_correcoes_ia
  FOR INSERT TO authenticated WITH CHECK (true);
