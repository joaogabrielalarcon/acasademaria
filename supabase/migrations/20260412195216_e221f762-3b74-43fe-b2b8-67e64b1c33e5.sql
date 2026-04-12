
-- Table for deactivation history
CREATE TABLE public.colaborador_inativacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  data_inativacao date NOT NULL DEFAULT CURRENT_DATE,
  registrado_por uuid,
  registrado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colaborador_inativacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e adm podem ver inativacoes"
  ON public.colaborador_inativacoes FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin e adm podem criar inativacoes"
  ON public.colaborador_inativacoes FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin pode deletar inativacoes"
  ON public.colaborador_inativacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Table for evaluations/comments
CREATE TABLE public.colaborador_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  autor_id uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.colaborador_avaliacoes ENABLE ROW LEVEL SECURITY;

-- Helper function to check evaluation access
CREATE OR REPLACE FUNCTION public.can_access_avaliacao(p_user_id uuid, p_colaborador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin sees all
    has_role(p_user_id, 'admin'::user_role)
    OR
    -- Gestao campo: only field team collaborators
    (
      has_role(p_user_id, 'gestao_campo'::user_role)
      AND EXISTS (
        SELECT 1 FROM colaboradores c
        JOIN areas a ON a.id = c.area_id
        WHERE c.id = p_colaborador_id
        AND lower(a.nome) = 'campo'
      )
    )
    OR
    -- Administrativo: all except other administrativo members
    (
      has_role(p_user_id, 'administrativo'::user_role)
      AND NOT EXISTS (
        SELECT 1 FROM colaboradores c
        JOIN areas a ON a.id = c.area_id
        WHERE c.id = p_colaborador_id
        AND lower(a.nome) = 'administrativo'
      )
    )
$$;

CREATE POLICY "Users can read avaliacoes based on role"
  ON public.colaborador_avaliacoes FOR SELECT TO authenticated
  USING (can_access_avaliacao(auth.uid(), colaborador_id));

CREATE POLICY "Users can insert avaliacoes based on role"
  ON public.colaborador_avaliacoes FOR INSERT TO authenticated
  WITH CHECK (can_access_avaliacao(auth.uid(), colaborador_id));

CREATE POLICY "Admin pode deletar avaliacoes"
  ON public.colaborador_avaliacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));
