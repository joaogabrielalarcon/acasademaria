
-- Add projeto_id to registros table for linking records to projects
ALTER TABLE public.registros 
ADD COLUMN projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_registros_projeto_id ON public.registros(projeto_id);

-- Create a table for project comments
CREATE TABLE public.projeto_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projeto_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS for comments
CREATE POLICY "Managers can read projeto_comentarios"
ON public.projeto_comentarios FOR SELECT TO authenticated
USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can insert projeto_comentarios"
ON public.projeto_comentarios FOR INSERT TO authenticated
WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Users can update own comments"
ON public.projeto_comentarios FOR UPDATE TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Admins can delete projeto_comentarios"
ON public.projeto_comentarios FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin') OR usuario_id = auth.uid());

-- Create a table for project files/attachments
CREATE TABLE public.projeto_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  tipo text DEFAULT 'documento',
  tamanho bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projeto_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read projeto_arquivos"
ON public.projeto_arquivos FOR SELECT TO authenticated
USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can insert projeto_arquivos"
ON public.projeto_arquivos FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete projeto_arquivos"
ON public.projeto_arquivos FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('projeto-arquivos', 'projeto-arquivos', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'projeto-arquivos');

CREATE POLICY "Authenticated users can read project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'projeto-arquivos');

CREATE POLICY "Admins can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'projeto-arquivos' AND has_role(auth.uid(), 'admin'));
