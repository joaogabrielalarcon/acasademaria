
-- Table for editable memorial descritivo items
CREATE TABLE public.memorial_descritivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome_popular text NOT NULL DEFAULT '',
  nome_cientifico text DEFAULT '',
  porte text DEFAULT '',
  quantidade numeric NOT NULL DEFAULT 1,
  unidade text DEFAULT 'un',
  ordem integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.memorial_descritivo ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Managers can read memorial_descritivo"
  ON public.memorial_descritivo FOR SELECT TO authenticated
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can insert memorial_descritivo"
  ON public.memorial_descritivo FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update memorial_descritivo"
  ON public.memorial_descritivo FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete memorial_descritivo"
  ON public.memorial_descritivo FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
