
-- 1. DEMANDAS
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS local_id uuid NULL REFERENCES public.locais_cliente(id),
  ADD COLUMN IF NOT EXISTS projeto_id uuid NULL REFERENCES public.projetos(id),
  ADD COLUMN IF NOT EXISTS lado text NULL CHECK (lado IN ('nosso','terceiro','cliente')),
  ADD COLUMN IF NOT EXISTS registro_origem_id uuid NULL REFERENCES public.registros(id);

CREATE TABLE IF NOT EXISTS public.demanda_dependencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  depende_de_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demanda_id, depende_de_id),
  CHECK (demanda_id <> depende_de_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demanda_dependencias TO authenticated;
GRANT ALL ON public.demanda_dependencias TO service_role;
ALTER TABLE public.demanda_dependencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demanda_dependencias_select" ON public.demanda_dependencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "demanda_dependencias_insert" ON public.demanda_dependencias FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "demanda_dependencias_update" ON public.demanda_dependencias FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "demanda_dependencias_delete" ON public.demanda_dependencias FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role)
);

-- 2. PROJETOS
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS lider_responsavel_id uuid NULL REFERENCES public.colaboradores(id),
  ADD COLUMN IF NOT EXISTS usa_mao_de_obra_campo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escala_periodicidade text NULL CHECK (escala_periodicidade IN ('semanal','quinzenal','mensal','avulsa')),
  ADD COLUMN IF NOT EXISTS escala_dias_semana int[] NULL,
  ADD COLUMN IF NOT EXISTS escala_duracao_dias numeric NULL,
  ADD COLUMN IF NOT EXISTS escala_equipe_qtd int NULL;
UPDATE public.projetos SET usa_mao_de_obra_campo = true WHERE tipo IN ('manutencao','implantacao');

-- 3. CONDOMÍNIOS
CREATE TABLE IF NOT EXISTS public.condominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  regras_internas text,
  horario_entrada time,
  horario_saida time,
  contatos jsonb NOT NULL DEFAULT '[]'::jsonb,
  responsaveis_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condominios TO authenticated;
GRANT ALL ON public.condominios TO service_role;
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "condominios_select" ON public.condominios FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'gestor'::user_role) OR public.has_role(auth.uid(),'diretor'::user_role)
  OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
  OR public.has_role(auth.uid(),'operador_campo'::user_role)
);
CREATE POLICY "condominios_insert" ON public.condominios FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "condominios_update" ON public.condominios FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "condominios_delete" ON public.condominios FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role)
);

ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS condominio_id uuid NULL REFERENCES public.condominios(id);

CREATE TABLE IF NOT EXISTS public.colaborador_liberacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  condominio_id uuid NOT NULL REFERENCES public.condominios(id),
  data_emissao date,
  data_validade date,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','vencida','em_renovacao','cancelada')),
  documento_path text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, condominio_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_liberacoes TO authenticated;
GRANT ALL ON public.colaborador_liberacoes TO service_role;
ALTER TABLE public.colaborador_liberacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colaborador_liberacoes_select" ON public.colaborador_liberacoes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'gestor'::user_role) OR public.has_role(auth.uid(),'diretor'::user_role)
  OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "colaborador_liberacoes_insert" ON public.colaborador_liberacoes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "colaborador_liberacoes_update" ON public.colaborador_liberacoes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "colaborador_liberacoes_delete" ON public.colaborador_liberacoes FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role)
);

-- 4. APROVADORES
CREATE TABLE IF NOT EXISTS public.aprovadores_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_projeto text NOT NULL UNIQUE,
  papel_aprovador user_role NOT NULL,
  colaborador_id uuid NULL REFERENCES public.colaboradores(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprovadores_config TO authenticated;
GRANT ALL ON public.aprovadores_config TO service_role;
ALTER TABLE public.aprovadores_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aprovadores_config_select" ON public.aprovadores_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "aprovadores_config_insert" ON public.aprovadores_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "aprovadores_config_update" ON public.aprovadores_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::user_role));
CREATE POLICY "aprovadores_config_delete" ON public.aprovadores_config FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::user_role));

