DROP POLICY IF EXISTS "Allow read access to registros_historico" ON public.registros_historico;
DROP POLICY IF EXISTS "Managers can read registros_historico" ON public.registros_historico;

CREATE POLICY "Managers can read registros_historico"
  ON public.registros_historico
  FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));