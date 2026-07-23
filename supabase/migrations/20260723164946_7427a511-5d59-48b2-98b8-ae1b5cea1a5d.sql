
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS nota_coordenacao text,
  ADD COLUMN IF NOT EXISTS nota_coordenacao_updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS nota_coordenacao_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_admissao date,
  ADD COLUMN IF NOT EXISTS cnh_validade date;

ALTER TABLE public.colaborador_documentos
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'outro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'colaborador_documentos_categoria_check'
  ) THEN
    ALTER TABLE public.colaborador_documentos
      ADD CONSTRAINT colaborador_documentos_categoria_check
      CHECK (categoria IN ('registro','cnh','atestado','declaracao','exame','liberacao','outro'));
  END IF;
END $$;
