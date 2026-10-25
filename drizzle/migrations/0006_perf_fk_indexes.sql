CREATE INDEX IF NOT EXISTS idx_locais_cliente_cliente_id ON public.locais_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_projetos_local_id ON public.projetos(local_id);
CREATE INDEX IF NOT EXISTS idx_registros_local_id ON public.registros(local_id);
CREATE INDEX IF NOT EXISTS idx_historico_precos_fornecedor_id ON public.historico_precos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_fornecedor_escolhido_id ON public.orcamento_itens(fornecedor_escolhido_id);
CREATE INDEX IF NOT EXISTS idx_demandas_orcamento_id ON public.demandas(orcamento_id);