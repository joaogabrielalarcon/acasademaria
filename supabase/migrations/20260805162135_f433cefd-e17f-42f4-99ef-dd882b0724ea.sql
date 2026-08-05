-- audit_status_changes: append-only history.
-- Grants (Data API needs them explicitly).
GRANT SELECT, INSERT ON public.audit_status_changes TO authenticated;
GRANT ALL ON public.audit_status_changes TO service_role;

-- Author defaults to the caller.
ALTER TABLE public.audit_status_changes
  ALTER COLUMN changed_by SET DEFAULT auth.uid();

-- Authenticated users may append, only in their own name.
CREATE POLICY "Usuarios autenticados registram historico em seu nome"
  ON public.audit_status_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- No UPDATE/DELETE policies on purpose: RLS denies both by default.