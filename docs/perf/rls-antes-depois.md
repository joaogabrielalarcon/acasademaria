# Regras de acesso: antes e depois

Troca só a forma de chamar (avaliada uma vez por consulta). Resultado por papel conferido igual.

### clientes · Admins can delete clientes (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### clientes · Field roles can read linked manutencao clientes (SELECT)
- antes: `(has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role]) AND can_access_manutencao_client(auth.uid(), id))`
- depois: `((SELECT public.has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])) AND can_access_manutencao_client((SELECT auth.uid()), id))`

### clientes · Managers can insert clientes (INSERT)
- antes: `` / check: `is_manager_or_admin(auth.uid())`
- depois: `` / check: `(SELECT public.is_manager_or_admin(auth.uid()))`

### clientes · Managers can read clientes (SELECT)
- antes: `is_manager_or_admin(auth.uid())`
- depois: `(SELECT public.is_manager_or_admin(auth.uid()))`

### clientes · Managers can update clientes (UPDATE)
- antes: `is_manager_or_admin(auth.uid())`
- depois: `(SELECT public.is_manager_or_admin(auth.uid()))`

### colaboradores · Admins can delete colaboradores (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### colaboradores · Managers can insert colaboradores (INSERT)
- antes: `` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### colaboradores · Managers can read all colaboradores data (SELECT)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]))`

### colaboradores · Managers can update colaboradores (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### colaboradores · Users can read own colaborador data (SELECT)
- antes: `(user_id = auth.uid())`
- depois: `(user_id = (SELECT auth.uid()))`

### fornecedores · Admins can delete fornecedores (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### fornecedores · Admins can insert fornecedores (INSERT)
- antes: `` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### fornecedores · Admins can update fornecedores (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### historico_precos · Admin can delete historico_precos (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### historico_precos · Admin can update historico_precos (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### historico_precos · historico_precos_insert_orcamento_team (INSERT)
- antes: `` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role])`
- depois: `` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role]))`

### historico_precos · historico_precos_select_orcamento_team (SELECT)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role]))`

### insumos · Admins can delete insumos (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### insumos · Admins can insert insumos (INSERT)
- antes: `` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### insumos · Admins can update insumos (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### orcamento_itens · orcamento_itens_full_access (ALL)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role])` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role]))` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role, 'arquitetura'::user_role]))`

### plantas · Admins can delete plantas (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### plantas · Admins can insert plantas (INSERT)
- antes: `` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### plantas · Admins can update plantas (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### projetos · Admins can delete projetos (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### projetos · Admins can insert projetos (INSERT)
- antes: `` / check: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `` / check: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### projetos · Admins can update projetos (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]))`

### projetos · Field roles can read manutencao projetos (SELECT)
- antes: `((tipo = 'manutencao'::text) AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role]) AND is_allocated_to_project(auth.uid(), id))`
- depois: `((tipo = 'manutencao'::text) AND (SELECT public.has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])) AND is_allocated_to_project((SELECT auth.uid()), id))`

### projetos · Managers can read projetos (SELECT)
- antes: `(has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), id)))`
- depois: `((SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role])) OR ((SELECT public.has_role(auth.uid(), 'responsavel_obra'::user_role)) AND is_allocated_to_project((SELECT auth.uid()), id)))`

### registros · Admins can delete registros (DELETE)
- antes: `has_role(auth.uid(), 'admin'::user_role)`
- depois: `(SELECT public.has_role(auth.uid(), 'admin'::user_role))`

### registros · Authenticated can read registros (SELECT)
- antes: `(has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (is_allocated_to_project(auth.uid(), projeto_id) OR (get_colaborador_id(auth.uid()) = ANY (executores_ids)) OR (get_colaborador_id(auth.uid()) = ANY (equipe_presente_ids)))))`
- depois: `((SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role])) OR ((SELECT public.has_role(auth.uid(), 'responsavel_obra'::user_role)) AND (is_allocated_to_project((SELECT auth.uid()), projeto_id) OR (get_colaborador_id((SELECT auth.uid())) = ANY (executores_ids)) OR (get_colaborador_id((SELECT auth.uid())) = ANY (equipe_presente_ids)))))`

### registros · Field roles can insert manutencao registros (INSERT)
- antes: `` / check: `((tipo = 'manutencao'::text) AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role]) AND is_allocated_to_project(auth.uid(), projeto_id))`
- depois: `` / check: `((tipo = 'manutencao'::text) AND (SELECT public.has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])) AND is_allocated_to_project((SELECT auth.uid()), projeto_id))`

### registros · Field roles can read manutencao registros (SELECT)
- antes: `((tipo = 'manutencao'::text) AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role]) AND is_allocated_to_project(auth.uid(), projeto_id))`
- depois: `((tipo = 'manutencao'::text) AND (SELECT public.has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])) AND is_allocated_to_project((SELECT auth.uid()), projeto_id))`

### registros · Field roles can update own manutencao registros (UPDATE)
- antes: `((tipo = 'manutencao'::text) AND (created_by = auth.uid()) AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role]) AND is_allocated_to_project(auth.uid(), projeto_id))` / check: `((tipo = 'manutencao'::text) AND (created_by = auth.uid()) AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role]) AND is_allocated_to_project(auth.uid(), projeto_id))`
- depois: `((tipo = 'manutencao'::text) AND (created_by = (SELECT auth.uid())) AND (SELECT public.has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])) AND is_allocated_to_project((SELECT auth.uid()), projeto_id))` / check: `((tipo = 'manutencao'::text) AND (created_by = (SELECT auth.uid())) AND (SELECT public.has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])) AND is_allocated_to_project((SELECT auth.uid()), projeto_id))`

### registros · Managers can insert registros (INSERT)
- antes: `` / check: `(has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (is_allocated_to_project(auth.uid(), projeto_id) OR (get_colaborador_id(auth.uid()) = ANY (executores_ids)))))`
- depois: `` / check: `((SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role])) OR ((SELECT public.has_role(auth.uid(), 'responsavel_obra'::user_role)) AND (is_allocated_to_project((SELECT auth.uid()), projeto_id) OR (get_colaborador_id((SELECT auth.uid())) = ANY (executores_ids)))))`

### registros · Managers can update registros (UPDATE)
- antes: `has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role])`
- depois: `(SELECT public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]))`
