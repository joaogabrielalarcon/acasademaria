CREATE OR REPLACE FUNCTION public.estoque_valores(_ids uuid[])
 RETURNS TABLE(id uuid, preco_unitario numeric, valor_total numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','administrativo','gestor','diretor']::public.user_role[]) THEN
    RAISE EXCEPTION 'Os valores do estoque não estão no seu acesso.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT m.id, m.preco_unitario::numeric, m.valor_total::numeric
    FROM public.estoque_movimentacoes m
    WHERE m.id = ANY(_ids);
END;
$function$;