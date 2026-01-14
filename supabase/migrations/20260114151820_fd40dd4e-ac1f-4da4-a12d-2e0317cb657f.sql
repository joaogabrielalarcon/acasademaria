-- Função para verificar e marcar clientes inativos após 60 dias sem atividade
CREATE OR REPLACE FUNCTION public.check_inactive_clients()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inactive_threshold INTERVAL := '60 days';
BEGIN
  -- Marca como inativo clientes que:
  -- 1. Estão ativos atualmente
  -- 2. Não tiveram atualização no cadastro nos últimos 60 dias
  -- 3. Não tiveram registros nos últimos 60 dias
  -- 4. Não tiveram diárias nos últimos 60 dias
  -- 5. Não tiveram propostas nos últimos 60 dias
  
  UPDATE clientes c
  SET 
    status = 'inativo',
    updated_at = now()
  WHERE 
    c.status = 'ativo'
    AND c.updated_at < (now() - inactive_threshold)
    AND NOT EXISTS (
      SELECT 1 FROM registros r 
      WHERE r.cliente_id = c.id 
      AND (r.created_at >= (now() - inactive_threshold) OR r.data_servico >= (CURRENT_DATE - 60))
    )
    AND NOT EXISTS (
      SELECT 1 FROM diarias d 
      WHERE d.cliente_id = c.id 
      AND (d.created_at >= (now() - inactive_threshold) OR d.data_visita >= (CURRENT_DATE - 60))
    )
    AND NOT EXISTS (
      SELECT 1 FROM propostas p 
      WHERE p.cliente_id = c.id 
      AND p.created_at >= (now() - inactive_threshold)
    );
END;
$$;

-- Extensão pg_cron para agendamento (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar a verificação para rodar diariamente à meia-noite
SELECT cron.schedule(
  'check-inactive-clients-daily',
  '0 0 * * *',
  'SELECT public.check_inactive_clients()'
);