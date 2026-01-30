-- Fix the SECURITY DEFINER view issue by dropping and recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.colaboradores_basico;

-- Recreate view with SECURITY INVOKER (uses caller's permissions)
CREATE VIEW public.colaboradores_basico 
WITH (security_invoker = true)
AS
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