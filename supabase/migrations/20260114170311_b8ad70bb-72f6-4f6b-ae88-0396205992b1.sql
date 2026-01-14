-- Adicionar campos de autenticação na tabela colaboradores
ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Criar índice para username
CREATE INDEX IF NOT EXISTS idx_colaboradores_username ON public.colaboradores(username);

-- Função para verificar se colaborador está ativo pelo user_id
CREATE OR REPLACE FUNCTION public.is_colaborador_ativo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.colaboradores
    WHERE user_id = _user_id
      AND ativo = true
  )
$$;

-- Função para verificar se usuário pode gerenciar outros usuários (admin ou gestor)
CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gestor')
  )
$$;

-- Função para buscar user_id pelo username
CREATE OR REPLACE FUNCTION public.get_user_id_by_username(_username text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.colaboradores
  WHERE username = LOWER(_username)
    AND ativo = true
    AND user_id IS NOT NULL
  LIMIT 1
$$;