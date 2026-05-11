-- ============================================================
-- PR-T1: RLS + índices transversais (corrigido)
-- ============================================================

-- ---------- 1. RLS: historico_precos ----------
DROP POLICY IF EXISTS "auth_delete_historico" ON public.historico_precos;
DROP POLICY IF EXISTS "auth_update_historico" ON public.historico_precos;
DROP POLICY IF EXISTS "auth_insert_historico" ON public.historico_precos;
DROP POLICY IF EXISTS "auth_select_historico" ON public.historico_precos;

CREATE POLICY "Authenticated can read historico_precos"
  ON public.historico_precos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert historico_precos"
  ON public.historico_precos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can update historico_precos"
  ON public.historico_precos FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Admin can delete historico_precos"
  ON public.historico_precos FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- ---------- 2. Orçamento: incluir 'arquitetura' ----------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orcamentos','orcamento_itens','orcamento_cotacoes','orcamento_insumos',
    'orcamento_checklist','orcamento_transporte','orcamento_fretes'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_full_access', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR ALL
      USING (public.has_any_role(auth.uid(),
        ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]))
      WITH CHECK (public.has_any_role(auth.uid(),
        ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]))
    $f$, t || '_full_access', t);
  END LOOP;
END $$;

-- ---------- 3. Índices ----------
CREATE INDEX IF NOT EXISTS idx_crm_cards_status ON public.crm_cards(status);
CREATE INDEX IF NOT EXISTS idx_crm_cards_projeto ON public.crm_cards(projeto_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_cliente ON public.crm_cards(cliente_id);

CREATE INDEX IF NOT EXISTS idx_fin_mov_fornecedor ON public.financeiro_movimentacoes(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_fornecedor ON public.orcamento_cotacoes(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_orc_insumos_orcamento ON public.orcamento_insumos(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orc_insumos_fornecedor ON public.orcamento_insumos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_orc_insumos_insumo ON public.orcamento_insumos(insumo_id);

CREATE INDEX IF NOT EXISTS idx_historico_fornecedor ON public.historico_precos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_fornecedor ON public.estoque_movimentacoes(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_fornecedor_atendentes_fornecedor ON public.fornecedor_atendentes(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_avaliacoes_fornecedor ON public.fornecedor_avaliacoes(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_fornecedor_avaliacoes_item ON public.fornecedor_avaliacoes(item_id);

CREATE INDEX IF NOT EXISTS idx_projetos_responsavel ON public.projetos(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_plantas_ativo_nome
  ON public.plantas(nome_popular) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativos
  ON public.fornecedores(nome) WHERE status = 'ativo';