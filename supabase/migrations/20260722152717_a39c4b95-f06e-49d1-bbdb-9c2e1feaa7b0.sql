
-- ============================================================
-- SPRINT 1 — Fechar exposição de dados pessoais e financeiros
-- ============================================================

-- 1) locais_cliente: CPF/CNPJ/endereço → só admin + administrativo
DROP POLICY IF EXISTS "Authenticated can select locais_cliente" ON public.locais_cliente;
DROP POLICY IF EXISTS "Authenticated can insert locais_cliente" ON public.locais_cliente;
DROP POLICY IF EXISTS "Authenticated can update locais_cliente" ON public.locais_cliente;
DROP POLICY IF EXISTS "Authenticated can delete locais_cliente" ON public.locais_cliente;

CREATE POLICY "locais_cliente_select_managers" ON public.locais_cliente FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "locais_cliente_insert_managers" ON public.locais_cliente FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "locais_cliente_update_managers" ON public.locais_cliente FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "locais_cliente_delete_admin" ON public.locais_cliente FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 2) CRM cards / followups / historico → só admin + administrativo
DROP POLICY IF EXISTS "Authenticated users can select crm_cards" ON public.crm_cards;
DROP POLICY IF EXISTS "Authenticated users can insert crm_cards" ON public.crm_cards;
DROP POLICY IF EXISTS "Authenticated users can update crm_cards" ON public.crm_cards;
DROP POLICY IF EXISTS "Authenticated users can delete crm_cards" ON public.crm_cards;

CREATE POLICY "crm_cards_select_managers" ON public.crm_cards FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_cards_insert_managers" ON public.crm_cards FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_cards_update_managers" ON public.crm_cards FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_cards_delete_admin" ON public.crm_cards FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can select crm_followups" ON public.crm_followups;
DROP POLICY IF EXISTS "Authenticated users can insert crm_followups" ON public.crm_followups;
DROP POLICY IF EXISTS "Authenticated users can update crm_followups" ON public.crm_followups;
DROP POLICY IF EXISTS "Authenticated users can delete crm_followups" ON public.crm_followups;

CREATE POLICY "crm_followups_select_managers" ON public.crm_followups FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_followups_insert_managers" ON public.crm_followups FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_followups_update_managers" ON public.crm_followups FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_followups_delete_admin" ON public.crm_followups FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can select crm_historico" ON public.crm_historico;
DROP POLICY IF EXISTS "Authenticated users can insert crm_historico" ON public.crm_historico;

CREATE POLICY "crm_historico_select_managers" ON public.crm_historico FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_historico_insert_managers" ON public.crm_historico FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- 3) solicitacoes_compras: valor/condição → admin + administrativo
DROP POLICY IF EXISTS "Autenticados podem ver solicitacoes" ON public.solicitacoes_compras;
CREATE POLICY "solicitacoes_compras_select_managers" ON public.solicitacoes_compras FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- 4) Remover policies redundantes "ALL true"
DROP POLICY IF EXISTS "Authenticated users can manage demandas" ON public.demandas;
DROP POLICY IF EXISTS "Authenticated users can manage demanda responsaveis" ON public.demanda_responsaveis;
DROP POLICY IF EXISTS "Authenticated users can manage demanda history" ON public.demanda_etapas_historico;

