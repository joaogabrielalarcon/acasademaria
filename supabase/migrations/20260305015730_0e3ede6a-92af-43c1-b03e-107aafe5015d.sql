-- Permitir leitura de recursos necessários ao Diário para perfis de campo
CREATE POLICY "Field roles can read maquinas"
ON public.maquinas
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
);

CREATE POLICY "Field roles can read insumos"
ON public.insumos
FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
);

-- Permitir que perfis de campo registrem recursos em visitas de manutenção
CREATE POLICY "Field roles can read manutencao registro_insumos"
ON public.registro_insumos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_insumos.registro_id
      AND r.tipo = 'manutencao'
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
);

CREATE POLICY "Field roles can insert manutencao registro_insumos"
ON public.registro_insumos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_insumos.registro_id
      AND r.tipo = 'manutencao'
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
);

CREATE POLICY "Field roles can update own manutencao registro_insumos"
ON public.registro_insumos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_insumos.registro_id
      AND r.tipo = 'manutencao'
      AND r.created_by = auth.uid()
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_insumos.registro_id
      AND r.tipo = 'manutencao'
      AND r.created_by = auth.uid()
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
);

CREATE POLICY "Field roles can read manutencao registro_maquinas"
ON public.registro_maquinas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_maquinas.registro_id
      AND r.tipo = 'manutencao'
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
);

CREATE POLICY "Field roles can insert manutencao registro_maquinas"
ON public.registro_maquinas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_maquinas.registro_id
      AND r.tipo = 'manutencao'
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
);

CREATE POLICY "Field roles can update own manutencao registro_maquinas"
ON public.registro_maquinas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_maquinas.registro_id
      AND r.tipo = 'manutencao'
      AND r.created_by = auth.uid()
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.registros r
    WHERE r.id = registro_maquinas.registro_id
      AND r.tipo = 'manutencao'
      AND r.created_by = auth.uid()
      AND has_any_role(auth.uid(), ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND is_allocated_to_project(auth.uid(), r.projeto_id)
  )
);