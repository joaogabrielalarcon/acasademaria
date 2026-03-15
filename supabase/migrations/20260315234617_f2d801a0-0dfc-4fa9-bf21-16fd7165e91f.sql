
-- CRM Cards table
CREATE TABLE public.crm_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('Obra', 'Proposta', 'Manutencao', 'Tarefa')),
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead', 'Proposta Enviada', 'Aprovado', 'Em Execucao', 'Concluido', 'Pos-venda', 'Nao Aprovado')),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  contato_nome text,
  contato_cargo text,
  contato_whatsapp text,
  contato_email text,
  prazo date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CRM Histórico table (immutable - insert only)
CREATE TABLE public.crm_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.crm_cards(id) ON DELETE CASCADE NOT NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- CRM Follow-ups table
CREATE TABLE public.crm_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.crm_cards(id) ON DELETE CASCADE NOT NULL,
  data_retorno date NOT NULL,
  dias_alerta integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Feito', 'Adiado')),
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_cards
CREATE POLICY "Authenticated users can select crm_cards" ON public.crm_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crm_cards" ON public.crm_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crm_cards" ON public.crm_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete crm_cards" ON public.crm_cards FOR DELETE TO authenticated USING (true);

-- RLS Policies for crm_historico (insert only for users)
CREATE POLICY "Authenticated users can select crm_historico" ON public.crm_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crm_historico" ON public.crm_historico FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for crm_followups
CREATE POLICY "Authenticated users can select crm_followups" ON public.crm_followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crm_followups" ON public.crm_followups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crm_followups" ON public.crm_followups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete crm_followups" ON public.crm_followups FOR DELETE TO authenticated USING (true);

-- Updated_at trigger for crm_cards
CREATE TRIGGER update_crm_cards_updated_at BEFORE UPDATE ON public.crm_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
