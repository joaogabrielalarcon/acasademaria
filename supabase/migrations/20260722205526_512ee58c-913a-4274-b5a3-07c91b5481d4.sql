
-- 1) Fix search_path on remaining functions
ALTER FUNCTION public.norm_catalogo(text) SET search_path = public;
ALTER FUNCTION public.normalize_cnpj(text) SET search_path = public;
ALTER FUNCTION public.normalize_fornecedor_nome(text) SET search_path = public;
ALTER FUNCTION public.tg_set_updated_at_cotacao_ia() SET search_path = public;
ALTER FUNCTION public.unaccent_safe(text) SET search_path = public;
ALTER FUNCTION public.update_demandas_updated_at() SET search_path = public;

-- 2) Revoke EXECUTE from anon and PUBLIC on all SECURITY DEFINER functions in public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- Keep login-by-username RPC callable by anon (needed pre-auth)
GRANT EXECUTE ON FUNCTION public.get_user_id_by_username(text) TO anon;

-- 3) Remove overly permissive RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can manage pipeline stages" ON public.pipelines_etapas;

CREATE POLICY "Admins manage pipelines" ON public.pipelines
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo'));
CREATE POLICY "Read pipelines" ON public.pipelines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage pipeline stages" ON public.pipelines_etapas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo'));
CREATE POLICY "Read pipeline stages" ON public.pipelines_etapas
  FOR SELECT TO authenticated USING (true);

-- Tighten cotacao_ia_conversas UPDATE (WITH CHECK true)
DROP POLICY IF EXISTS "Autor ou admins podem atualizar conversa IA" ON public.cotacao_ia_conversas;
CREATE POLICY "Autor ou admins podem atualizar conversa IA" ON public.cotacao_ia_conversas
  FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo'))
  WITH CHECK (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo'));

-- 4) Storage: tie midia-cliente and midia-interna to cliente ownership via path
-- Path convention: cliente/{cliente_id}/{ano}/{contexto}/{arquivo}
CREATE OR REPLACE FUNCTION public.can_access_midia_path(_user_id uuid, _name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parts text[];
  cid uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'admin') OR public.has_role(_user_id,'administrativo') THEN
    RETURN true;
  END IF;
  parts := storage.foldername(_name);
  IF parts IS NULL OR array_length(parts,1) < 2 OR parts[1] <> 'cliente' THEN
    RETURN false;
  END IF;
  BEGIN
    cid := parts[2]::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  RETURN public.can_access_manutencao_client(_user_id, cid);
END $$;

REVOKE EXECUTE ON FUNCTION public.can_access_midia_path(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_midia_path(uuid, text) TO authenticated;

DROP POLICY IF EXISTS midia_cliente_select_auth_internal ON storage.objects;
DROP POLICY IF EXISTS midia_cliente_insert_auth ON storage.objects;
DROP POLICY IF EXISTS midia_cliente_update_auth ON storage.objects;
DROP POLICY IF EXISTS midia_cliente_delete_auth ON storage.objects;
DROP POLICY IF EXISTS midia_interna_select_auth ON storage.objects;
DROP POLICY IF EXISTS midia_interna_insert_auth ON storage.objects;
DROP POLICY IF EXISTS midia_interna_update_auth ON storage.objects;
DROP POLICY IF EXISTS midia_interna_delete_auth ON storage.objects;

CREATE POLICY midia_cliente_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'midia-cliente' AND public.can_access_midia_path(auth.uid(), name));
CREATE POLICY midia_cliente_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'midia-cliente' AND public.can_access_midia_path(auth.uid(), name));
CREATE POLICY midia_cliente_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'midia-cliente' AND public.can_access_midia_path(auth.uid(), name))
  WITH CHECK (bucket_id = 'midia-cliente' AND public.can_access_midia_path(auth.uid(), name));
CREATE POLICY midia_cliente_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'midia-cliente' AND public.can_access_midia_path(auth.uid(), name));

CREATE POLICY midia_interna_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'midia-interna' AND public.can_access_midia_path(auth.uid(), name));
CREATE POLICY midia_interna_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'midia-interna' AND public.can_access_midia_path(auth.uid(), name));
CREATE POLICY midia_interna_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'midia-interna' AND public.can_access_midia_path(auth.uid(), name))
  WITH CHECK (bucket_id = 'midia-interna' AND public.can_access_midia_path(auth.uid(), name));
CREATE POLICY midia_interna_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'midia-interna' AND public.can_access_midia_path(auth.uid(), name));