-- 5) Catálogo de apelidos: leitura interna, escrita gerentes
DROP POLICY IF EXISTS "Autenticados atualizam apelidos" ON public.catalogo_apelidos;
DROP POLICY IF EXISTS "Autenticados inserem apelidos" ON public.catalogo_apelidos;
DROP POLICY IF EXISTS "Autenticados removem apelidos" ON public.catalogo_apelidos;
CREATE POLICY "catalogo_apelidos_insert_managers" ON public.catalogo_apelidos FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "catalogo_apelidos_update_managers" ON public.catalogo_apelidos FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "catalogo_apelidos_delete_managers" ON public.catalogo_apelidos FOR DELETE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- 6) cotacao_ia_conversas: só admin + administrativo
DROP POLICY IF EXISTS "Equipe interna pode ver conversas IA de cotacao" ON public.cotacao_ia_conversas;
DROP POLICY IF EXISTS "Equipe interna pode criar conversa IA" ON public.cotacao_ia_conversas;
CREATE POLICY "cotacao_ia_conversas_select_managers" ON public.cotacao_ia_conversas FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "cotacao_ia_conversas_insert_managers" ON public.cotacao_ia_conversas FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- 7) Correções IA (CRM e Mafe): leitura admin+adm, insert do próprio autor
DROP POLICY IF EXISTS "Authenticated can read crm_correcoes_ia" ON public.crm_correcoes_ia;
DROP POLICY IF EXISTS "Authenticated can insert crm_correcoes_ia" ON public.crm_correcoes_ia;
CREATE POLICY "crm_correcoes_ia_select_managers" ON public.crm_correcoes_ia FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "crm_correcoes_ia_insert_managers" ON public.crm_correcoes_ia FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

DROP POLICY IF EXISTS "Authenticated can read mafe_correcoes_ia" ON public.mafe_correcoes_ia;
DROP POLICY IF EXISTS "Authenticated can insert mafe_correcoes_ia" ON public.mafe_correcoes_ia;
CREATE POLICY "mafe_correcoes_ia_select_managers" ON public.mafe_correcoes_ia FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "mafe_correcoes_ia_insert_auth" ON public.mafe_correcoes_ia FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8) fornecedor_avaliacoes: leitura interna, escrita gerentes
DROP POLICY IF EXISTS "auth_select_aval" ON public.fornecedor_avaliacoes;
DROP POLICY IF EXISTS "auth_insert_aval" ON public.fornecedor_avaliacoes;
DROP POLICY IF EXISTS "auth_update_aval" ON public.fornecedor_avaliacoes;
DROP POLICY IF EXISTS "auth_delete_aval" ON public.fornecedor_avaliacoes;
CREATE POLICY "fornecedor_avaliacoes_select_managers" ON public.fornecedor_avaliacoes FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "fornecedor_avaliacoes_insert_managers" ON public.fornecedor_avaliacoes FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "fornecedor_avaliacoes_update_managers" ON public.fornecedor_avaliacoes FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "fornecedor_avaliacoes_delete_admin" ON public.fornecedor_avaliacoes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 9) insumo_unidades: leitura interna, escrita gerentes
DROP POLICY IF EXISTS "insumo_unidades_insert_auth" ON public.insumo_unidades;
DROP POLICY IF EXISTS "insumo_unidades_update_auth" ON public.insumo_unidades;
CREATE POLICY "insumo_unidades_insert_managers" ON public.insumo_unidades FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "insumo_unidades_update_managers" ON public.insumo_unidades FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- 10) maquinas_manutencoes: custo financeiro → admin+adm
DROP POLICY IF EXISTS "Authenticated users can read maquinas_manutencoes" ON public.maquinas_manutencoes;
DROP POLICY IF EXISTS "Authenticated users can insert maquinas_manutencoes" ON public.maquinas_manutencoes;
DROP POLICY IF EXISTS "Authenticated users can update maquinas_manutencoes" ON public.maquinas_manutencoes;
DROP POLICY IF EXISTS "Authenticated users can delete maquinas_manutencoes" ON public.maquinas_manutencoes;
CREATE POLICY "maquinas_manutencoes_select_managers" ON public.maquinas_manutencoes FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'gestao_campo'::user_role]));
CREATE POLICY "maquinas_manutencoes_insert_managers" ON public.maquinas_manutencoes FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "maquinas_manutencoes_update_managers" ON public.maquinas_manutencoes FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "maquinas_manutencoes_delete_admin" ON public.maquinas_manutencoes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 11) orcamento_item_fornecedores: preços do orçamento
DROP POLICY IF EXISTS "Authenticated can read item fornecedores" ON public.orcamento_item_fornecedores;
DROP POLICY IF EXISTS "Authenticated can insert item fornecedores" ON public.orcamento_item_fornecedores;
DROP POLICY IF EXISTS "Authenticated can update item fornecedores" ON public.orcamento_item_fornecedores;
DROP POLICY IF EXISTS "Authenticated can delete item fornecedores" ON public.orcamento_item_fornecedores;
CREATE POLICY "oif_select_orcamento_team" ON public.orcamento_item_fornecedores FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]));
CREATE POLICY "oif_insert_orcamento_team" ON public.orcamento_item_fornecedores FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]));
CREATE POLICY "oif_update_orcamento_team" ON public.orcamento_item_fornecedores FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]));
CREATE POLICY "oif_delete_admin" ON public.orcamento_item_fornecedores FOR DELETE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));

