
-- Novos campos na tabela colaboradores
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS possui_conducao boolean DEFAULT false;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_conducao text CHECK (tipo_conducao IN ('Carro', 'Moto', 'Ambos'));
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS possui_cnh boolean DEFAULT false;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_cnh text CHECK (tipo_cnh IN ('A', 'B', 'AB', 'C', 'D', 'E'));

-- Tabela de documentos do colaborador
CREATE TABLE public.colaborador_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo_documento text NOT NULL DEFAULT 'Outro' CHECK (tipo_documento IN (
    'RG', 'CPF', 'CNH', 'CTPS', 'Comprovante Residência', 'Certidão', 'Exame Admissional', 'Atestado', 'Contrato', 'Outro'
  )),
  url text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_colab_docs ON public.colaborador_documentos(colaborador_id);

ALTER TABLE public.colaborador_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read colaborador_documentos"
  ON public.colaborador_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert colaborador_documentos"
  ON public.colaborador_documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update colaborador_documentos"
  ON public.colaborador_documentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete colaborador_documentos"
  ON public.colaborador_documentos FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_documentos TO authenticated;
GRANT SELECT ON public.colaborador_documentos TO anon;

-- Bucket para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('colaboradores-documentos', 'colaboradores-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users can upload colab docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'colaboradores-documentos');

CREATE POLICY "Auth users can read colab docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'colaboradores-documentos');

CREATE POLICY "Auth users can delete colab docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'colaboradores-documentos');
