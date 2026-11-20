CREATE OR REPLACE FUNCTION public.financeiro_resolver_nome(p_tipo text,p_nome text,p_mov_tipo text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=public AS $$ DECLARE ids uuid[]; result uuid; BEGIN
 IF NOT public.fin1_authorized(false) THEN RAISE EXCEPTION 'Sem acesso ao financeiro.' USING ERRCODE='42501'; END IF;
 IF p_nome IS NULL OR btrim(p_nome)='' THEN RETURN jsonb_build_object('id',NULL,'ambiguo',false); END IF;
 WITH candidates AS(
 SELECT id FROM public.clientes WHERE p_tipo='cliente' AND public.norm_catalogo(nome)=public.norm_catalogo(p_nome)
 UNION SELECT id FROM public.fornecedores WHERE p_tipo='fornecedor' AND public.norm_catalogo(nome)=public.norm_catalogo(p_nome)
 UNION SELECT id FROM public.colaboradores WHERE p_tipo='colaborador' AND public.norm_catalogo(nome)=public.norm_catalogo(p_nome)
 UNION SELECT id FROM public.projetos WHERE p_tipo='projeto' AND public.norm_catalogo(titulo)=public.norm_catalogo(p_nome)
 UNION SELECT id FROM public.financeiro_contas WHERE p_tipo='conta' AND public.norm_catalogo(nome)=public.norm_catalogo(p_nome)
 UNION SELECT id FROM public.financeiro_categorias WHERE p_tipo='categoria' AND tipo=p_mov_tipo AND public.norm_catalogo(nome)=public.norm_catalogo(p_nome)
 UNION SELECT item_id FROM public.catalogo_apelidos WHERE tipo=p_tipo AND apelido_norm=public.norm_catalogo(p_nome)
 ) SELECT array_agg(DISTINCT id) INTO ids FROM candidates;
 IF cardinality(ids)=1 THEN result=ids[1]; END IF; RETURN jsonb_build_object('id',result,'ambiguo',COALESCE(cardinality(ids)>1,false)); END $$;
REVOKE ALL ON FUNCTION public.financeiro_resolver_nome(text,text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_resolver_nome(text,text,text) TO authenticated;