-- 12) colaborador_documentos: docs sensíveis → admin+adm ou próprio colaborador
DROP POLICY IF EXISTS "Auth users can read colaborador_documentos" ON public.colaborador_documentos;
DROP POLICY IF EXISTS "Auth users can insert colaborador_documentos" ON public.colaborador_documentos;
DROP POLICY IF EXISTS "Auth users can update colaborador_documentos" ON public.colaborador_documentos;
DROP POLICY IF EXISTS "Auth users can delete colaborador_documentos" ON public.colaborador_documentos;
CREATE POLICY "colab_docs_select_managers_or_self" ON public.colaborador_documentos FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role])
    OR EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_documentos.colaborador_id AND c.user_id = auth.uid())
  );
CREATE POLICY "colab_docs_insert_managers" ON public.colaborador_documentos FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "colab_docs_update_managers" ON public.colaborador_documentos FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "colab_docs_delete_admin" ON public.colaborador_documentos FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 13) historico_precos: preços de fornecedor → admin+adm+diretor+arquitetura
DROP POLICY IF EXISTS "Authenticated can read historico_precos" ON public.historico_precos;
DROP POLICY IF EXISTS "Authenticated can insert historico_precos" ON public.historico_precos;
CREATE POLICY "historico_precos_select_orcamento_team" ON public.historico_precos FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]));
CREATE POLICY "historico_precos_insert_orcamento_team" ON public.historico_precos FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role,'diretor'::user_role,'arquitetura'::user_role]));

-- 14) Storage: colaboradores-documentos → só admin+adm
DROP POLICY IF EXISTS "Auth users can read colab docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload colab docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete colab docs" ON storage.objects;

CREATE POLICY "colab_docs_bucket_select_managers" ON storage.objects FOR SELECT
  USING (bucket_id = 'colaboradores-documentos' AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "colab_docs_bucket_insert_managers" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'colaboradores-documentos' AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "colab_docs_bucket_update_managers" ON storage.objects FOR UPDATE
  USING (bucket_id = 'colaboradores-documentos' AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]))
  WITH CHECK (bucket_id = 'colaboradores-documentos' AND public.has_any_role(auth.uid(), ARRAY['admin'::user_role,'administrativo'::user_role]));
CREATE POLICY "colab_docs_bucket_delete_admin" ON storage.objects FOR DELETE
  USING (bucket_id = 'colaboradores-documentos' AND public.has_role(auth.uid(), 'admin'::user_role));

-- 15) View estoque_saldo → security_invoker (respeita RLS de quem consulta)
ALTER VIEW public.estoque_saldo SET (security_invoker = true);

-- 16) Revogar EXECUTE de anon nas funções SECURITY DEFINER de manutenção interna
REVOKE EXECUTE ON FUNCTION public.mcp_list_public_tables() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mcp_describe_table(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.detectar_fornecedores_duplicados() FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_fornecedores(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_fornecedor_mercado(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ajustar_markup_categoria(uuid, text, numeric, numeric, text) FROM anon;
