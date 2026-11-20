CREATE OR REPLACE FUNCTION public.fin1_sync_parcela() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p uuid; recebido numeric; pendentes integer; ativos integer; dt date; anchor uuid; BEGIN
 p=CASE WHEN TG_OP='DELETE' THEN OLD.parcela_id ELSE NEW.parcela_id END;
 IF p IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
 SELECT COALESCE(sum(valor) FILTER(WHERE status='realizado'),0),count(*) FILTER(WHERE status='previsto'),count(*) FILTER(WHERE status<>'cancelado'),max(data_pagamento) FILTER(WHERE status='realizado') INTO recebido,pendentes,ativos,dt FROM public.financeiro_movimentacoes WHERE parcela_id=p;
 SELECT id INTO anchor FROM public.financeiro_movimentacoes WHERE parcela_id=p ORDER BY created_at,id LIMIT 1;
 UPDATE public.financeiro_parcelas SET movimentacao_id=COALESCE(movimentacao_id,anchor),valor_recebido=recebido,data_pagamento=dt,status=CASE WHEN ativos=0 AND anchor IS NOT NULL THEN 'cancelado' WHEN pendentes=0 AND recebido>=valor AND recebido>0 THEN 'pago' ELSE 'pendente' END WHERE id=p;
 RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER fin1_sync AFTER INSERT OR UPDATE OR DELETE ON public.financeiro_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.fin1_sync_parcela();
CREATE OR REPLACE FUNCTION public.fin1_guard_parcela() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF pg_trigger_depth()=1 AND auth.uid() IS NOT NULL THEN
 IF TG_OP='INSERT' AND (NEW.status<>'pendente' OR NEW.valor_recebido IS NOT NULL OR NEW.data_pagamento IS NOT NULL OR NEW.movimentacao_id IS NOT NULL) THEN RAISE EXCEPTION 'Baixa e espelhos da parcela sao atualizados somente pelo Caixa.'; END IF;
 IF TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.valor_recebido IS DISTINCT FROM OLD.valor_recebido OR NEW.data_pagamento IS DISTINCT FROM OLD.data_pagamento OR NEW.movimentacao_id IS DISTINCT FROM OLD.movimentacao_id) THEN RAISE EXCEPTION 'Baixa e espelhos da parcela sao atualizados somente pelo Caixa.'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER fin1_guard_parcela BEFORE INSERT OR UPDATE ON public.financeiro_parcelas FOR EACH ROW EXECUTE FUNCTION public.fin1_guard_parcela();
CREATE OR REPLACE FUNCTION public.fin1_plan_parcela() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cat uuid; mid uuid; BEGIN
 IF pg_trigger_depth()>1 OR NEW.movimentacao_id IS NOT NULL OR NEW.valor<=0 OR NEW.data_vencimento IS NULL THEN RETURN NEW; END IF;
 SELECT id INTO cat FROM public.financeiro_categorias WHERE nome='A classificar' AND tipo='entrada';
 INSERT INTO public.financeiro_movimentacoes(tipo,categoria,descricao,valor,status,data_movimentacao,data_vencimento,categoria_id,projeto_id,cliente_id,parcela_id,revisar) VALUES('entrada','recebimento_cliente','Parcela '||NEW.numero_parcela,NEW.valor,'previsto',CURRENT_DATE,NEW.data_vencimento,cat,NEW.projeto_id,NEW.cliente_id,NEW.id,true) RETURNING id INTO mid;
 RETURN NEW; END $$;
