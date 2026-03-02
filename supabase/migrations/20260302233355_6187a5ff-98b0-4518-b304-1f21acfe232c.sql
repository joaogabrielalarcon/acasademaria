
-- Tabela para descritivo de mão de obra do projeto
CREATE TABLE public.projeto_mao_de_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  descricao text NOT NULL DEFAULT '',
  quantidade_funcionarios integer NOT NULL DEFAULT 1,
  dias_previstos integer NOT NULL DEFAULT 1,
  observacoes text,
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projeto_mao_de_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read projeto_mao_de_obra"
  ON public.projeto_mao_de_obra FOR SELECT
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can insert projeto_mao_de_obra"
  ON public.projeto_mao_de_obra FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update projeto_mao_de_obra"
  ON public.projeto_mao_de_obra FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete projeto_mao_de_obra"
  ON public.projeto_mao_de_obra FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
