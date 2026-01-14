-- =========================================
-- PARTE 1: ADICIONAR CAMPOS DE AUDITORIA
-- =========================================

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.registros 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.diarias 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.trechos 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.plantas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.insumos 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.maquinas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- =========================================
-- PARTE 2: FUNÇÃO DE AUDITORIA AUTOMÁTICA
-- =========================================

CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================
-- PARTE 3: TRIGGERS DE AUDITORIA
-- =========================================

DROP TRIGGER IF EXISTS set_audit_clientes ON public.clientes;
CREATE TRIGGER set_audit_clientes
  BEFORE INSERT OR UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_colaboradores ON public.colaboradores;
CREATE TRIGGER set_audit_colaboradores
  BEFORE INSERT OR UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_propostas ON public.propostas;
CREATE TRIGGER set_audit_propostas
  BEFORE INSERT OR UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_registros ON public.registros;
CREATE TRIGGER set_audit_registros
  BEFORE INSERT OR UPDATE ON public.registros
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_diarias ON public.diarias;
CREATE TRIGGER set_audit_diarias
  BEFORE INSERT OR UPDATE ON public.diarias
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_trechos ON public.trechos;
CREATE TRIGGER set_audit_trechos
  BEFORE INSERT OR UPDATE ON public.trechos
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_plantas ON public.plantas;
CREATE TRIGGER set_audit_plantas
  BEFORE INSERT OR UPDATE ON public.plantas
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_insumos ON public.insumos;
CREATE TRIGGER set_audit_insumos
  BEFORE INSERT OR UPDATE ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_fornecedores ON public.fornecedores;
CREATE TRIGGER set_audit_fornecedores
  BEFORE INSERT OR UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

DROP TRIGGER IF EXISTS set_audit_maquinas ON public.maquinas;
CREATE TRIGGER set_audit_maquinas
  BEFORE INSERT OR UPDATE ON public.maquinas
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- =========================================
-- PARTE 4: ATUALIZAR POLÍTICAS RLS
-- =========================================

-- CLIENTES: Restringir a gestores/admins
DROP POLICY IF EXISTS "Authenticated users can read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;

CREATE POLICY "Managers can read clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can insert clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- DIARIAS: Leitura para todos, escrita para gestores
DROP POLICY IF EXISTS "Authenticated users can read diarias" ON public.diarias;
DROP POLICY IF EXISTS "Authenticated users can insert diarias" ON public.diarias;
DROP POLICY IF EXISTS "Authenticated users can update diarias" ON public.diarias;

CREATE POLICY "Authenticated can read diarias" ON public.diarias
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert diarias" ON public.diarias
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update diarias" ON public.diarias
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- REGISTROS: Leitura para todos, escrita para gestores
DROP POLICY IF EXISTS "Authenticated users can read registros" ON public.registros;
DROP POLICY IF EXISTS "Authenticated users can insert registros" ON public.registros;
DROP POLICY IF EXISTS "Authenticated users can update registros" ON public.registros;

CREATE POLICY "Authenticated can read registros" ON public.registros
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert registros" ON public.registros
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update registros" ON public.registros
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- TRECHOS: Leitura para todos, escrita para gestores
DROP POLICY IF EXISTS "Authenticated users can read trechos" ON public.trechos;
DROP POLICY IF EXISTS "Authenticated users can insert trechos" ON public.trechos;
DROP POLICY IF EXISTS "Authenticated users can update trechos" ON public.trechos;

CREATE POLICY "Authenticated can read trechos" ON public.trechos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert trechos" ON public.trechos
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update trechos" ON public.trechos
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- REGISTRO_INSUMOS: Leitura para todos, escrita para gestores
DROP POLICY IF EXISTS "Authenticated users can read registro_insumos" ON public.registro_insumos;
DROP POLICY IF EXISTS "Authenticated users can insert registro_insumos" ON public.registro_insumos;
DROP POLICY IF EXISTS "Authenticated users can update registro_insumos" ON public.registro_insumos;

CREATE POLICY "Authenticated can read registro_insumos" ON public.registro_insumos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert registro_insumos" ON public.registro_insumos
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update registro_insumos" ON public.registro_insumos
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- REGISTRO_MAQUINAS: Leitura para todos, escrita para gestores
DROP POLICY IF EXISTS "Authenticated users can read registro_maquinas" ON public.registro_maquinas;
DROP POLICY IF EXISTS "Authenticated users can insert registro_maquinas" ON public.registro_maquinas;
DROP POLICY IF EXISTS "Authenticated users can update registro_maquinas" ON public.registro_maquinas;

CREATE POLICY "Authenticated can read registro_maquinas" ON public.registro_maquinas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert registro_maquinas" ON public.registro_maquinas
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update registro_maquinas" ON public.registro_maquinas
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- RECEBIMENTO_ITENS: Leitura para todos, escrita para gestores
DROP POLICY IF EXISTS "Authenticated users can read recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Authenticated users can insert recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Authenticated users can update recebimento_itens" ON public.recebimento_itens;

CREATE POLICY "Authenticated can read recebimento_itens" ON public.recebimento_itens
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert recebimento_itens" ON public.recebimento_itens
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update recebimento_itens" ON public.recebimento_itens
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- REGISTROS_HISTORICO: Proteger completamente
DROP POLICY IF EXISTS "Allow insert to registros_historico" ON public.registros_historico;
DROP POLICY IF EXISTS "Allow read access to registros_historico" ON public.registros_historico;

CREATE POLICY "Managers can read registros_historico" ON public.registros_historico
  FOR SELECT TO authenticated
  USING (is_manager_or_admin(auth.uid()));