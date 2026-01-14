-- ===========================================
-- SISTEMA DE AUTENTICAÇÃO E PERMISSÕES POR ÁREA
-- ===========================================

-- 1. Enum para níveis de permissão
CREATE TYPE public.user_role AS ENUM ('admin', 'gestor', 'operador');

-- 2. Tabela de Áreas
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#22c55e',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS para áreas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Política: todos podem ver áreas (para selects em formulários)
CREATE POLICY "Allow all access to areas" ON public.areas FOR ALL USING (true) WITH CHECK (true);

-- Inserir algumas áreas padrão
INSERT INTO public.areas (nome, descricao, cor, ordem) VALUES
  ('Gestão', 'Administração e gestão geral', '#8b5cf6', 1),
  ('Operações', 'Equipe de campo e operacional', '#22c55e', 2),
  ('Administrativo', 'Escritório e administrativo', '#3b82f6', 3),
  ('Comercial', 'Vendas e relacionamento', '#f59e0b', 4);

-- 3. Tabela de Perfis de Usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Roles de Usuário (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Função para verificar se usuário tem determinada role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Função para verificar se usuário é gestor ou admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
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

-- 7. Função para obter a área do usuário
CREATE OR REPLACE FUNCTION public.get_user_area(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- 8. Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = id);

-- 9. Políticas RLS para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 10. Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  
  -- Por padrão, novos usuários são operadores
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Trigger para atualizar updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Atualizar colaboradores para usar area_id em vez de texto
ALTER TABLE public.colaboradores 
  ADD COLUMN area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

-- Migrar dados existentes (se houver)
UPDATE public.colaboradores c
SET area_id = a.id
FROM public.areas a
WHERE LOWER(c.area) = LOWER(a.nome);

-- Comentário: manteremos a coluna 'area' por enquanto para compatibilidade