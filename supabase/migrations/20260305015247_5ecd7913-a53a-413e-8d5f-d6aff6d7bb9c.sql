-- Garantir auditoria automática em registros para suportar edição do próprio registro
DROP TRIGGER IF EXISTS set_registros_audit_fields ON public.registros;
CREATE TRIGGER set_registros_audit_fields
BEFORE INSERT OR UPDATE ON public.registros
FOR EACH ROW
EXECUTE FUNCTION public.set_audit_fields();

-- Helper para permitir acesso ao cliente/trechos apenas quando houver projeto de manutenção acessível
CREATE OR REPLACE FUNCTION public.can_access_manutencao_client(_user_id uuid, _cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projetos p
    WHERE p.cliente_id = _cliente_id
      AND p.tipo = 'manutencao'
      AND (
        has_any_role(_user_id, ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role])
        OR (
          has_any_role(_user_id, ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
          AND is_allocated_to_project(_user_id, p.id)
        )
      )
  )
$$;

-- Projetos de manutenção visíveis para responsáveis de obra e operadores alocados
CREATE POLICY "Field roles can read manutencao projetos"
ON public.projetos
FOR SELECT
USING (
  tipo = 'manutencao'
  AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND is_allocated_to_project(auth.uid(), id)
);

-- Clientes vinculados a projetos de manutenção acessíveis
CREATE POLICY "Field roles can read linked manutencao clientes"
ON public.clientes
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND public.can_access_manutencao_client(auth.uid(), id)
);

-- Trechos vinculados a clientes de manutenção acessíveis
CREATE POLICY "Field roles can read linked manutencao trechos"
ON public.trechos
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND public.can_access_manutencao_client(auth.uid(), cliente_id)
);

-- Categorias de serviço legíveis pelos perfis de campo que usam o Diário
CREATE POLICY "Field roles can read categorias_servico"
ON public.categorias_servico
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
);

-- Leitura de registros de manutenção por perfis de campo alocados
CREATE POLICY "Field roles can read manutencao registros"
ON public.registros
FOR SELECT
USING (
  tipo = 'manutencao'
  AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND is_allocated_to_project(auth.uid(), projeto_id)
);

-- Criação de registros de manutenção por perfis de campo alocados
CREATE POLICY "Field roles can insert manutencao registros"
ON public.registros
FOR INSERT
WITH CHECK (
  tipo = 'manutencao'
  AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND is_allocated_to_project(auth.uid(), projeto_id)
);

-- Edição apenas do próprio registro de manutenção criado pelo usuário de campo
CREATE POLICY "Field roles can update own manutencao registros"
ON public.registros
FOR UPDATE
USING (
  tipo = 'manutencao'
  AND created_by = auth.uid()
  AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND is_allocated_to_project(auth.uid(), projeto_id)
)
WITH CHECK (
  tipo = 'manutencao'
  AND created_by = auth.uid()
  AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
  AND is_allocated_to_project(auth.uid(), projeto_id)
);