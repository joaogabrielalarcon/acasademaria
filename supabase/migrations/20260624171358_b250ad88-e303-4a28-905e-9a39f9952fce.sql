
CREATE TABLE public.form_drafts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_key text NOT NULL,
  scope_key text NOT NULL DEFAULT '',
  schema_version integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL,
  client_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, form_key, scope_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_drafts TO authenticated;
GRANT ALL ON public.form_drafts TO service_role;

ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own drafts select" ON public.form_drafts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own drafts insert" ON public.form_drafts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own drafts update" ON public.form_drafts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own drafts delete" ON public.form_drafts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX form_drafts_user_updated_idx ON public.form_drafts(user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_old_form_drafts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.form_drafts WHERE updated_at < now() - interval '30 days';
$$;
