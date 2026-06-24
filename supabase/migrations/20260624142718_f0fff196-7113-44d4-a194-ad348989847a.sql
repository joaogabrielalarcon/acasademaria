
-- Item-level markup overrides with audit trail across all cost tables

-- 1. orcamento_itens — material com preço de venda específico
ALTER TABLE public.orcamento_itens
  ADD COLUMN IF NOT EXISTS markup_override_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS preco_venda_override numeric(14,4),
  ADD COLUMN IF NOT EXISTS ajustado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ajustado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ajuste_obs text;

-- 2. orcamento_insumos
ALTER TABLE public.orcamento_insumos
  ADD COLUMN IF NOT EXISTS markup_override_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS ajustado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ajustado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ajuste_obs text;

-- 3. orcamento_mo
ALTER TABLE public.orcamento_mo
  ADD COLUMN IF NOT EXISTS markup_override_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS ajustado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ajustado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ajuste_obs text;

-- 4. orcamento_fretes
ALTER TABLE public.orcamento_fretes
  ADD COLUMN IF NOT EXISTS markup_override_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS ajustado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ajustado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ajuste_obs text;

-- 5. orcamento_transporte
ALTER TABLE public.orcamento_transporte
  ADD COLUMN IF NOT EXISTS markup_override_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS ajustado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ajustado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ajuste_obs text;

-- 6. orcamento_custos_indiretos
ALTER TABLE public.orcamento_custos_indiretos
  ADD COLUMN IF NOT EXISTS markup_override_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS ajustado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ajustado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ajuste_obs text;

-- 7. Trigger function compartilhada: ao mudar markup_override_pct ou preco_venda_override,
-- preenche ajustado_por/ajustado_em automaticamente.
CREATE OR REPLACE FUNCTION public.stamp_orcamento_item_override()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND (NEW.markup_override_pct IS NOT NULL OR NEW.preco_venda_override IS NOT NULL))
     OR (TG_OP = 'UPDATE' AND (
          NEW.markup_override_pct IS DISTINCT FROM OLD.markup_override_pct
          OR NEW.preco_venda_override IS DISTINCT FROM OLD.preco_venda_override
        )) THEN
    -- Só carimba se o override está presente; ao limpar, reseta os carimbos.
    IF NEW.markup_override_pct IS NULL AND COALESCE(NEW.preco_venda_override, 0) = 0 THEN
      NEW.ajustado_por := NULL;
      NEW.ajustado_em := NULL;
      NEW.ajuste_obs := NULL;
    ELSE
      NEW.ajustado_por := COALESCE(auth.uid(), NEW.ajustado_por);
      NEW.ajustado_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Versão para tabelas sem preco_venda_override (só markup)
CREATE OR REPLACE FUNCTION public.stamp_orcamento_markup_override()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.markup_override_pct IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.markup_override_pct IS DISTINCT FROM OLD.markup_override_pct) THEN
    IF NEW.markup_override_pct IS NULL THEN
      NEW.ajustado_por := NULL;
      NEW.ajustado_em := NULL;
      NEW.ajuste_obs := NULL;
    ELSE
      NEW.ajustado_por := COALESCE(auth.uid(), NEW.ajustado_por);
      NEW.ajustado_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_orcamento_itens_override_stamp ON public.orcamento_itens;
CREATE TRIGGER trg_orcamento_itens_override_stamp
  BEFORE INSERT OR UPDATE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.stamp_orcamento_item_override();

DROP TRIGGER IF EXISTS trg_orcamento_insumos_override_stamp ON public.orcamento_insumos;
CREATE TRIGGER trg_orcamento_insumos_override_stamp
  BEFORE INSERT OR UPDATE ON public.orcamento_insumos
  FOR EACH ROW EXECUTE FUNCTION public.stamp_orcamento_markup_override();

DROP TRIGGER IF EXISTS trg_orcamento_mo_override_stamp ON public.orcamento_mo;
CREATE TRIGGER trg_orcamento_mo_override_stamp
  BEFORE INSERT OR UPDATE ON public.orcamento_mo
  FOR EACH ROW EXECUTE FUNCTION public.stamp_orcamento_markup_override();

DROP TRIGGER IF EXISTS trg_orcamento_fretes_override_stamp ON public.orcamento_fretes;
CREATE TRIGGER trg_orcamento_fretes_override_stamp
  BEFORE INSERT OR UPDATE ON public.orcamento_fretes
  FOR EACH ROW EXECUTE FUNCTION public.stamp_orcamento_markup_override();

DROP TRIGGER IF EXISTS trg_orcamento_transporte_override_stamp ON public.orcamento_transporte;
CREATE TRIGGER trg_orcamento_transporte_override_stamp
  BEFORE INSERT OR UPDATE ON public.orcamento_transporte
  FOR EACH ROW EXECUTE FUNCTION public.stamp_orcamento_markup_override();

DROP TRIGGER IF EXISTS trg_orcamento_indiretos_override_stamp ON public.orcamento_custos_indiretos;
CREATE TRIGGER trg_orcamento_indiretos_override_stamp
  BEFORE INSERT OR UPDATE ON public.orcamento_custos_indiretos
  FOR EACH ROW EXECUTE FUNCTION public.stamp_orcamento_markup_override();
