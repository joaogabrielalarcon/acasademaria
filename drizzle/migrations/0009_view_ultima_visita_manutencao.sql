CREATE VIEW public.projetos_ultima_visita
WITH (security_invoker = true) AS
SELECT p.id AS projeto_id,
       GREATEST(
         (SELECT max(d.data_visita) FROM public.diarias d WHERE d.cliente_id = p.cliente_id),
         (SELECT max(m.data_visita) FROM public.manutencao_visitas m WHERE m.projeto_id = p.id),
         (SELECT max(v.data_visita) FROM public.diario_visitas v WHERE v.projeto_id = p.id)
       ) AS ultima_visita
FROM public.projetos p
WHERE p.tipo = 'manutencao';
COMMENT ON VIEW public.projetos_ultima_visita IS 'Last registered maintenance visit per maintenance project. diarias has no projeto_id, so it is matched by cliente_id. Runs with the caller permissions (RLS of each source table applies).';
GRANT SELECT ON public.projetos_ultima_visita TO authenticated;
GRANT SELECT ON public.projetos_ultima_visita TO service_role;
CREATE INDEX IF NOT EXISTS idx_diarias_cliente_data ON public.diarias (cliente_id, data_visita DESC);