CREATE TRIGGER fin1_plan AFTER INSERT OR UPDATE OF valor,data_vencimento ON public.financeiro_parcelas FOR EACH ROW EXECUTE FUNCTION public.fin1_plan_parcela();
CREATE OR REPLACE FUNCTION public.sync_parcelas_to_projeto() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status<>'pago' THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM public.projetos WHERE id=NEW.projeto_id AND tipo<>'manutencao') AND NOT EXISTS(SELECT 1 FROM public.financeiro_parcelas WHERE projeto_id=NEW.projeto_id AND status<>'pago') THEN UPDATE public.projetos SET status='concluido',updated_at=now() WHERE id=NEW.projeto_id AND status IS DISTINCT FROM 'concluido'; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.fin1_transfer_pair() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW.transferencia_id IS NOT NULL AND NEW.status='cancelado' AND OLD.status<>'cancelado' THEN UPDATE public.financeiro_movimentacoes SET status='cancelado' WHERE transferencia_id=NEW.transferencia_id AND id<>NEW.id AND status<>'cancelado'; END IF;
 IF TG_OP='DELETE' AND OLD.transferencia_id IS NOT NULL THEN PERFORM set_config('fin1.motivo','Exclusao confirmada da transferencia',true); UPDATE public.financeiro_movimentacoes SET status='cancelado' WHERE transferencia_id=OLD.transferencia_id AND id<>OLD.id AND status<>'cancelado'; END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER fin1_pair AFTER UPDATE OR DELETE ON public.financeiro_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.fin1_transfer_pair();
