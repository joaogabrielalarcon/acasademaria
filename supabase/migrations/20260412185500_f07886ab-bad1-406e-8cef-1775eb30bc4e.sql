
-- ============================================================
-- INSUMOS — add updated_at first to fix trigger
-- ============================================================
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS fornecedor_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'insumos_fornecedor_id_fkey' AND table_name = 'insumos'
  ) THEN
    ALTER TABLE public.insumos ADD CONSTRAINT insumos_fornecedor_id_fkey
      FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS descricao_produto text;
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS volume_apresentacao text;

UPDATE public.insumos SET categoria = 'Fertilizante' WHERE categoria = 'Fertilizantes';

ALTER TABLE public.insumos DROP CONSTRAINT IF EXISTS insumos_categoria_check;
ALTER TABLE public.insumos ADD CONSTRAINT insumos_categoria_check
  CHECK (categoria IS NULL OR categoria IN (
    'Fertilizante','Substrato','Defensivo','Semente','Ferramenta',
    'Irrigação','Vasos / Decoração','Materiais Construtivos','Outros'
  ));

ALTER TABLE public.insumos DROP CONSTRAINT IF EXISTS insumos_unidade_check;
ALTER TABLE public.insumos ADD CONSTRAINT insumos_unidade_check
  CHECK (unidade IS NULL OR unidade IN (
    'un','kg','litro','m','m²','m³','par','caixa','saco','galão','rolo','pacote',
    'Ton','Rolo','Peça','Vaso'
  ));

-- ============================================================
-- FORNECEDORES
-- ============================================================
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS mercado text
  CHECK (mercado IS NULL OR mercado IN (
    'Ceagesp','Ceaflor','Jundiaí','Ceasa','Itapetininga','Atibaia',
    'Limeira','Ceasa Campinas','São Roque','Boituva','Miracatu',
    'Amparo','Joanópolis','Holambra','Jarinu','Cabreúva','Outros'
  ));

ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS categoria_fornecedor text
  CHECK (categoria_fornecedor IS NULL OR categoria_fornecedor IN (
    'Viveiro / Produtor','Atacadista / Distribuidor',
    'Fornecedor Diverso','Insumos Agrícolas',
    'Materiais / Insumos Construtivos','Vasos / Decoração',
    'Insumos/Materiais'
  ));

ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS nome_alternativo text;

-- ============================================================
-- HISTORICO DE PRECOS
-- ============================================================
DROP TRIGGER IF EXISTS trg_log_preco_planta ON public.plantas;
DROP TRIGGER IF EXISTS trg_log_preco_insumo ON public.insumos;
DROP TABLE IF EXISTS public.historico_precos CASCADE;

CREATE TABLE public.historico_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_tipo text NOT NULL CHECK (item_tipo IN ('planta','insumo')),
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  preco numeric(10,2) NOT NULL,
  data_orcamento date NOT NULL,
  registrado_por uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  observacoes text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_historico_item ON public.historico_precos(item_id, item_tipo);
CREATE INDEX idx_historico_data ON public.historico_precos(data_orcamento DESC);

ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_historico" ON public.historico_precos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_historico" ON public.historico_precos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_historico" ON public.historico_precos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_historico" ON public.historico_precos FOR DELETE TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_precos TO authenticated;
GRANT SELECT ON public.historico_precos TO anon;

CREATE OR REPLACE FUNCTION public.log_preco_planta()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario AND NEW.preco_unitario IS NOT NULL THEN
    INSERT INTO public.historico_precos (item_id, item_tipo, fornecedor_id, preco, data_orcamento, registrado_por)
    VALUES (NEW.id, 'planta', NEW.fornecedor_id, NEW.preco_unitario, CURRENT_DATE,
      (SELECT id FROM public.colaboradores WHERE user_id = auth.uid() AND ativo = true LIMIT 1));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_log_preco_planta
  AFTER UPDATE ON public.plantas FOR EACH ROW EXECUTE FUNCTION public.log_preco_planta();

CREATE OR REPLACE FUNCTION public.log_preco_insumo()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario AND NEW.preco_unitario IS NOT NULL THEN
    INSERT INTO public.historico_precos (item_id, item_tipo, fornecedor_id, preco, data_orcamento, registrado_por)
    VALUES (NEW.id, 'insumo', NEW.fornecedor_id, NEW.preco_unitario, CURRENT_DATE,
      (SELECT id FROM public.colaboradores WHERE user_id = auth.uid() AND ativo = true LIMIT 1));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_log_preco_insumo
  AFTER UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.log_preco_insumo();
