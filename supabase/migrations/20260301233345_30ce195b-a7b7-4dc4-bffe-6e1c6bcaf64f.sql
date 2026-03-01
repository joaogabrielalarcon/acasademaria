
-- Create system_state table for persistent flags (e.g. bootstrap completed)
CREATE TABLE IF NOT EXISTS public.system_state (
  key TEXT PRIMARY KEY,
  value BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_state ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should access this table
-- No public policies needed - accessed via service role key in edge functions

-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('colaboradores-fotos', 'registros-midia');

-- Update storage policies: remove public read, add authenticated read
DROP POLICY IF EXISTS "Public read access for colaboradores fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for registros midia" ON storage.objects;

CREATE POLICY "Authenticated read for colaboradores fotos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'colaboradores-fotos');

CREATE POLICY "Authenticated read for registros midia"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'registros-midia');