INSERT INTO public.aprovadores_config (tipo_projeto, papel_aprovador) VALUES
  ('manutencao','gestao_campo'::user_role),
  ('implantacao','responsavel_obra'::user_role)
ON CONFLICT (tipo_projeto) DO NOTHING;

-- 5. ESCALA
CREATE TABLE IF NOT EXISTS public.escala_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  projeto_id uuid NULL REFERENCES public.projetos(id),
  local_id uuid NULL REFERENCES public.locais_cliente(id),
  tipo text NOT NULL DEFAULT 'projeto' CHECK (tipo IN ('projeto','mao_de_obra_extra')),
  lider_id uuid NULL REFERENCES public.colaboradores(id),
  status text NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','confirmada','realizada','cancelada')),
  diaria_id uuid NULL REFERENCES public.diarias(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (projeto_id IS NOT NULL OR local_id IS NOT NULL),
  UNIQUE (data, colaborador_id, projeto_id, local_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_alocacoes TO authenticated;
GRANT ALL ON public.escala_alocacoes TO service_role;
ALTER TABLE public.escala_alocacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escala_alocacoes_select_mgmt" ON public.escala_alocacoes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'gestor'::user_role) OR public.has_role(auth.uid(),'diretor'::user_role)
  OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "escala_alocacoes_select_own" ON public.escala_alocacoes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'operador_campo'::user_role)
  AND colaborador_id IN (SELECT id FROM public.colaboradores WHERE user_id = auth.uid())
);
CREATE POLICY "escala_alocacoes_insert" ON public.escala_alocacoes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "escala_alocacoes_update" ON public.escala_alocacoes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "escala_alocacoes_delete" ON public.escala_alocacoes FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role)
);

-- 6. COLABORADORES
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS tamanho_luva text NULL,
  ADD COLUMN IF NOT EXISTS tipo_vinculo text NOT NULL DEFAULT 'interno' CHECK (tipo_vinculo IN ('interno','terceiro'));
UPDATE public.colaboradores SET tipo_vinculo = 'terceiro' WHERE area = 'terceiros';

CREATE TABLE IF NOT EXISTS public.colaborador_maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  maquina_id uuid NOT NULL REFERENCES public.maquinas(id),
  qualificacao text CHECK (qualificacao IN ('aprendiz','apto','instrutor')),
  desde date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, maquina_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaborador_maquinas TO authenticated;
GRANT ALL ON public.colaborador_maquinas TO service_role;
ALTER TABLE public.colaborador_maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colaborador_maquinas_select" ON public.colaborador_maquinas FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'gestor'::user_role) OR public.has_role(auth.uid(),'diretor'::user_role)
  OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "colaborador_maquinas_insert" ON public.colaborador_maquinas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "colaborador_maquinas_update" ON public.colaborador_maquinas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role) OR public.has_role(auth.uid(),'administrativo'::user_role) OR public.has_role(auth.uid(),'gestao_campo'::user_role)
);
CREATE POLICY "colaborador_maquinas_delete" ON public.colaborador_maquinas FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin'::user_role)
);

-- 7. REGISTROS
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS local_id uuid NULL REFERENCES public.locais_cliente(id);

-- 9. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_demandas_local_id ON public.demandas(local_id);
CREATE INDEX IF NOT EXISTS idx_demandas_projeto_id ON public.demandas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_escala_alocacoes_data ON public.escala_alocacoes(data);
CREATE INDEX IF NOT EXISTS idx_escala_alocacoes_colaborador ON public.escala_alocacoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_liberacoes_condominio ON public.colaborador_liberacoes(condominio_id);
CREATE INDEX IF NOT EXISTS idx_colaborador_liberacoes_validade ON public.colaborador_liberacoes(data_validade);
CREATE INDEX IF NOT EXISTS idx_locais_cliente_condominio ON public.locais_cliente(condominio_id);

-- updated_at triggers
CREATE TRIGGER trg_condominios_updated_at BEFORE UPDATE ON public.condominios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_colaborador_liberacoes_updated_at BEFORE UPDATE ON public.colaborador_liberacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_aprovadores_config_updated_at BEFORE UPDATE ON public.aprovadores_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_escala_alocacoes_updated_at BEFORE UPDATE ON public.escala_alocacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
