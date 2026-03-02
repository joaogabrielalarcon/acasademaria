
-- Fix overly permissive INSERT policy - only allow inserts via SECURITY DEFINER triggers
DROP POLICY "System can insert cliente_atividades" ON public.cliente_atividades;

-- No direct INSERT policy needed since triggers use SECURITY DEFINER
-- Add a restrictive policy that only allows admin inserts directly
CREATE POLICY "Admins can insert cliente_atividades"
  ON public.cliente_atividades FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));
