
-- 1. Add tipo column to projetos
ALTER TABLE public.projetos
  ADD COLUMN tipo text NOT NULL DEFAULT 'implantacao';

-- 2. Maintenance visit records
CREATE TABLE public.manutencao_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  data_visita date NOT NULL,
  equipe_ids uuid[] NOT NULL DEFAULT '{}',
  horas_trabalhadas numeric NOT NULL DEFAULT 0,
  horas_por_pessoa jsonb DEFAULT '[]',
  ocorrencias text,
  observacoes_internas text,
  midia jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

ALTER TABLE public.manutencao_visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read manutencao_visitas"
  ON public.manutencao_visitas FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))
  );

CREATE POLICY "Managers can insert manutencao_visitas"
  ON public.manutencao_visitas FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
    OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))
  );

CREATE POLICY "Managers can update manutencao_visitas"
  ON public.manutencao_visitas FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
  );

CREATE POLICY "Admins can delete manutencao_visitas"
  ON public.manutencao_visitas FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_manutencao_visitas_updated_at
  BEFORE UPDATE ON public.manutencao_visitas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for audit fields
CREATE TRIGGER set_manutencao_visitas_audit
  BEFORE INSERT OR UPDATE ON public.manutencao_visitas
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_fields();

-- 3. Services performed in each visit
CREATE TABLE public.manutencao_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.manutencao_visitas(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- poda_geral, poda_finos, poda_palmeiras, adubacao, irrigacao_verificacao, irrigacao_regulagem, irrigacao_reparo, limpeza, replantio, controle_fitossanitario, outro
  descricao text,
  quantidade numeric,
  unidade text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencao_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read manutencao_servicos"
  ON public.manutencao_servicos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_servicos.visita_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
        OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id))
      )
    )
  );

CREATE POLICY "Managers can insert manutencao_servicos"
  ON public.manutencao_servicos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_servicos.visita_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
        OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id))
      )
    )
  );

CREATE POLICY "Managers can update manutencao_servicos"
  ON public.manutencao_servicos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_servicos.visita_id
      AND has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
    )
  );

CREATE POLICY "Admins can delete manutencao_servicos"
  ON public.manutencao_servicos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_servicos.visita_id
      AND has_role(auth.uid(), 'admin'::user_role)
    )
  );

-- 4. Resources used in each visit (machines + supplies)
CREATE TABLE public.manutencao_recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid NOT NULL REFERENCES public.manutencao_visitas(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'maquina' or 'insumo'
  maquina_id uuid REFERENCES public.maquinas(id),
  insumo_id uuid REFERENCES public.insumos(id),
  quantidade numeric,
  unidade text,
  horas_uso numeric,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencao_recursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read manutencao_recursos"
  ON public.manutencao_recursos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_recursos.visita_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
        OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id))
      )
    )
  );

CREATE POLICY "Managers can insert manutencao_recursos"
  ON public.manutencao_recursos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_recursos.visita_id
      AND (
        has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
        OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id))
      )
    )
  );

CREATE POLICY "Managers can update manutencao_recursos"
  ON public.manutencao_recursos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_recursos.visita_id
      AND has_any_role(auth.uid(), ARRAY['admin','administrativo','gestao_campo']::user_role[])
    )
  );

CREATE POLICY "Admins can delete manutencao_recursos"
  ON public.manutencao_recursos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.manutencao_visitas v
      WHERE v.id = manutencao_recursos.visita_id
      AND has_role(auth.uid(), 'admin'::user_role)
    )
  );
