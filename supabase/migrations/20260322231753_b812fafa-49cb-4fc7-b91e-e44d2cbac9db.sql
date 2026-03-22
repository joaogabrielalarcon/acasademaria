
-- Add new columns to locais_cliente
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS tipo_pessoa text NOT NULL DEFAULT 'fisica' CHECK (tipo_pessoa IN ('fisica', 'juridica'));
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS data_aniversario date;
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS inscricao_estadual text;
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS contato_principal text;
ALTER TABLE public.locais_cliente ADD COLUMN IF NOT EXISTS email text;
