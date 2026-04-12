
-- Fix missing table-level grants on CRM tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_historico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followups TO authenticated;

-- Also grant to anon for read-only (some policies use public role)
GRANT SELECT ON public.crm_cards TO anon;
GRANT SELECT ON public.crm_historico TO anon;
GRANT SELECT ON public.crm_followups TO anon;
