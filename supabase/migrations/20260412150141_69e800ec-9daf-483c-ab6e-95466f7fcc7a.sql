
-- =============================================
-- 1. CRM STATUS → PROJECT STATUS (with loop prevention)
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_crm_to_projeto()
RETURNS TRIGGER AS $$
DECLARE
  v_new_projeto_status text;
BEGIN
  -- Only act if status changed and card has a linked project (non-maintenance)
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.projeto_id IS NULL THEN RETURN NEW; END IF;

  -- Check project is not manutencao
  IF EXISTS (SELECT 1 FROM public.projetos WHERE id = NEW.projeto_id AND tipo = 'manutencao') THEN
    RETURN NEW;
  END IF;

  -- Map CRM status to project status
  v_new_projeto_status := CASE NEW.status
    WHEN 'Aprovado' THEN 'aprovado'
    WHEN 'Em Execução' THEN 'em_execucao'
    WHEN 'Concluído' THEN 'concluido'
    WHEN 'Não Aprovado' THEN 'nao_aprovado'
    ELSE NULL
  END;

  IF v_new_projeto_status IS NULL THEN RETURN NEW; END IF;

  -- Only update if status is different (loop prevention)
  UPDATE public.projetos
  SET status = v_new_projeto_status, updated_at = now()
  WHERE id = NEW.projeto_id
    AND status IS DISTINCT FROM v_new_projeto_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_crm_to_projeto ON public.crm_cards;
CREATE TRIGGER trigger_sync_crm_to_projeto
  AFTER UPDATE ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_crm_to_projeto();

-- =============================================
-- 2. PROJECT STATUS → CRM STATUS (with loop prevention)
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_projeto_to_crm()
RETURNS TRIGGER AS $$
DECLARE
  v_new_crm_status text;
BEGIN
  -- Only act if status changed and not manutencao
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.tipo = 'manutencao' THEN RETURN NEW; END IF;

  -- Map project status to CRM status
  v_new_crm_status := CASE NEW.status
    WHEN 'aprovado' THEN 'Aprovado'
    WHEN 'em_execucao' THEN 'Em Execução'
    WHEN 'concluido' THEN 'Concluído'
    WHEN 'nao_aprovado' THEN 'Não Aprovado'
    ELSE NULL
  END;

  IF v_new_crm_status IS NULL THEN RETURN NEW; END IF;

  -- Only update if status is different (loop prevention)
  UPDATE public.crm_cards
  SET status = v_new_crm_status, updated_at = now()
  WHERE projeto_id = NEW.id
    AND status IS DISTINCT FROM v_new_crm_status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_projeto_to_crm ON public.projetos;
CREATE TRIGGER trigger_sync_projeto_to_crm
  AFTER UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_projeto_to_crm();

-- =============================================
-- 3. FINANCEIRO → PROJECT (all parcelas paid = concluido)
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_parcelas_to_projeto()
RETURNS TRIGGER AS $$
DECLARE
  v_total_parcelas integer;
  v_pagas integer;
  v_projeto_tipo text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status != 'recebido' THEN RETURN NEW; END IF;

  -- Get project type
  SELECT tipo INTO v_projeto_tipo FROM public.projetos WHERE id = NEW.projeto_id;
  IF v_projeto_tipo = 'manutencao' THEN RETURN NEW; END IF;

  -- Count parcelas
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'recebido')
  INTO v_total_parcelas, v_pagas
  FROM public.financeiro_parcelas
  WHERE projeto_id = NEW.projeto_id;

  -- If all paid, mark project as concluido
  IF v_total_parcelas > 0 AND v_total_parcelas = v_pagas THEN
    UPDATE public.projetos
    SET status = 'concluido', updated_at = now()
    WHERE id = NEW.projeto_id
      AND status IS DISTINCT FROM 'concluido';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_parcelas_to_projeto ON public.financeiro_parcelas;
CREATE TRIGGER trigger_sync_parcelas_to_projeto
  AFTER UPDATE ON public.financeiro_parcelas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_parcelas_to_projeto();

