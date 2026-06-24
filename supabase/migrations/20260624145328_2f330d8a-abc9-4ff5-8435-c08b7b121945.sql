
-- 1. Garantir unicidade do codigo do orçamento
CREATE UNIQUE INDEX IF NOT EXISTS orcamentos_codigo_uniq ON public.orcamentos(codigo);

-- 2. Função atômica para gerar código sigla+sequencial+mes+ano (ex: PI011225)
CREATE OR REPLACE FUNCTION public.gerar_codigo_orcamento(p_sigla text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'MM');
  v_ano text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YY');
  v_prefix text := upper(coalesce(p_sigla,''));
  v_lockkey bigint := abs(hashtext('orcamento_codigo:' || v_prefix || v_mes || v_ano));
  v_seq int;
  v_codigo text;
BEGIN
  IF v_prefix = '' THEN
    RAISE EXCEPTION 'sigla obrigatória';
  END IF;
  PERFORM pg_advisory_xact_lock(v_lockkey);

  SELECT COALESCE(MAX(
    CASE
      WHEN substring(codigo from '^' || v_prefix || '(\d{2})' || v_mes || v_ano || '$') ~ '^\d{2}$'
        THEN substring(codigo from '^' || v_prefix || '(\d{2})' || v_mes || v_ano || '$')::int
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM public.orcamentos
  WHERE codigo ~ ('^' || v_prefix || '\d{2}' || v_mes || v_ano || '$');

  v_codigo := v_prefix || lpad(v_seq::text, 2, '0') || v_mes || v_ano;
  RETURN v_codigo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_codigo_orcamento(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_codigo_orcamento(text) TO service_role;

-- 3. Versões: campos para o fluxo "humano escreve / IA aperfeiçoa / humano valida"
ALTER TABLE public.orcamento_versoes
  ADD COLUMN IF NOT EXISTS comentario_humano text,
  ADD COLUMN IF NOT EXISTS comentario_final text,
  ADD COLUMN IF NOT EXISTS de_para jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_id uuid REFERENCES public.orcamento_snapshots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS totais jsonb;

-- 4. Snapshot referencia o sufixo da versão (primeira versão = '' = sem letra)
ALTER TABLE public.orcamento_snapshots
  ADD COLUMN IF NOT EXISTS versao_sufixo text;

CREATE INDEX IF NOT EXISTS orcamento_versoes_orcamento_idx
  ON public.orcamento_versoes(orcamento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orcamento_snapshots_orcamento_idx
  ON public.orcamento_snapshots(orcamento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orcamento_versoes_busca_idx
  ON public.orcamento_versoes USING gin (to_tsvector('portuguese', coalesce(comentario_final,'') || ' ' || coalesce(comentario_humano,'') || ' ' || coalesce(versao_sufixo,'')));
