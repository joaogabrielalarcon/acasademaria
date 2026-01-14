
-- =====================================================
-- CORREÇÃO DE SEGURANÇA: POLÍTICAS RLS
-- =====================================================

-- Dropar TODAS as políticas permissivas existentes
DROP POLICY IF EXISTS "Allow all access to areas" ON public.areas;
DROP POLICY IF EXISTS "Allow all access to categorias_plantas" ON public.categorias_plantas;
DROP POLICY IF EXISTS "Allow all access to categorias_servico" ON public.categorias_servico;
DROP POLICY IF EXISTS "Allow all access to clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow all access to colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Allow all access to diarias" ON public.diarias;
DROP POLICY IF EXISTS "Allow all access to entregas_colaborador" ON public.entregas_colaborador;
DROP POLICY IF EXISTS "Allow all access to fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Allow all access to insumos" ON public.insumos;
DROP POLICY IF EXISTS "Allow all access to maquinas" ON public.maquinas;
DROP POLICY IF EXISTS "Allow all access to plantas" ON public.plantas;
DROP POLICY IF EXISTS "Allow all access to propostas" ON public.propostas;
DROP POLICY IF EXISTS "Allow all access to recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Allow all access to registro_insumos" ON public.registro_insumos;
DROP POLICY IF EXISTS "Allow all access to registro_maquinas" ON public.registro_maquinas;
DROP POLICY IF EXISTS "Allow all access to registros" ON public.registros;
DROP POLICY IF EXISTS "Allow all access to trechos" ON public.trechos;

-- =====================================================
-- TABELAS DE ACESSO GERAL (Todos autenticados)
-- =====================================================

-- CLIENTES: Todos autenticados podem ler e gerenciar
CREATE POLICY "Authenticated users can read clientes"
  ON public.clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clientes"
  ON public.clientes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clientes"
  ON public.clientes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete clientes"
  ON public.clientes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- TRECHOS: Seguem clientes
CREATE POLICY "Authenticated users can read trechos"
  ON public.trechos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert trechos"
  ON public.trechos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update trechos"
  ON public.trechos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete trechos"
  ON public.trechos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- DIARIAS: Todos autenticados
CREATE POLICY "Authenticated users can read diarias"
  ON public.diarias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert diarias"
  ON public.diarias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update diarias"
  ON public.diarias FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete diarias"
  ON public.diarias FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- REGISTROS: Todos autenticados
CREATE POLICY "Authenticated users can read registros"
  ON public.registros FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert registros"
  ON public.registros FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update registros"
  ON public.registros FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete registros"
  ON public.registros FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- REGISTRO_INSUMOS: Segue registros
CREATE POLICY "Authenticated users can read registro_insumos"
  ON public.registro_insumos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert registro_insumos"
  ON public.registro_insumos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update registro_insumos"
  ON public.registro_insumos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete registro_insumos"
  ON public.registro_insumos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- REGISTRO_MAQUINAS: Segue registros
CREATE POLICY "Authenticated users can read registro_maquinas"
  ON public.registro_maquinas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert registro_maquinas"
  ON public.registro_maquinas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update registro_maquinas"
  ON public.registro_maquinas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete registro_maquinas"
  ON public.registro_maquinas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RECEBIMENTO_ITENS: Segue registros
CREATE POLICY "Authenticated users can read recebimento_itens"
  ON public.recebimento_itens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recebimento_itens"
  ON public.recebimento_itens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recebimento_itens"
  ON public.recebimento_itens FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete recebimento_itens"
  ON public.recebimento_itens FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TABELAS DE ACESSO RESTRITO (Admin + Gestor)
-- =====================================================

-- COLABORADORES: Leitura todos, escrita admin/gestor
CREATE POLICY "Authenticated users can read colaboradores"
  ON public.colaboradores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert colaboradores"
  ON public.colaboradores FOR INSERT
  TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update colaboradores"
  ON public.colaboradores FOR UPDATE
  TO authenticated
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can delete colaboradores"
  ON public.colaboradores FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TABELAS EXCLUSIVAS ADMIN
-- =====================================================

-- PLANTAS: Apenas admin
CREATE POLICY "Admins can read plantas"
  ON public.plantas FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert plantas"
  ON public.plantas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plantas"
  ON public.plantas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plantas"
  ON public.plantas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- INSUMOS: Apenas admin
CREATE POLICY "Admins can read insumos"
  ON public.insumos FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert insumos"
  ON public.insumos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update insumos"
  ON public.insumos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete insumos"
  ON public.insumos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- FORNECEDORES: Apenas admin
CREATE POLICY "Admins can read fornecedores"
  ON public.fornecedores FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert fornecedores"
  ON public.fornecedores FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fornecedores"
  ON public.fornecedores FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fornecedores"
  ON public.fornecedores FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- PROPOSTAS: Apenas admin (contém valores financeiros)
CREATE POLICY "Admins can read propostas"
  ON public.propostas FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert propostas"
  ON public.propostas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update propostas"
  ON public.propostas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete propostas"
  ON public.propostas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- MAQUINAS: Apenas admin
CREATE POLICY "Admins can read maquinas"
  ON public.maquinas FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert maquinas"
  ON public.maquinas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update maquinas"
  ON public.maquinas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete maquinas"
  ON public.maquinas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- ENTREGAS_COLABORADOR: Apenas admin
CREATE POLICY "Admins can read entregas_colaborador"
  ON public.entregas_colaborador FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert entregas_colaborador"
  ON public.entregas_colaborador FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update entregas_colaborador"
  ON public.entregas_colaborador FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete entregas_colaborador"
  ON public.entregas_colaborador FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TABELAS DE CONFIGURAÇÃO (Admin apenas)
-- =====================================================

-- AREAS: Apenas admin
CREATE POLICY "Admins can read areas"
  ON public.areas FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert areas"
  ON public.areas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update areas"
  ON public.areas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete areas"
  ON public.areas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- CATEGORIAS_PLANTAS: Apenas admin
CREATE POLICY "Admins can read categorias_plantas"
  ON public.categorias_plantas FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert categorias_plantas"
  ON public.categorias_plantas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categorias_plantas"
  ON public.categorias_plantas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categorias_plantas"
  ON public.categorias_plantas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- CATEGORIAS_SERVICO: Apenas admin
CREATE POLICY "Admins can read categorias_servico"
  ON public.categorias_servico FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert categorias_servico"
  ON public.categorias_servico FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categorias_servico"
  ON public.categorias_servico FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categorias_servico"
  ON public.categorias_servico FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- CORRIGIR FUNÇÃO SEM SEARCH_PATH
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
