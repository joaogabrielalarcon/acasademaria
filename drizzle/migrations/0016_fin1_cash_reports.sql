CREATE OR REPLACE FUNCTION public.financeiro_saldos(p_data date) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
 IF NOT public.fin1_authorized(true) THEN RAISE EXCEPTION 'Saldos exclusivos de admin e diretor.' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.ordem),'[]'::jsonb) INTO result FROM (
 SELECT c.id,c.nome,c.ordem,
 CASE WHEN p_data>=c.data_saldo_inicial THEN c.saldo_inicial ELSE 0 END+COALESCE(sum(CASE WHEN m.tipo='entrada' THEN m.valor ELSE -m.valor END) FILTER(WHERE m.status='realizado' AND m.data_pagamento BETWEEN c.data_saldo_inicial AND p_data),0) AS saldo_realizado,
 CASE WHEN p_data>=c.data_saldo_inicial THEN c.saldo_inicial ELSE 0 END+COALESCE(sum(CASE WHEN m.tipo='entrada' THEN m.valor ELSE -m.valor END) FILTER(WHERE (m.status='realizado' AND m.data_pagamento BETWEEN c.data_saldo_inicial AND p_data) OR (m.status='previsto' AND m.data_vencimento BETWEEN c.data_saldo_inicial AND p_data)),0) AS saldo_previsto
 FROM public.financeiro_contas c LEFT JOIN public.financeiro_movimentacoes m ON m.conta_id=c.id WHERE c.ativo GROUP BY c.id,c.nome,c.ordem,c.saldo_inicial,c.data_saldo_inicial) x;
 RETURN result; END $$;
REVOKE ALL ON FUNCTION public.financeiro_saldos(date) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_saldos(date) TO authenticated;
CREATE OR REPLACE FUNCTION public.financeiro_resumo(p_mes date,p_criterio text DEFAULT 'competencia',p_status text DEFAULT 'realizado',p_conta uuid DEFAULT NULL,p_categoria uuid DEFAULT NULL,p_area uuid DEFAULT NULL,p_projeto uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
 IF NOT public.fin1_authorized(true) THEN RAISE EXCEPTION 'Resumo exclusivo de admin e diretor.' USING ERRCODE='42501'; END IF;
 IF p_criterio NOT IN ('competencia','pagamento','vencimento') OR p_status NOT IN ('previsto','realizado','todos') THEN RAISE EXCEPTION 'Filtro de resumo invalido.'; END IF;
 WITH filtered AS (
 SELECT m.tipo,m.valor,m.categoria_id,c.nome AS categoria,c.grupo,m.area_id,a.nome AS area,m.projeto_id,p.titulo AS projeto FROM public.financeiro_movimentacoes m JOIN public.financeiro_categorias c ON c.id=m.categoria_id LEFT JOIN public.areas a ON a.id=m.area_id LEFT JOIN public.projetos p ON p.id=m.projeto_id
 WHERE c.entra_no_resultado AND m.status<>'cancelado' AND (p_status='todos' OR m.status=p_status)
 AND CASE p_criterio WHEN 'competencia' THEN m.data_movimentacao WHEN 'pagamento' THEN m.data_pagamento ELSE m.data_vencimento END >=date_trunc('month',p_mes)::date
 AND CASE p_criterio WHEN 'competencia' THEN m.data_movimentacao WHEN 'pagamento' THEN m.data_pagamento ELSE m.data_vencimento END <(date_trunc('month',p_mes)+interval '1 month')::date
 AND (p_conta IS NULL OR m.conta_id=p_conta) AND (p_categoria IS NULL OR m.categoria_id=p_categoria) AND (p_area IS NULL OR m.area_id=p_area) AND (p_projeto IS NULL OR m.projeto_id=p_projeto)
 ), dimensions AS (
 SELECT 'categoria' AS dimensao,COALESCE(categoria,'Sem categoria') AS nome,tipo,sum(valor) AS valor FROM filtered GROUP BY categoria,tipo
 UNION ALL SELECT 'grupo',grupo,tipo,sum(valor) FROM filtered GROUP BY grupo,tipo
 UNION ALL SELECT 'area',COALESCE(area,'Sem área'),tipo,sum(valor) FROM filtered GROUP BY area,tipo
 UNION ALL SELECT 'projeto',COALESCE(projeto,'Sem projeto'),tipo,sum(valor) FROM filtered GROUP BY projeto,tipo)
 SELECT jsonb_build_object('entradas',COALESCE((SELECT sum(valor) FROM filtered WHERE tipo='entrada'),0),'saidas',COALESCE((SELECT sum(valor) FROM filtered WHERE tipo='saida'),0),'resultado',COALESCE((SELECT sum(CASE WHEN tipo='entrada' THEN valor ELSE -valor END) FROM filtered),0),'criterio',p_criterio,'grupos',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY dimensao,nome,tipo) FROM dimensions d),'[]'::jsonb)) INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.financeiro_resumo(date,text,text,uuid,uuid,uuid,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_resumo(date,text,text,uuid,uuid,uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.financeiro_saldo_inicial(p_conta uuid,p_valor numeric,p_data date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.fin1_authorized(true) THEN RAISE EXCEPTION 'Saldo inicial exclusivo de admin e diretor.' USING ERRCODE='42501'; END IF; IF p_data IS NULL OR p_valor IS NULL THEN RAISE EXCEPTION 'Informe valor e data do saldo inicial.'; END IF; UPDATE public.financeiro_contas SET saldo_inicial=p_valor,data_saldo_inicial=p_data WHERE id=p_conta; END $$;
REVOKE ALL ON FUNCTION public.financeiro_saldo_inicial(uuid,numeric,date) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_saldo_inicial(uuid,numeric,date) TO authenticated;