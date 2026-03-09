
-- Tabela de setores de irrigação
CREATE TABLE public.irrigacao_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao_area text,
  foto_url text,
  tempo_atual_minutos integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de histórico de irrigação
CREATE TABLE public.irrigacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.irrigacao_setores(id) ON DELETE CASCADE,
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  tempo_anterior_minutos integer,
  tempo_novo_minutos integer NOT NULL,
  origem text CHECK (origem IN ('Mafe', 'Manual')),
  colaborador_id uuid REFERENCES public.colaboradores(id),
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de correções/aprendizados da Mafe
CREATE TABLE public.mafe_correcoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  o_que_fez text NOT NULL,
  o_que_deveria_ter_feito text NOT NULL,
  contexto text,
  created_at timestamptz DEFAULT now()
);

-- RLS para irrigacao_setores
ALTER TABLE public.irrigacao_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read irrigacao_setores" ON public.irrigacao_setores
  FOR SELECT TO authenticated
  USING (public.can_access_diario_project(auth.uid(), projeto_id));

CREATE POLICY "Users can insert irrigacao_setores" ON public.irrigacao_setores
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

CREATE POLICY "Users can update irrigacao_setores" ON public.irrigacao_setores
  FOR UPDATE TO authenticated
  USING (public.can_access_diario_project(auth.uid(), projeto_id))
  WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

CREATE POLICY "Admins can delete irrigacao_setores" ON public.irrigacao_setores
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- RLS para irrigacao_historico
ALTER TABLE public.irrigacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read irrigacao_historico" ON public.irrigacao_historico
  FOR SELECT TO authenticated
  USING (public.can_access_diario_project(auth.uid(), projeto_id));

CREATE POLICY "Users can insert irrigacao_historico" ON public.irrigacao_historico
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_diario_project(auth.uid(), projeto_id));

-- RLS para mafe_correcoes_ia
ALTER TABLE public.mafe_correcoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read mafe_correcoes_ia" ON public.mafe_correcoes_ia
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert mafe_correcoes_ia" ON public.mafe_correcoes_ia
  FOR INSERT TO authenticated
  WITH CHECK (true);
