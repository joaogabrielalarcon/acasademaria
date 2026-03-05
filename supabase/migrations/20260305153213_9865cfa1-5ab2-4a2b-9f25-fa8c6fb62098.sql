-- Helper for diary access control
CREATE OR REPLACE FUNCTION public.can_access_diario_project(_user_id uuid, _projeto_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_any_role(
      _user_id,
      ARRAY[
        'admin'::user_role,
        'administrativo'::user_role,
        'gestao_campo'::user_role,
        'arquitetura'::user_role
      ]
    )
    OR (
      public.has_any_role(_user_id, ARRAY['responsavel_obra'::user_role, 'operador_campo'::user_role])
      AND public.is_allocated_to_project(_user_id, _projeto_id)
    )
  );
$$;

-- Adapt existing diary table if it already exists
ALTER TABLE IF EXISTS public.diario_visitas
  ADD COLUMN IF NOT EXISTS hora_inicio time,
  ADD COLUMN IF NOT EXISTS hora_fim time,
  ADD COLUMN IF NOT EXISTS periodo text,
  ADD COLUMN IF NOT EXISTS status_geral text,
  ADD COLUMN IF NOT EXISTS observacoes_internas text,
  ADD COLUMN IF NOT EXISTS registrado_por_nome text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS public.diario_visitas
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'diario_visitas'
      AND column_name = 'periodo'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'diario_visitas_periodo_check'
  ) THEN
    ALTER TABLE public.diario_visitas
      ADD CONSTRAINT diario_visitas_periodo_check
      CHECK (periodo IS NULL OR periodo IN ('dia_inteiro', 'manha', 'tarde', 'horario_especifico'));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'diario_visitas'
      AND column_name = 'status_geral'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'diario_visitas_status_geral_check'
  ) THEN
    ALTER TABLE public.diario_visitas
      ADD CONSTRAINT diario_visitas_status_geral_check
      CHECK (status_geral IS NULL OR status_geral IN ('otimo', 'bom', 'requer_atencao', 'critico'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.diario_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  data_visita date NOT NULL,
  hora_inicio time,
  hora_fim time,
  periodo text CHECK (periodo IS NULL OR periodo IN ('dia_inteiro', 'manha', 'tarde', 'horario_especifico')),
  status_geral text CHECK (status_geral IS NULL OR status_geral IN ('otimo', 'bom', 'requer_atencao', 'critico')),
  observacoes_internas text,
  registrado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.diario_visitas(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome_area text NOT NULL,
  servicos text[],
  status_area text CHECK (status_area IS NULL OR status_area IN ('otimo', 'bom', 'requer_atencao', 'critico')),
  status_anterior text,
  houve_melhora boolean NOT NULL DEFAULT false,
  relato text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_equipe_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.diario_areas(id) ON DELETE CASCADE,
  visita_id uuid NOT NULL REFERENCES public.diario_visitas(id) ON DELETE CASCADE,
  colaborador_id uuid REFERENCES public.colaboradores(id),
  colaborador_nome text NOT NULL,
  funcao text,
  descricao_atividade text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_insumos_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.diario_areas(id) ON DELETE CASCADE,
  visita_id uuid NOT NULL REFERENCES public.diario_visitas(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES public.insumos(id),
  insumo_nome text NOT NULL,
  quantidade text,
  unidade text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_maquinas_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.diario_areas(id) ON DELETE CASCADE,
  visita_id uuid NOT NULL REFERENCES public.diario_visitas(id) ON DELETE CASCADE,
  maquina_id uuid REFERENCES public.maquinas(id),
  maquina_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_midia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.diario_visitas(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.diario_areas(id) ON DELETE CASCADE,
  tipo text CHECK (tipo IS NULL OR tipo IN ('foto', 'video')),
  url text NOT NULL,
  thumbnail_url text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.diario_visitas(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz,
  resolvido_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diario_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo_entrega text CHECK (tipo_entrega IS NULL OR tipo_entrega IN ('material', 'ferramenta', 'insumo')),
  descricao text NOT NULL,
  itens jsonb,
  recebido_por text,
  data_entrega date NOT NULL,
  hora_entrega time,
  observacoes text,
  registrado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_feed_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  dados jsonb,
  usuario_nome text,
  visivel_cliente boolean NOT NULL DEFAULT false,
  referencia_id uuid,
  referencia_tipo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diario_visitas_projeto ON public.diario_visitas(projeto_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_diario_visitas_cliente ON public.diario_visitas(cliente_id, data_visita DESC);
CREATE INDEX IF NOT EXISTS idx_diario_areas_visita ON public.diario_areas(visita_id);
CREATE INDEX IF NOT EXISTS idx_diario_alertas_pendentes ON public.diario_alertas(resolvido, projeto_id);
CREATE INDEX IF NOT EXISTS idx_diario_maquinas_id ON public.diario_maquinas_area(maquina_id, visita_id);
CREATE INDEX IF NOT EXISTS idx_diario_equipe_colab ON public.diario_equipe_area(colaborador_id, visita_id);
CREATE INDEX IF NOT EXISTS idx_feed_cliente ON public.cliente_feed_eventos(cliente_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.diario_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_equipe_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_insumos_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_maquinas_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_midia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_feed_eventos ENABLE ROW LEVEL SECURITY;

-- Policies: diario_visitas
DROP POLICY IF EXISTS "Users can read diario_visitas" ON public.diario_visitas;
CREATE POLICY "Users can read diario_visitas"
ON public.diario_visitas
FOR SELECT
USING (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Users can insert diario_visitas" ON public.diario_visitas;
CREATE POLICY "Users can insert diario_visitas"
ON public.diario_visitas
FOR INSERT
WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Users can update diario_visitas" ON public.diario_visitas;
CREATE POLICY "Users can update diario_visitas"
ON public.diario_visitas
FOR UPDATE
USING (public.can_access_diario_project(auth.uid(), projeto_id))
WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Admins can delete diario_visitas" ON public.diario_visitas;
CREATE POLICY "Admins can delete diario_visitas"
ON public.diario_visitas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_areas
DROP POLICY IF EXISTS "Users can read diario_areas" ON public.diario_areas;
CREATE POLICY "Users can read diario_areas"
ON public.diario_areas
FOR SELECT
USING (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Users can insert diario_areas" ON public.diario_areas;
CREATE POLICY "Users can insert diario_areas"
ON public.diario_areas
FOR INSERT
WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Users can update diario_areas" ON public.diario_areas;
CREATE POLICY "Users can update diario_areas"
ON public.diario_areas
FOR UPDATE
USING (public.can_access_diario_project(auth.uid(), projeto_id))
WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Admins can delete diario_areas" ON public.diario_areas;
CREATE POLICY "Admins can delete diario_areas"
ON public.diario_areas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_equipe_area
DROP POLICY IF EXISTS "Users can read diario_equipe_area" ON public.diario_equipe_area;
CREATE POLICY "Users can read diario_equipe_area"
ON public.diario_equipe_area
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can insert diario_equipe_area" ON public.diario_equipe_area;
CREATE POLICY "Users can insert diario_equipe_area"
ON public.diario_equipe_area
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can update diario_equipe_area" ON public.diario_equipe_area;
CREATE POLICY "Users can update diario_equipe_area"
ON public.diario_equipe_area
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Admins can delete diario_equipe_area" ON public.diario_equipe_area;
CREATE POLICY "Admins can delete diario_equipe_area"
ON public.diario_equipe_area
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_insumos_area
DROP POLICY IF EXISTS "Users can read diario_insumos_area" ON public.diario_insumos_area;
CREATE POLICY "Users can read diario_insumos_area"
ON public.diario_insumos_area
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can insert diario_insumos_area" ON public.diario_insumos_area;
CREATE POLICY "Users can insert diario_insumos_area"
ON public.diario_insumos_area
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can update diario_insumos_area" ON public.diario_insumos_area;
CREATE POLICY "Users can update diario_insumos_area"
ON public.diario_insumos_area
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Admins can delete diario_insumos_area" ON public.diario_insumos_area;
CREATE POLICY "Admins can delete diario_insumos_area"
ON public.diario_insumos_area
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_maquinas_area
DROP POLICY IF EXISTS "Users can read diario_maquinas_area" ON public.diario_maquinas_area;
CREATE POLICY "Users can read diario_maquinas_area"
ON public.diario_maquinas_area
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can insert diario_maquinas_area" ON public.diario_maquinas_area;
CREATE POLICY "Users can insert diario_maquinas_area"
ON public.diario_maquinas_area
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can update diario_maquinas_area" ON public.diario_maquinas_area;
CREATE POLICY "Users can update diario_maquinas_area"
ON public.diario_maquinas_area
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Admins can delete diario_maquinas_area" ON public.diario_maquinas_area;
CREATE POLICY "Admins can delete diario_maquinas_area"
ON public.diario_maquinas_area
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_midia
DROP POLICY IF EXISTS "Users can read diario_midia" ON public.diario_midia;
CREATE POLICY "Users can read diario_midia"
ON public.diario_midia
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can insert diario_midia" ON public.diario_midia;
CREATE POLICY "Users can insert diario_midia"
ON public.diario_midia
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Users can update diario_midia" ON public.diario_midia;
CREATE POLICY "Users can update diario_midia"
ON public.diario_midia
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.diario_visitas dv
    WHERE dv.id = visita_id
      AND public.can_access_diario_project(auth.uid(), dv.projeto_id)
  )
);

DROP POLICY IF EXISTS "Admins can delete diario_midia" ON public.diario_midia;
CREATE POLICY "Admins can delete diario_midia"
ON public.diario_midia
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_alertas
DROP POLICY IF EXISTS "Users can read diario_alertas" ON public.diario_alertas;
CREATE POLICY "Users can read diario_alertas"
ON public.diario_alertas
FOR SELECT
USING (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Users can insert diario_alertas" ON public.diario_alertas;
CREATE POLICY "Users can insert diario_alertas"
ON public.diario_alertas
FOR INSERT
WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Users can update diario_alertas" ON public.diario_alertas;
CREATE POLICY "Users can update diario_alertas"
ON public.diario_alertas
FOR UPDATE
USING (public.can_access_diario_project(auth.uid(), projeto_id))
WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

DROP POLICY IF EXISTS "Admins can delete diario_alertas" ON public.diario_alertas;
CREATE POLICY "Admins can delete diario_alertas"
ON public.diario_alertas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: diario_entregas
DROP POLICY IF EXISTS "Users can read diario_entregas" ON public.diario_entregas;
CREATE POLICY "Users can read diario_entregas"
ON public.diario_entregas
FOR SELECT
USING (
  projeto_id IS NULL
  OR public.can_access_diario_project(auth.uid(), projeto_id)
);

DROP POLICY IF EXISTS "Users can insert diario_entregas" ON public.diario_entregas;
CREATE POLICY "Users can insert diario_entregas"
ON public.diario_entregas
FOR INSERT
WITH CHECK (
  projeto_id IS NULL
  OR public.can_access_diario_project(auth.uid(), projeto_id)
);

DROP POLICY IF EXISTS "Users can update diario_entregas" ON public.diario_entregas;
CREATE POLICY "Users can update diario_entregas"
ON public.diario_entregas
FOR UPDATE
USING (
  projeto_id IS NULL
  OR public.can_access_diario_project(auth.uid(), projeto_id)
)
WITH CHECK (
  projeto_id IS NULL
  OR public.can_access_diario_project(auth.uid(), projeto_id)
);

DROP POLICY IF EXISTS "Admins can delete diario_entregas" ON public.diario_entregas;
CREATE POLICY "Admins can delete diario_entregas"
ON public.diario_entregas
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Policies: cliente_feed_eventos
DROP POLICY IF EXISTS "Users can read cliente_feed_eventos" ON public.cliente_feed_eventos;
CREATE POLICY "Users can read cliente_feed_eventos"
ON public.cliente_feed_eventos
FOR SELECT
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'admin'::user_role,
      'administrativo'::user_role,
      'gestao_campo'::user_role,
      'arquitetura'::user_role
    ]
  )
  OR EXISTS (
    SELECT 1
    FROM public.projetos p
    WHERE p.cliente_id = cliente_feed_eventos.cliente_id
      AND public.can_access_diario_project(auth.uid(), p.id)
  )
);

DROP POLICY IF EXISTS "Users can insert cliente_feed_eventos" ON public.cliente_feed_eventos;
CREATE POLICY "Users can insert cliente_feed_eventos"
ON public.cliente_feed_eventos
FOR INSERT
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'admin'::user_role,
      'administrativo'::user_role,
      'gestao_campo'::user_role,
      'arquitetura'::user_role,
      'responsavel_obra'::user_role,
      'operador_campo'::user_role
    ]
  )
);

DROP POLICY IF EXISTS "Users can update cliente_feed_eventos" ON public.cliente_feed_eventos;
CREATE POLICY "Users can update cliente_feed_eventos"
ON public.cliente_feed_eventos
FOR UPDATE
USING (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'admin'::user_role,
      'administrativo'::user_role,
      'gestao_campo'::user_role,
      'arquitetura'::user_role
    ]
  )
)
WITH CHECK (
  public.has_any_role(
    auth.uid(),
    ARRAY[
      'admin'::user_role,
      'administrativo'::user_role,
      'gestao_campo'::user_role,
      'arquitetura'::user_role
    ]
  )
);

DROP POLICY IF EXISTS "Admins can delete cliente_feed_eventos" ON public.cliente_feed_eventos;
CREATE POLICY "Admins can delete cliente_feed_eventos"
ON public.cliente_feed_eventos
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));