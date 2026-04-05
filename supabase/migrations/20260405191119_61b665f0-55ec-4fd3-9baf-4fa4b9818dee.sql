
-- Tabela assessor_tarefas
CREATE TABLE public.assessor_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  descricao text,
  prioridade text NOT NULL DEFAULT 'semana' CHECK (prioridade IN ('urgente', 'semana', 'mes')),
  prazo date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela assessor_dependencias
CREATE TABLE public.assessor_dependencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES public.assessor_tarefas(id) ON DELETE CASCADE NOT NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  descricao_entrega text NOT NULL,
  tempo_estimado_dias integer NOT NULL DEFAULT 1,
  status_entrega text NOT NULL DEFAULT 'pendente' CHECK (status_entrega IN ('pendente', 'entregue', 'atrasado')),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.assessor_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessor_dependencias ENABLE ROW LEVEL SECURITY;

-- Policy assessor_tarefas: usuário acessa suas próprias tarefas via colaborador.user_id
CREATE POLICY "Users manage own tasks" ON public.assessor_tarefas
  FOR ALL
  TO authenticated
  USING (usuario_id = public.get_colaborador_id(auth.uid()))
  WITH CHECK (usuario_id = public.get_colaborador_id(auth.uid()));

-- Policy assessor_dependencias: acesso via tarefa vinculada ao usuário
CREATE POLICY "Users manage deps of own tasks" ON public.assessor_dependencias
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessor_tarefas t
      WHERE t.id = tarefa_id
      AND t.usuario_id = public.get_colaborador_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessor_tarefas t
      WHERE t.id = tarefa_id
      AND t.usuario_id = public.get_colaborador_id(auth.uid())
    )
  );

-- Admins e gestão podem ver todas as tarefas
CREATE POLICY "Managers view all tasks" ON public.assessor_tarefas
  FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers view all deps" ON public.assessor_dependencias
  FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));
