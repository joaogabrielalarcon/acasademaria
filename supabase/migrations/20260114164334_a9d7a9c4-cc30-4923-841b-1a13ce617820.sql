-- Criar bucket para fotos de colaboradores
INSERT INTO storage.buckets (id, name, public)
VALUES ('colaboradores-fotos', 'colaboradores-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket de fotos de colaboradores
CREATE POLICY "Public read access for colaboradores fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'colaboradores-fotos');

CREATE POLICY "Authenticated users can upload colaboradores fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'colaboradores-fotos');

CREATE POLICY "Authenticated users can update colaboradores fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'colaboradores-fotos');

CREATE POLICY "Authenticated users can delete colaboradores fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'colaboradores-fotos');

-- Adicionar campo foto_url na tabela colaboradores
ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS foto_url TEXT;