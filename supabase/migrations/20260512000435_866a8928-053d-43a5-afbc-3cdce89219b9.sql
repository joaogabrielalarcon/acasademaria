
CREATE TABLE IF NOT EXISTS public.cotacao_ia_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','aplicada','descartada')),
  mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  propostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  atualizacoes_aplicadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_mensagens int NOT NULL DEFAULT 0,
  total_atualizacoes int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  aplicado_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ciacv_orcamento ON public.cotacao_ia_conversas(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_ciacv_fornecedor ON public.cotacao_ia_conversas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_ciacv_status ON public.cotacao_ia_conversas(status);
CREATE INDEX IF NOT EXISTS idx_ciacv_criado_em ON public.cotacao_ia_conversas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ciacv_criado_por ON public.cotacao_ia_conversas(criado_por);

ALTER TABLE public.cotacao_ia_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe interna pode ver conversas IA de cotacao"
ON public.cotacao_ia_conversas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Equipe interna pode criar conversa IA"
ON public.cotacao_ia_conversas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autor ou admins podem atualizar conversa IA"
ON public.cotacao_ia_conversas FOR UPDATE TO authenticated
USING (
  criado_por = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::user_role)
  OR public.has_role(auth.uid(), 'administrativo'::user_role)
)
WITH CHECK (true);

CREATE POLICY "Apenas admin pode excluir conversa IA"
ON public.cotacao_ia_conversas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE OR REPLACE FUNCTION public.tg_set_updated_at_cotacao_ia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_set_updated_at_cotacao_ia ON public.cotacao_ia_conversas;
CREATE TRIGGER trg_set_updated_at_cotacao_ia
BEFORE UPDATE ON public.cotacao_ia_conversas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_cotacao_ia();

CREATE OR REPLACE FUNCTION public.tg_set_autor_cotacao_ia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.criado_por IS NULL THEN NEW.criado_por := auth.uid(); END IF;
  IF NEW.criado_por_nome IS NULL AND NEW.criado_por IS NOT NULL THEN
    SELECT nome INTO NEW.criado_por_nome FROM public.colaboradores WHERE user_id = NEW.criado_por LIMIT 1;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_autor_cotacao_ia ON public.cotacao_ia_conversas;
CREATE TRIGGER trg_set_autor_cotacao_ia
BEFORE INSERT ON public.cotacao_ia_conversas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_autor_cotacao_ia();
