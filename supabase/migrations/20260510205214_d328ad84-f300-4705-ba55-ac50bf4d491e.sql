CREATE OR REPLACE FUNCTION public.set_fornecedor_mercado(p_fornecedor_id uuid, p_mercado text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_valor text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_valor := NULLIF(btrim(p_mercado), '');
  IF v_valor IS NULL THEN
    RAISE EXCEPTION 'Mercado inválido';
  END IF;

  UPDATE public.fornecedores
  SET mercado = v_valor,
      updated_at = now(),
      updated_by = v_user
  WHERE id = p_fornecedor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fornecedor não encontrado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_fornecedor_mercado(uuid, text) TO authenticated;