CREATE OR REPLACE FUNCTION public.financeiro_operar(p_acao text,p_dados jsonb DEFAULT '{}'::jsonb,p_ids uuid[] DEFAULT '{}'::uuid[],p_motivo text DEFAULT NULL,p_confirmado boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v public.financeiro_movimentacoes%ROWTYPE; r public.financeiro_movimentacoes%ROWTYPE; result jsonb='[]'::jsonb; current_id uuid; new_id uuid; trans uuid; rec uuid; q integer; i integer; base_due date; base_comp date; paid numeric; payload jsonb; cat uuid; unknown_key text;
BEGIN
 IF NOT public.fin1_authorized(false) THEN RAISE EXCEPTION 'Sem acesso ao financeiro.' USING ERRCODE='42501'; END IF;
 IF NOT p_confirmado THEN RAISE EXCEPTION 'Confirme os dados antes de gravar.'; END IF;
 PERFORM set_config('fin1.motivo',COALESCE(p_motivo,''),true);
 SELECT k INTO unknown_key FROM jsonb_object_keys(p_dados) k WHERE k NOT IN ('id','tipo','categoria','descricao','valor','status','data_movimentacao','data_vencimento','data_pagamento','conta_id','categoria_id','projeto_id','cliente_id','colaborador_id','area_id','parcela_id','fornecedor_id','estoque_movimentacao_id','forma_pagamento','documento','comprovante_path','transferencia_id','recorrencia_id','origem','id_externo','revisar','observacoes','conta_destino_id','meses','escopo') LIMIT 1;
 IF unknown_key IS NOT NULL THEN RAISE EXCEPTION 'Campo financeiro nao permitido: %',unknown_key; END IF;
 IF p_acao='recorrencia' THEN
 q=(p_dados->>'meses')::integer; IF q<1 OR q>120 THEN RAISE EXCEPTION 'Informe de 1 a 120 meses.'; END IF;
 IF COALESCE(p_dados->>'status','previsto')<>'previsto' THEN RAISE EXCEPTION 'Recorrencia inicia como prevista.'; END IF;
 rec=gen_random_uuid(); base_due=(p_dados->>'data_vencimento')::date; base_comp=COALESCE((p_dados->>'data_movimentacao')::date,CURRENT_DATE);
 FOR i IN 0..q-1 LOOP payload=(p_dados-'meses'-'escopo')||jsonb_build_object('recorrencia_id',rec,'data_vencimento',(base_due+make_interval(months=>i))::date,'data_movimentacao',(base_comp+make_interval(months=>i))::date); result=result||public.financeiro_operar('salvar',payload,'{}',p_motivo,true); END LOOP; RETURN result; END IF;
 IF p_acao='transferencia' THEN
 IF p_dados->>'conta_id' IS NULL OR p_dados->>'conta_destino_id' IS NULL OR p_dados->>'conta_id'=p_dados->>'conta_destino_id' THEN RAISE EXCEPTION 'Transferencia exige duas contas diferentes.'; END IF;
 trans=gen_random_uuid(); SELECT id INTO cat FROM public.financeiro_categorias WHERE tipo='saida' AND nome='Transferência entre contas (saída)';
 payload=(p_dados-'conta_destino_id'-'meses'-'escopo')||jsonb_build_object('tipo','saida','categoria_id',cat,'transferencia_id',trans); result=result||public.financeiro_operar('salvar',payload,'{}',p_motivo,true);
 SELECT id INTO cat FROM public.financeiro_categorias WHERE tipo='entrada' AND nome='Transferência entre contas (entrada)'; payload=payload||jsonb_build_object('tipo','entrada','categoria_id',cat,'conta_id',p_dados->>'conta_destino_id'); result=result||public.financeiro_operar('salvar',payload,'{}',p_motivo,true); RETURN result; END IF;
 IF p_acao IN ('baixar','cancelar') THEN
 IF cardinality(p_ids)=0 THEN RAISE EXCEPTION 'Escolha ao menos um lancamento.'; END IF;
 FOREACH current_id IN ARRAY p_ids LOOP
 SELECT m INTO v FROM public.financeiro_movimentacoes m WHERE id=current_id FOR UPDATE; IF v.id IS NULL THEN RAISE EXCEPTION 'Lancamento nao encontrado.'; END IF;
 IF p_acao='cancelar' THEN UPDATE public.financeiro_movimentacoes SET status='cancelado' WHERE id=current_id;
 ELSE
 IF v.status<>'previsto' THEN RAISE EXCEPTION 'Somente previsto pode receber baixa.'; END IF;
 IF v.transferencia_id IS NOT NULL THEN RAISE EXCEPTION 'Baixe a transferencia pelo par, no comando transferencia.'; END IF;
 paid=COALESCE((p_dados->>'valor')::numeric,v.valor); IF paid<=0 THEN RAISE EXCEPTION 'Valor pago deve ser positivo.'; END IF;
 IF paid<v.valor THEN INSERT INTO public.financeiro_movimentacoes(tipo,categoria,descricao,valor,status,data_movimentacao,data_vencimento,conta_id,categoria_id,projeto_id,cliente_id,colaborador_id,area_id,parcela_id,fornecedor_id,forma_pagamento,recorrencia_id,origem,revisar,observacoes) VALUES(v.tipo,v.categoria,v.descricao||' (saldo pendente)',v.valor-paid,'previsto',v.data_movimentacao,v.data_vencimento,v.conta_id,v.categoria_id,v.projeto_id,v.cliente_id,v.colaborador_id,v.area_id,v.parcela_id,v.fornecedor_id,v.forma_pagamento,v.recorrencia_id,v.origem,v.revisar,v.observacoes); END IF;
 UPDATE public.financeiro_movimentacoes SET status='realizado',valor=paid,data_pagamento=(p_dados->>'data_pagamento')::date,conta_id=(p_dados->>'conta_id')::uuid,comprovante_path=COALESCE(p_dados->>'comprovante_path',comprovante_path) WHERE id=current_id;
 END IF; result=result||jsonb_build_array(jsonb_build_object('id',current_id)); END LOOP; RETURN result; END IF;
 IF p_acao<>'salvar' THEN RAISE EXCEPTION 'Operacao financeira desconhecida.'; END IF;
 current_id=NULLIF(p_dados->>'id','')::uuid;
 IF current_id IS NOT NULL THEN SELECT m INTO v FROM public.financeiro_movimentacoes m WHERE id=current_id FOR UPDATE; IF v.id IS NULL THEN RAISE EXCEPTION 'Lancamento nao encontrado.'; END IF; IF v.transferencia_id IS NOT NULL THEN RAISE EXCEPTION 'Transferencia deve ser editada como par.'; END IF; END IF;
 IF p_dados->>'origem'='importacao' AND NULLIF(p_dados->>'id_externo','') IS NOT NULL THEN
 PERFORM pg_advisory_xact_lock(hashtextextended('importacao:'||(p_dados->>'id_externo'),0)); SELECT m INTO v FROM public.financeiro_movimentacoes m WHERE origem='importacao' AND id_externo=p_dados->>'id_externo' FOR UPDATE; current_id=v.id;
 END IF;
 IF v.id IS NULL THEN v.id=gen_random_uuid(); v.tipo='saida'; v.status='previsto'; v.categoria='outros'; v.data_movimentacao=CURRENT_DATE; v.origem='manual'; v.revisar=false; END IF;
 SELECT x INTO r FROM jsonb_populate_record(v,p_dados-'id'-'meses'-'escopo'-'conta_destino_id') x;
 IF current_id IS NULL THEN
 INSERT INTO public.financeiro_movimentacoes(id,tipo,categoria,descricao,valor,status,data_movimentacao,data_vencimento,data_pagamento,conta_id,categoria_id,projeto_id,cliente_id,colaborador_id,area_id,parcela_id,fornecedor_id,estoque_movimentacao_id,forma_pagamento,documento,comprovante_path,transferencia_id,recorrencia_id,origem,id_externo,revisar,observacoes) VALUES(v.id,r.tipo,r.categoria,r.descricao,r.valor,r.status,r.data_movimentacao,r.data_vencimento,r.data_pagamento,r.conta_id,r.categoria_id,r.projeto_id,r.cliente_id,r.colaborador_id,r.area_id,r.parcela_id,r.fornecedor_id,r.estoque_movimentacao_id,r.forma_pagamento,r.documento,r.comprovante_path,r.transferencia_id,r.recorrencia_id,r.origem,r.id_externo,r.revisar,r.observacoes) RETURNING id INTO new_id;
 ELSE
 UPDATE public.financeiro_movimentacoes SET tipo=r.tipo,categoria=r.categoria,descricao=r.descricao,valor=r.valor,status=r.status,data_movimentacao=r.data_movimentacao,data_vencimento=r.data_vencimento,data_pagamento=r.data_pagamento,conta_id=r.conta_id,categoria_id=r.categoria_id,projeto_id=r.projeto_id,cliente_id=r.cliente_id,colaborador_id=r.colaborador_id,area_id=r.area_id,parcela_id=r.parcela_id,fornecedor_id=r.fornecedor_id,forma_pagamento=r.forma_pagamento,documento=r.documento,comprovante_path=r.comprovante_path,recorrencia_id=r.recorrencia_id,origem=r.origem,id_externo=r.id_externo,revisar=r.revisar,observacoes=r.observacoes WHERE id=current_id RETURNING id INTO new_id;
 IF p_dados->>'escopo'='proximas' AND v.recorrencia_id IS NOT NULL THEN UPDATE public.financeiro_movimentacoes SET descricao=r.descricao,valor=r.valor,categoria_id=r.categoria_id,conta_id=r.conta_id,observacoes=r.observacoes WHERE recorrencia_id=v.recorrencia_id AND status='previsto' AND data_vencimento>v.data_vencimento; END IF;
 END IF;
 IF new_id IS NULL THEN RAISE EXCEPTION 'Informe vencimento antes de gerar o financeiro da compra.'; END IF;
 RETURN jsonb_build_array(jsonb_build_object('id',new_id)); END $$;
REVOKE ALL ON FUNCTION public.financeiro_operar(text,jsonb,uuid[],text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.financeiro_operar(text,jsonb,uuid[],text,boolean) TO authenticated;
COMMENT ON FUNCTION public.financeiro_operar(text,jsonb,uuid[],text,boolean) IS 'Motor unico FIN-1, caller scoped RLS; confirmacao humana obrigatoria nos adaptadores.';