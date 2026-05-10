CREATE POLICY "tipos_proposta_select_authenticated"
ON public.tipos_proposta
FOR SELECT
TO authenticated
USING (true);