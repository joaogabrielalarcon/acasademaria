-- Tabela: cotacao_disparos
-- Histórico de disparos de pedidos de cotação para fornecedores
CREATE TABLE IF NOT EXISTS public.cotacao_disparos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  atendente_id UUID REFERENCES public.fornecedor_atendentes(id) ON DELETE SET NULL,
  atendente_nome TEXT,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  mensagem TEXT NOT NULL,
  itens_resumo JSONB NOT NULL DEFAULT '[]'::jsonb,
  origem TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  disparado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disparado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices nas FKs e colunas frequentes
CREATE INDEX IF NOT EXISTS idx_cotacao_disparos_orcamento ON public.cotacao_disparos(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_disparos_fornecedor ON public.cotacao_disparos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_disparos_atendente ON public.cotacao_disparos(atendente_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_disparos_disparado_por ON public.cotacao_disparos(disparado_por);
CREATE INDEX IF NOT EXISTS idx_cotacao_disparos_created_at ON public.cotacao_disparos(created_at DESC);

-- RLS
ALTER TABLE public.cotacao_disparos ENABLE ROW LEVEL SECURITY;

-- Leitura: time interno
CREATE POLICY "Time interno visualiza disparos"
ON public.cotacao_disparos FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY[
  'admin'::user_role, 'administrativo'::user_role,
  'arquitetura'::user_role, 'gestao_campo'::user_role
]));

-- Insert: time interno (qualquer pessoa que tenha permissão de orçamento)
CREATE POLICY "Time interno registra disparos"
ON public.cotacao_disparos FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY[
  'admin'::user_role, 'administrativo'::user_role,
  'arquitetura'::user_role, 'gestao_campo'::user_role
]));

-- Sem UPDATE para usuários (registro forense imutável)
-- Apenas admin pode deletar (limpeza eventual)
CREATE POLICY "Admin pode deletar disparos"
ON public.cotacao_disparos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Trigger: preencher autoria automaticamente
CREATE OR REPLACE FUNCTION public.set_cotacao_disparo_autoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.disparado_por := COALESCE(NEW.disparado_por, auth.uid());
  IF NEW.disparado_por_nome IS NULL OR NEW.disparado_por_nome = '' THEN
    SELECT nome INTO NEW.disparado_por_nome FROM public.profiles WHERE id = NEW.disparado_por;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotacao_disparo_autoria ON public.cotacao_disparos;
CREATE TRIGGER trg_cotacao_disparo_autoria
BEFORE INSERT ON public.cotacao_disparos
FOR EACH ROW EXECUTE FUNCTION public.set_cotacao_disparo_autoria();