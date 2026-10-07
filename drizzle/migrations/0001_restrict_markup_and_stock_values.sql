-- G1: markup readable only by management roles
DROP POLICY IF EXISTS ocm_select_authenticated ON public.orcamento_categorias_markup;
CREATE POLICY ocm_select_gestao ON public.orcamento_categorias_markup
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[]));

-- G2: field keeps reading stock rows, but never the two money columns
REVOKE SELECT ON public.estoque_movimentacoes FROM authenticated, anon;
GRANT SELECT (id, item_id, item_tipo, tipo_movimento, quantidade, fornecedor_id, origem,
  referencia_id, observacoes, registrado_por_nome, created_at)
  ON public.estoque_movimentacoes TO authenticated;

-- Management reads the money columns through this function only
CREATE OR REPLACE FUNCTION public.estoque_valores(_ids uuid[])
RETURNS TABLE(id uuid, preco_unitario numeric, valor_total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT m.id, m.preco_unitario::numeric, m.valor_total::numeric
  FROM public.estoque_movimentacoes m
  WHERE m.id = ANY(_ids)
    AND public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[])
$$;
REVOKE EXECUTE ON FUNCTION public.estoque_valores(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estoque_valores(uuid[]) TO authenticated;
COMMENT ON FUNCTION public.estoque_valores(uuid[]) IS 'Returns stock money columns only to management roles; field roles get no rows.';