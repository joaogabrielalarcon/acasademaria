
-- ================================================
-- 1. MIGRATE EXISTING ROLE DATA
-- ================================================
UPDATE public.user_roles SET role = 'operador_campo' WHERE role = 'operador';
UPDATE public.user_roles SET role = 'gestao_campo' WHERE role = 'gestor';

-- ================================================
-- 2. ADD NEW COLUMNS
-- ================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_acesso timestamp with time zone;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS whatsapp text;

-- ================================================
-- 3. HELPER FUNCTIONS
-- ================================================
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_colaborador_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.colaboradores
  WHERE user_id = _user_id AND ativo = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_allocated_to_project(_user_id uuid, _projeto_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = _user_id AND c.ativo = true
    AND (
      EXISTS (
        SELECT 1 FROM public.projetos p
        WHERE p.id = _projeto_id AND p.responsavel_id = c.id
      )
      OR EXISTS (
        SELECT 1 FROM public.registros r
        WHERE r.projeto_id = _projeto_id
        AND (c.id = ANY(r.executores_ids) OR c.id = ANY(r.equipe_presente_ids))
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'administrativo', 'gestao_campo')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'administrativo')
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador_campo');
  RETURN NEW;
END;
$$;

-- ================================================
-- 4. UPDATE RLS POLICIES
-- ================================================

-- PROJETOS
ALTER POLICY "Admins can insert projetos" ON public.projetos
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update projetos" ON public.projetos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Managers can read projetos" ON public.projetos
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), id))
  );

-- ORCAMENTO_ITENS
ALTER POLICY "Admins can delete orcamento_itens" ON public.orcamento_itens
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert orcamento_itens" ON public.orcamento_itens
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update orcamento_itens" ON public.orcamento_itens
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Managers can read orcamento_itens" ON public.orcamento_itens
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- ORCAMENTO_COTACOES
ALTER POLICY "Admins can delete orcamento_cotacoes" ON public.orcamento_cotacoes
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert orcamento_cotacoes" ON public.orcamento_cotacoes
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update orcamento_cotacoes" ON public.orcamento_cotacoes
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Managers can read orcamento_cotacoes" ON public.orcamento_cotacoes
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- PROJETO_MAO_DE_OBRA
ALTER POLICY "Admins can delete projeto_mao_de_obra" ON public.projeto_mao_de_obra
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert projeto_mao_de_obra" ON public.projeto_mao_de_obra
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update projeto_mao_de_obra" ON public.projeto_mao_de_obra
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Managers can read projeto_mao_de_obra" ON public.projeto_mao_de_obra
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- COLABORADORES
ALTER POLICY "Managers can insert colaboradores" ON public.colaboradores
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Managers can read all colaboradores data" ON public.colaboradores
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Managers can update colaboradores" ON public.colaboradores
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- HISTORICO_SALARIOS
ALTER POLICY "Admins can insert historico_salarios" ON public.historico_salarios
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can read historico_salarios" ON public.historico_salarios
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- REGISTROS
ALTER POLICY "Authenticated can read registros" ON public.registros
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (
      has_role(auth.uid(), 'responsavel_obra'::user_role)
      AND (
        is_allocated_to_project(auth.uid(), projeto_id)
        OR get_colaborador_id(auth.uid()) = ANY(executores_ids)
        OR get_colaborador_id(auth.uid()) = ANY(equipe_presente_ids)
      )
    )
  );
ALTER POLICY "Managers can insert registros" ON public.registros
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (
      has_role(auth.uid(), 'responsavel_obra'::user_role)
      AND (
        is_allocated_to_project(auth.uid(), projeto_id)
        OR get_colaborador_id(auth.uid()) = ANY(executores_ids)
      )
    )
  );
ALTER POLICY "Managers can update registros" ON public.registros
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- REGISTRO_INSUMOS
ALTER POLICY "Authenticated can read registro_insumos" ON public.registro_insumos
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (
      has_role(auth.uid(), 'responsavel_obra'::user_role)
      AND EXISTS (SELECT 1 FROM public.registros r WHERE r.id = registro_id AND (is_allocated_to_project(auth.uid(), r.projeto_id) OR get_colaborador_id(auth.uid()) = ANY(r.executores_ids)))
    )
  );
ALTER POLICY "Managers can insert registro_insumos" ON public.registro_insumos
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND EXISTS (SELECT 1 FROM public.registros r WHERE r.id = registro_id AND is_allocated_to_project(auth.uid(), r.projeto_id)))
  );
ALTER POLICY "Managers can update registro_insumos" ON public.registro_insumos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- REGISTRO_MAQUINAS
ALTER POLICY "Authenticated can read registro_maquinas" ON public.registro_maquinas
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND EXISTS (SELECT 1 FROM public.registros r WHERE r.id = registro_id AND is_allocated_to_project(auth.uid(), r.projeto_id)))
  );
ALTER POLICY "Managers can insert registro_maquinas" ON public.registro_maquinas
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND EXISTS (SELECT 1 FROM public.registros r WHERE r.id = registro_id AND is_allocated_to_project(auth.uid(), r.projeto_id)))
  );
