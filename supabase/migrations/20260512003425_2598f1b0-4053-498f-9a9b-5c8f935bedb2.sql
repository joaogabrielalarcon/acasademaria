
CREATE OR REPLACE FUNCTION public.ajustar_markup_categoria(
  p_orcamento_id uuid,
  p_categoria text,
  p_markup_pct numeric,
  p_margem_pct numeric,
  p_motivo text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_any_role(v_user, ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]) THEN
    RAISE EXCEPTION 'Sem permissão para ajustar markup';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'Motivo obrigatório com pelo menos 10 caracteres';
  END IF;
  IF p_markup_pct < 0 OR p_margem_pct < 0 OR p_margem_pct >= 100 THEN
    RAISE EXCEPTION 'Valores inválidos';
  END IF;

  -- Disponibiliza motivo para o trigger audit_orcamento_markup_change
  PERFORM set_config('app.markup_motivo', p_motivo, true);

  -- Upsert
  INSERT INTO public.orcamento_categorias_markup (
    orcamento_id, categoria, markup_pct, margem_pct, ajustado_manualmente
  ) VALUES (
    p_orcamento_id, p_categoria, p_markup_pct, p_margem_pct, true
  )
  ON CONFLICT (orcamento_id, categoria) DO UPDATE
  SET markup_pct = EXCLUDED.markup_pct,
      margem_pct = EXCLUDED.margem_pct,
      ajustado_manualmente = true,
      updated_at = now();
END;
$$;