-- =============================================
-- 4. FINANCEIRO → CRM (overdue parcelas alert)
-- =============================================
CREATE OR REPLACE FUNCTION public.alert_crm_parcela_vencida()
RETURNS TRIGGER AS $$
DECLARE
  v_card_id uuid;
  v_projeto_titulo text;
BEGIN
  -- Only act when status changes to 'vencido'
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status != 'vencido' THEN RETURN NEW; END IF;

  -- Find linked CRM card
  SELECT cc.id INTO v_card_id
  FROM public.crm_cards cc
  WHERE cc.projeto_id = NEW.projeto_id
  LIMIT 1;

  IF v_card_id IS NULL THEN RETURN NEW; END IF;

  -- Get project title for context
  SELECT titulo INTO v_projeto_titulo FROM public.projetos WHERE id = NEW.projeto_id;

  -- Add historico entry as alert
  INSERT INTO public.crm_historico (card_id, descricao)
  VALUES (
    v_card_id,
    '⚠️ Parcela ' || NEW.numero_parcela || ' vencida — R$ ' || 
    TRIM(TO_CHAR(NEW.valor, 'FM999G999D00')) || 
    COALESCE(' (venc. ' || TO_CHAR(NEW.data_vencimento, 'DD/MM/YYYY') || ')', '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_alert_crm_parcela_vencida ON public.financeiro_parcelas;
CREATE TRIGGER trigger_alert_crm_parcela_vencida
  AFTER UPDATE ON public.financeiro_parcelas
  FOR EACH ROW
  EXECUTE FUNCTION public.alert_crm_parcela_vencida();

-- =============================================
-- 5. FEED: CRM status changes → client feed
-- =============================================
CREATE OR REPLACE FUNCTION public.feed_crm_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.cliente_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.cliente_feed_eventos (
    cliente_id, tipo, titulo, referencia_id, referencia_tipo, visivel_cliente, dados
  ) VALUES (
    NEW.cliente_id,
    'crm_status',
    'CRM: "' || NEW.titulo || '" movido para ' || NEW.status,
    NEW.id,
    'crm_card',
    false,
    jsonb_build_object('status_anterior', OLD.status, 'status_novo', NEW.status)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_feed_crm_status ON public.crm_cards;
CREATE TRIGGER trigger_feed_crm_status
  AFTER UPDATE ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.feed_crm_status_change();

-- =============================================
-- 6. FEED: Financeiro changes → client feed
-- =============================================
CREATE OR REPLACE FUNCTION public.feed_parcela_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_titulo_projeto text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  SELECT titulo INTO v_titulo_projeto FROM public.projetos WHERE id = NEW.projeto_id;

  INSERT INTO public.cliente_feed_eventos (
    cliente_id, tipo, titulo, referencia_id, referencia_tipo, visivel_cliente, dados
  ) VALUES (
    NEW.cliente_id,
    CASE NEW.status WHEN 'recebido' THEN 'pagamento_recebido' WHEN 'vencido' THEN 'pagamento_vencido' ELSE 'pagamento_atualizado' END,
    CASE NEW.status 
      WHEN 'recebido' THEN 'Parcela ' || NEW.numero_parcela || ' recebida — ' || COALESCE(v_titulo_projeto, 'Projeto')
      WHEN 'vencido' THEN '⚠️ Parcela ' || NEW.numero_parcela || ' vencida — ' || COALESCE(v_titulo_projeto, 'Projeto')
      ELSE 'Parcela ' || NEW.numero_parcela || ' atualizada — ' || COALESCE(v_titulo_projeto, 'Projeto')
    END,
    NEW.id,
    'financeiro_parcela',
    false,
    jsonb_build_object('valor', NEW.valor, 'status', NEW.status, 'projeto_id', NEW.projeto_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_feed_parcela_status ON public.financeiro_parcelas;
CREATE TRIGGER trigger_feed_parcela_status
  AFTER UPDATE ON public.financeiro_parcelas
  FOR EACH ROW
  EXECUTE FUNCTION public.feed_parcela_status_change();
