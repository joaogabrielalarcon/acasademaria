-- Fix 1: Create a view for colaboradores with limited fields for non-admin users
-- and update RLS policies to restrict sensitive data access

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read colaboradores" ON public.colaboradores;

-- Create policy for admins/managers to read ALL colaboradores data
CREATE POLICY "Managers can read all colaboradores data"
ON public.colaboradores
FOR SELECT
USING (is_manager_or_admin(auth.uid()));

-- Create policy for regular users to read only their own full data
CREATE POLICY "Users can read own colaborador data"
ON public.colaboradores
FOR SELECT
USING (user_id = auth.uid());

-- Create a secure view for basic colaborador info (for lists, dropdowns, etc.)
CREATE OR REPLACE VIEW public.colaboradores_basico AS
SELECT 
  id,
  nome,
  cargo,
  area,
  area_id,
  ativo,
  foto_url
FROM public.colaboradores;

-- Grant access to the view
GRANT SELECT ON public.colaboradores_basico TO authenticated;

-- Fix 2: Update profiles table RLS - restrict to owner and admin only
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));