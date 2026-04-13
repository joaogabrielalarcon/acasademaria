
-- plantas: abrir SELECT para todos os autenticados
DROP POLICY IF EXISTS "Admins can read plantas" ON public.plantas;
CREATE POLICY "Authenticated can read plantas"
  ON public.plantas FOR SELECT TO authenticated
  USING (true);

-- insumos: abrir SELECT para todos os autenticados
DROP POLICY IF EXISTS "Admins can read insumos" ON public.insumos;
DROP POLICY IF EXISTS "Field roles can read insumos" ON public.insumos;
CREATE POLICY "Authenticated can read insumos"
  ON public.insumos FOR SELECT TO authenticated
  USING (true);

-- fornecedores: abrir SELECT para todos os autenticados
DROP POLICY IF EXISTS "Admins can read fornecedores" ON public.fornecedores;
CREATE POLICY "Authenticated can read fornecedores"
  ON public.fornecedores FOR SELECT TO authenticated
  USING (true);

-- historico_precos: já tem USING(true), mas confirmar que está correto
-- (já está OK, nenhuma alteração necessária)
