CREATE TABLE IF NOT EXISTS public.cotacao_indisponibilidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_tipo text NOT NULL CHECK (item_tipo IN ('planta','insumo','condicionador_solo')),
  data_marcacao date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  registrado_por uuid REFERENCES auth.users(id),
  registrado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, item_id, item_tipo, data_marcacao)
);

CREATE INDEX IF NOT EXISTS idx_cot_indisp_item
  ON public.cotacao_indisponibilidades(item_id, item_tipo);
CREATE INDEX IF NOT EXISTS idx_cot_indisp_fornecedor
  ON public.cotacao_indisponibilidades(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cot_indisp_data
  ON public.cotacao_indisponibilidades(data_marcacao DESC);

ALTER TABLE public.cotacao_indisponibilidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe interna visualiza indisponibilidades"
  ON public.cotacao_indisponibilidades FOR SELECT TO authenticated
  USING (
    public.has_any_role(
      auth.uid(),
      ARRAY[
        'admin'::user_role,
        'administrativo'::user_role,
        'gestao_campo'::user_role,
        'arquitetura'::user_role,
        'responsavel_obra'::user_role,
        'operador_campo'::user_role
      ]
    )
  );

CREATE POLICY "Equipe interna registra indisponibilidades"
  ON public.cotacao_indisponibilidades FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.has_any_role(
      auth.uid(),
      ARRAY[
        'admin'::user_role,
        'administrativo'::user_role,
        'gestao_campo'::user_role,
        'arquitetura'::user_role,
        'responsavel_obra'::user_role,
        'operador_campo'::user_role
      ]
    )
  );

CREATE POLICY "Admin/administrativo edita indisponibilidades"
  ON public.cotacao_indisponibilidades FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));

CREATE POLICY "Apenas admin exclui indisponibilidades"
  ON public.cotacao_indisponibilidades FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE OR REPLACE FUNCTION public.set_indisponibilidade_autoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.registrado_por IS NULL THEN
    NEW.registrado_por := auth.uid();
  END IF;
  IF NEW.registrado_por_nome IS NULL OR NEW.registrado_por_nome = '' THEN
    NEW.registrado_por_nome := COALESCE(
      (SELECT nome FROM public.profiles WHERE id = NEW.registrado_por),
      'Equipe MFM'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_indisponibilidade_autoria ON public.cotacao_indisponibilidades;
CREATE TRIGGER trg_set_indisponibilidade_autoria
  BEFORE INSERT ON public.cotacao_indisponibilidades
  FOR EACH ROW EXECUTE FUNCTION public.set_indisponibilidade_autoria();