ALTER POLICY "Managers can update registro_maquinas" ON public.registro_maquinas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- RECEBIMENTO_ITENS
ALTER POLICY "Authenticated can read recebimento_itens" ON public.recebimento_itens
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND EXISTS (SELECT 1 FROM public.registros r WHERE r.id = registro_id AND is_allocated_to_project(auth.uid(), r.projeto_id)))
  );
ALTER POLICY "Managers can insert recebimento_itens" ON public.recebimento_itens
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND EXISTS (SELECT 1 FROM public.registros r WHERE r.id = registro_id AND is_allocated_to_project(auth.uid(), r.projeto_id)))
  );
ALTER POLICY "Managers can update recebimento_itens" ON public.recebimento_itens
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- DIARIAS
ALTER POLICY "Authenticated can read diarias" ON public.diarias
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND get_colaborador_id(auth.uid()) = ANY(equipe_presente_ids))
  );
ALTER POLICY "Managers can insert diarias" ON public.diarias
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[])
    OR has_role(auth.uid(), 'responsavel_obra'::user_role)
  );
ALTER POLICY "Managers can update diarias" ON public.diarias
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- CLIENTE_ATIVIDADES
ALTER POLICY "Admins can insert cliente_atividades" ON public.cliente_atividades
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[]));
ALTER POLICY "Managers can read cliente_atividades" ON public.cliente_atividades
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[]));

-- PROJETO_COMENTARIOS
ALTER POLICY "Managers can insert projeto_comentarios" ON public.projeto_comentarios
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))
  );
ALTER POLICY "Managers can read projeto_comentarios" ON public.projeto_comentarios
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))
  );

-- PROJETO_ARQUIVOS
ALTER POLICY "Admins can delete projeto_arquivos" ON public.projeto_arquivos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert projeto_arquivos" ON public.projeto_arquivos
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))
  );
ALTER POLICY "Managers can read projeto_arquivos" ON public.projeto_arquivos
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))
  );

-- FORNECEDORES
ALTER POLICY "Admins can read fornecedores" ON public.fornecedores
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Admins can insert fornecedores" ON public.fornecedores
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update fornecedores" ON public.fornecedores
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- INSUMOS
ALTER POLICY "Admins can read insumos" ON public.insumos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Admins can insert insumos" ON public.insumos
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update insumos" ON public.insumos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- MAQUINAS
ALTER POLICY "Admins can read maquinas" ON public.maquinas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Admins can insert maquinas" ON public.maquinas
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Admins can update maquinas" ON public.maquinas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- PLANTAS
ALTER POLICY "Admins can read plantas" ON public.plantas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'arquitetura']::user_role[]));
ALTER POLICY "Admins can insert plantas" ON public.plantas
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update plantas" ON public.plantas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- ENTREGAS_COLABORADOR
ALTER POLICY "Admins can read entregas_colaborador" ON public.entregas_colaborador
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Admins can insert entregas_colaborador" ON public.entregas_colaborador
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Admins can update entregas_colaborador" ON public.entregas_colaborador
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- CUSTOS_EQUIPE
ALTER POLICY "Admins can read custos_equipe" ON public.custos_equipe
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert custos_equipe" ON public.custos_equipe
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update custos_equipe" ON public.custos_equipe
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- PROFILES
ALTER POLICY "Admins can view all profiles" ON public.profiles
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- USER_ROLES
ALTER POLICY "Users can view own roles" ON public.user_roles
  USING (auth.uid() = user_id OR has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- MEMORIAL_DESCRITIVO
ALTER POLICY "Managers can read memorial_descritivo" ON public.memorial_descritivo
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura']::user_role[]));
ALTER POLICY "Admins can insert memorial_descritivo" ON public.memorial_descritivo
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'arquitetura']::user_role[]));
ALTER POLICY "Admins can update memorial_descritivo" ON public.memorial_descritivo
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'arquitetura']::user_role[]));

-- AREAS
ALTER POLICY "Admins can read areas" ON public.areas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- CATEGORIAS_PLANTAS
ALTER POLICY "Admins can read categorias_plantas" ON public.categorias_plantas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'arquitetura']::user_role[]));

-- CATEGORIAS_SERVICO
ALTER POLICY "Admins can read categorias_servico" ON public.categorias_servico
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- PROPOSTAS
ALTER POLICY "Admins can read propostas" ON public.propostas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert propostas" ON public.propostas
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update propostas" ON public.propostas
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- TRECHOS
ALTER POLICY "Authenticated can read trechos" ON public.trechos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura', 'responsavel_obra']::user_role[]));
ALTER POLICY "Managers can insert trechos" ON public.trechos
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Managers can update trechos" ON public.trechos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));

-- PROCESSOS
ALTER POLICY "Authenticated can read processos" ON public.processos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can insert processos" ON public.processos
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));
ALTER POLICY "Admins can update processos" ON public.processos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo']::user_role[]));

-- CALENDARIO_EVENTOS
ALTER POLICY "Authenticated can read calendario_eventos" ON public.calendario_eventos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo', 'arquitetura', 'responsavel_obra']::user_role[]));
ALTER POLICY "Managers can insert calendario_eventos" ON public.calendario_eventos
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
ALTER POLICY "Managers can update calendario_eventos" ON public.calendario_eventos
  USING (has_any_role(auth.uid(), ARRAY['admin', 'administrativo', 'gestao_campo']::user_role[]));
