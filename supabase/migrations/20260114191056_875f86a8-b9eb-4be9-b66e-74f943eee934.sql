-- Criar bucket para mídia de registros (fotos e vídeos de serviços)
INSERT INTO storage.buckets (id, name, public)
VALUES ('registros-midia', 'registros-midia', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket de mídia de registros
CREATE POLICY "Public read access for registros midia"
ON storage.objects FOR SELECT
USING (bucket_id = 'registros-midia');

CREATE POLICY "Authenticated users can upload registros midia"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'registros-midia');

CREATE POLICY "Authenticated users can update registros midia"
ON storage.objects FOR UPDATE
USING (bucket_id = 'registros-midia');

CREATE POLICY "Authenticated users can delete registros midia"
ON storage.objects FOR DELETE
USING (bucket_id = 'registros-midia');