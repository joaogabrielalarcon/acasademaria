
-- Add admin permission check to check_inactive_clients
CREATE OR REPLACE FUNCTION public.check_inactive_clients()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins should run maintenance
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE clientes c
  SET 
    status = 'inativo',
    updated_at = now()
  WHERE 
    c.status = 'ativo'
    AND c.updated_at < (now() - INTERVAL '60 days')
    AND NOT EXISTS (
      SELECT 1 FROM registros r 
      WHERE r.cliente_id = c.id 
      AND (r.created_at >= (now() - INTERVAL '60 days') OR r.data_servico >= (CURRENT_DATE - 60))
    )
    AND NOT EXISTS (
      SELECT 1 FROM diarias d 
      WHERE d.cliente_id = c.id 
      AND (d.created_at >= (now() - INTERVAL '60 days') OR d.data_visita >= (CURRENT_DATE - 60))
    )
    AND NOT EXISTS (
      SELECT 1 FROM propostas p 
      WHERE p.cliente_id = c.id 
      AND p.created_at >= (now() - INTERVAL '60 days')
    );
END;
$$;
