CREATE TABLE public.pipelines (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null,
  descricao text,
  ativo boolean default true,
  ordem integer default 0,
  created_at timestamptz default now()
);

INSERT INTO public.pipelines (nome, tipo, descricao, ordem) VALUES
  ('Proposta de Implantação', 'proposta', 'Fluxo completo do pedido à pós-execução', 1),
  ('Projeto', 'projeto', 'Fluxo de desenvolvimento de projeto arquitetônico', 2);

CREATE TABLE public.pipelines_etapas (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references public.pipelines(id) on delete cascade,
  nome text not null,
  ordem integer not null,
  tempo_medio_dias numeric(6,2) default 1,
  area_responsavel text,
  eh_saida boolean default false,
  cor_sugerida text,
  created_at timestamptz default now()
);

INSERT INTO public.pipelines_etapas 
  (pipeline_id, nome, ordem, tempo_medio_dias, area_responsavel, eh_saida)
SELECT id, etapa.nome, etapa.ordem, etapa.dias, etapa.area, etapa.saida
FROM public.pipelines,
  (VALUES
    ('Solicitado', 1, 1, 'comercial', false),
    ('A Quantificar', 2, 1, 'arquitetura', false),
    ('Quantificando', 3, 3, 'arquitetura', false),
    ('Projeto a Desenvolver', 4, 2, 'arquitetura', false),
    ('Projeto em Desenvolvimento', 5, 7, 'arquitetura', false),
    ('A Orçar', 6, 1, 'administrativo', false),
    ('Orçando', 7, 5, 'administrativo', false),
    ('A enviar', 8, 1, 'comercial', false),
    ('Aguardando Aprovação', 9, 20, 'comercial', false),
    ('Planejar Execução', 10, 5, 'gestao_campo', false),
    ('Executando', 11, 15, 'gestao_campo', false),
    ('Retirar Material', 12, 2, 'gestao_campo', false),
    ('Pós Execução', 13, 7, 'comercial', false),
    ('Não Aprovado', 14, 0, 'comercial', true),
    ('Rejeitado', 15, 0, 'comercial', true)
  ) AS etapa(nome, ordem, dias, area, saida)
WHERE pipelines.tipo = 'proposta';

INSERT INTO public.pipelines_etapas 
  (pipeline_id, nome, ordem, tempo_medio_dias, area_responsavel, eh_saida)
SELECT id, etapa.nome, etapa.ordem, etapa.dias, etapa.area, etapa.saida
FROM public.pipelines,
  (VALUES
    ('Solicitado', 1, 1, 'comercial', false),
    ('A Quantificar', 2, 1, 'arquitetura', false),
    ('Quantificando', 3, 3, 'arquitetura', false),
    ('Projeto a Desenvolver', 4, 2, 'arquitetura', false),
    ('Projeto em Desenvolvimento', 5, 7, 'arquitetura', false),
    ('A Entregar', 6, 1, 'arquitetura', false),
    ('Entregue', 7, 0, 'arquitetura', false),
    ('Cancelado', 8, 0, 'comercial', true)
  ) AS etapa(nome, ordem, dias, area, saida)
WHERE pipelines.tipo = 'projeto';

CREATE TABLE public.demandas (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  titulo text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo text not null,
  pipeline_id uuid references public.pipelines(id) on delete set null,
  etapa_atual_id uuid references public.pipelines_etapas(id) on delete set null,
  prioridade text default 'media' check (prioridade in ('critica','alta','media','baixa')),
  responsavel_atual_id uuid references public.colaboradores(id) on delete set null,
  data_entrada date default current_date,
  prazo_final date,
  cronograma_inicio date,
  cronograma_fim date,
  valor numeric(12,2),
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  status_saida text check (status_saida in ('nao_aprovado','rejeitado','cancelado')),
  notas text,
  arquivada boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE public.demanda_etapas_historico (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid references public.demandas(id) on delete cascade,
  etapa_de_id uuid references public.pipelines_etapas(id) on delete set null,
  etapa_para_id uuid references public.pipelines_etapas(id) on delete set null,
  movido_por uuid references public.colaboradores(id) on delete set null,
  tempo_na_etapa_dias numeric(8,2),
  observacao text,
  created_at timestamptz default now()
);

CREATE TABLE public.demanda_responsaveis (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid references public.demandas(id) on delete cascade,
  etapa_id uuid references public.pipelines_etapas(id) on delete set null,
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  papel text,
  created_at timestamptz default now()
);

-- Índices
CREATE INDEX idx_demandas_cliente ON public.demandas(cliente_id);
CREATE INDEX idx_demandas_etapa ON public.demandas(etapa_atual_id);
CREATE INDEX idx_demandas_responsavel ON public.demandas(responsavel_atual_id);
CREATE INDEX idx_demandas_pipeline ON public.demandas(pipeline_id);
CREATE INDEX idx_demandas_prioridade ON public.demandas(prioridade);
CREATE INDEX idx_demanda_historico ON public.demanda_etapas_historico(demanda_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_demandas_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_demandas_updated_at();

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines_etapas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demanda_etapas_historico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demanda_responsaveis TO authenticated;

GRANT ALL ON public.pipelines TO service_role;
GRANT ALL ON public.pipelines_etapas TO service_role;
GRANT ALL ON public.demandas TO service_role;
GRANT ALL ON public.demanda_etapas_historico TO service_role;
GRANT ALL ON public.demanda_responsaveis TO service_role;

-- RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_etapas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_responsaveis ENABLE ROW LEVEL SECURITY;

-- Policies básicas (permissivas por enquanto; refinadas na camada de interface)
CREATE POLICY "Authenticated users can manage pipelines" ON public.pipelines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage pipeline stages" ON public.pipelines_etapas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage demandas" ON public.demandas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage demanda history" ON public.demanda_etapas_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage demanda responsaveis" ON public.demanda_responsaveis FOR ALL TO authenticated USING (true) WITH CHECK (true);