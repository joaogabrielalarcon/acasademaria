-- Drop existing tables
DROP TABLE IF EXISTS orcamento_comissoes CASCADE;
DROP TABLE IF EXISTS orcamento_custos_indiretos CASCADE;
DROP TABLE IF EXISTS orcamento_transporte CASCADE;
DROP TABLE IF EXISTS orcamento_mo CASCADE;
DROP TABLE IF EXISTS orcamento_fretes CASCADE;
DROP TABLE IF EXISTS orcamento_insumos CASCADE;
DROP TABLE IF EXISTS orcamento_cotacoes CASCADE;
DROP TABLE IF EXISTS orcamento_itens CASCADE;
DROP TABLE IF EXISTS orcamento_versoes CASCADE;
DROP TABLE IF EXISTS orcamento_checklist CASCADE;
DROP TABLE IF EXISTS orcamentos CASCADE;
DROP TABLE IF EXISTS perfis_markup_categorias CASCADE;
DROP TABLE IF EXISTS perfis_markup CASCADE;
DROP TABLE IF EXISTS coeficientes_insumos CASCADE;
DROP TABLE IF EXISTS cargos_mo CASCADE;
DROP TABLE IF EXISTS tipos_proposta CASCADE;
DROP TABLE IF EXISTS historico_precos_fornecedor CASCADE;

-- TIPOS DE PROPOSTA
CREATE TABLE tipos_proposta (
  id uuid primary key default gen_random_uuid(),
  sigla text not null unique,
  nome_completo text not null,
  descricao text,
  ativo boolean default true,
  created_at timestamptz default now()
);

INSERT INTO tipos_proposta (sigla, nome_completo, descricao) VALUES
  ('PI','Proposta de Implantação','Novo projeto paisagístico do zero'),
  ('PD','Proposta de Desenvolvimento de Projeto','Elaboração do projeto técnico paisagístico'),
  ('PMO','Proposta de Fornecimento de Mão de Obra','Apenas equipe, sem fornecimento de materiais'),
  ('PM','Proposta de Manutenção','Manutenção recorrente de área existente'),
  ('PR','Proposta de Revitalização','Reforma e renovação de área existente'),
  ('PF','Proposta de Fornecimento de Plantas','Apenas venda de material vegetal');

-- CARGOS E SALÁRIOS
CREATE TABLE cargos_mo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  salario_mensal numeric(10,2) not null,
  salario_diario numeric(10,2) generated always as (salario_mensal / 21) stored,
  membros text,
  ativo boolean default true,
  created_at timestamptz default now()
);

INSERT INTO cargos_mo (nome, salario_mensal, membros) VALUES
  ('Jardineiro I', 3833.27, 'Iara, Ivomar, Elias, José Adaldo, Tamara'),
  ('Jardineiro II', 5089.88, 'Arlécio, Wellington, Joseli'),
  ('Jardineiro III', 5755.26, 'Renato, Pedro'),
  ('Supervisor de Jardinagem', 5988.08, 'Samuel'),
  ('Administrativo', 6457.73, 'escritório'),
  ('Maria Fernanda', 11500.00, 'diretora');

-- PERFIS DE MARKUP
CREATE TABLE perfis_markup (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativo boolean default true,
  criado_por uuid references colaboradores(id) on delete set null,
  created_at timestamptz default now()
);

CREATE TABLE perfis_markup_categorias (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references perfis_markup(id) on delete cascade,
  categoria text not null,
  markup_pct numeric(8,4) not null,
  imposto_pct numeric(8,4) default 0,
  created_at timestamptz default now()
);

-- COEFICIENTES DE INSUMOS POR TIPO DE PLANTA
CREATE TABLE coeficientes_insumos (
  id uuid primary key default gen_random_uuid(),
  tipo_planta text not null,
  mo_por_unidade numeric(10,6) default 0,
  terra_por_unidade numeric(10,6) default 0,
  adubo_por_unidade numeric(10,6) default 0,
  munck_por_unidade numeric(10,6) default 0,
  corda_por_unidade numeric(10,6) default 0,
  vigente boolean default true,
  versao integer default 1,
  criado_por uuid references colaboradores(id) on delete set null,
  created_at timestamptz default now()
);

INSERT INTO coeficientes_insumos
  (tipo_planta, mo_por_unidade, terra_por_unidade, adubo_por_unidade, munck_por_unidade, corda_por_unidade)
VALUES
  ('forracao', 0.01, 0.01, 0.000429, 0, 0),
  ('arbusto_pequeno', 0, 0, 0, 0, 0),
  ('arbusto_medio', 0.00833, 0.0128, 0.00143, 0, 0),
  ('arbusto_grande', 0, 0, 0, 0, 0),
  ('gramado', 0.00625, 0.0125, 0.001428, 0, 0),
  ('arvore_dap15', 0.2428, 0.25, 0.02856, 0.1428, 15),
  ('palmeira_pequena', 0, 0, 0, 0, 0),
  ('palmeira_grande', 0, 0, 0, 0, 0);

-- ORÇAMENTOS (cabeçalho)
CREATE TABLE orcamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  versao_sufixo text,
  tipo_proposta_id uuid references tipos_proposta(id),
  cliente_id uuid references clientes(id) on delete set null,
  local_endereco text,
  tipo_cliente text check (tipo_cliente in (
    'residencial','condominio','resort','hotel','comercial'
  )),
  cidade text,
  estado char(2),
  area_m2 numeric(10,2),
  status text not null default 'rascunho' check (status in (
    'rascunho','em_cotacao','aguardando_aprovacao',
    'expirado','aprovado','cancelado','revisao'
  )),
  perfil_markup_id uuid references perfis_markup(id),
  responsavel_id uuid references colaboradores(id) on delete set null,
  data_criacao date default current_date,
  data_envio date,
  prazo_validade_dias integer default 20,
  data_expiracao date generated always as (data_envio + prazo_validade_dias) stored,
  obs_interna text,
  obs_proposta text,
  valor_negociado_final numeric(12,2),
  margem_negociacao_pct numeric(5,2) default 0,
  data_aprovacao timestamptz,
  aprovado_por uuid references colaboradores(id) on delete set null,
  aliquota_mes_pct numeric(5,2) default 8.09,
  tipo_nf text default 'pj' check (tipo_nf in ('pj','cpf')),
  editavel boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- VERSÕES
CREATE TABLE orcamento_versoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  versao_sufixo text,
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  motivo text,
  usuario_id uuid references colaboradores(id) on delete set null,
  created_at timestamptz default now()
);

-- ITENS
CREATE TABLE orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  categoria text,
  nome_popular text not null,
  nome_cientifico text,
  porte_solicitado text,
  quantidade_esperada numeric(10,2) not null,
  margem_seguranca_pct numeric(5,2) default 0,
  quantidade_orcar numeric(10,2),
  unidade text,
  origem text default 'manual' check (origem in ('pdf_ia','manual')),
  fornecedor_escolhido_id uuid references fornecedores(id) on delete set null,
  custo_unitario numeric(10,2),
  porte_fornecedor text,
  porte_divergente boolean default false,
  markup_pct numeric(8,4),
  markup_motivo text,
  preco_venda_unitario numeric(10,2),
  imposto_pct numeric(5,2) default 13.5,
  preco_venda_final numeric(10,2),
  margem_bruta_pct numeric(5,2),
  obs_interna text,
  obs_proposta text,
  ordem integer default 0,
  created_at timestamptz default now()
);

-- COTAÇÕES
CREATE TABLE orcamento_cotacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references orcamento_itens(id) on delete cascade,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  valor_unitario_cotado numeric(10,2),
  porte_ofertado text,
  unidade_ofertada text,
  disponivel text default 'nao_consultado'
    check (disponivel in ('sim','nao','nao_consultado')),
  status_selecao text default 'descartado'
    check (status_selecao in ('principal','backup1','backup2','descartado')),
  obs text,
  cotado_em timestamptz default now(),
  cotado_por uuid references colaboradores(id) on delete set null
);

-- INSUMOS
CREATE TABLE orcamento_insumos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  insumo_id uuid references insumos(id) on delete set null,
  nome text not null,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  quantidade_esperada numeric(10,2),
  margem_seguranca_pct numeric(5,2) default 0,
  quantidade_orcar numeric(10,2),
  unidade text,
  valor_unitario numeric(10,2),
  valor_total numeric(12,2),
  markup_pct numeric(8,4),
  preco_venda_unitario numeric(10,2),
  preco_venda_total numeric(12,2),
  calculado_automaticamente boolean default false,
  obs_interna text,
  obs_proposta text,
  ordem integer default 0,
  created_at timestamptz default now()
);

-- FRETES
CREATE TABLE orcamento_fretes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  transportador text,
  descricao_percurso text not null,
  valor_unitario numeric(10,2),
  qtd_esperada numeric(8,2),
  margem_seguranca_pct numeric(5,2) default 0,
  qtd_orcar numeric(8,2),
  valor_total numeric(12,2),
  obs text,
  created_at timestamptz default now()
);

-- MÃO DE OBRA
CREATE TABLE orcamento_mo (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  cargo_id uuid references cargos_mo(id) on delete set null,
  qtd_funcionarios integer default 1,
  qtd_dias numeric(8,2),
  salario_diario numeric(10,2),
  custo_total numeric(12,2),
  aliquota_mes_pct numeric(5,2),
  tipo_nf text default 'pj' check (tipo_nf in ('pj','cpf')),
  valor_com_imposto numeric(12,2),
  created_at timestamptz default now()
);

-- TRANSPORTE
CREATE TABLE orcamento_transporte (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  tipo text check (tipo in ('mfm','moto','carro')),
  valor_km numeric(8,4),
  qtd_dias integer,
  qtd_km numeric(8,2),
  subtotal numeric(12,2),
  created_at timestamptz default now()
);

-- CUSTOS INDIRETOS
CREATE TABLE orcamento_custos_indiretos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  tipo text,
  descricao text,
  valor_unitario numeric(10,2),
  quantidade numeric(8,2),
  total numeric(12,2),
  obs text,
  created_at timestamptz default now()
);

-- COMISSÕES
CREATE TABLE orcamento_comissoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  tipo text check (tipo in ('vendas','indicacao')),
  percentual numeric(5,2),
  beneficiario text,
  valor_calculado numeric(12,2),
  created_at timestamptz default now()
);

-- CHECKLIST
CREATE TABLE orcamento_checklist (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references orcamentos(id) on delete cascade,
  item_id uuid references orcamento_itens(id) on delete set null,
  recebido text default 'pendente'
    check (recebido in ('sim','nao','pendente')),
  fornecedor_id uuid references fornecedores(id) on delete set null,
  qtd_recebida numeric(10,2),
  unidade text,
  obs text,
  recebido_em timestamptz,
  recebido_por uuid references colaboradores(id) on delete set null,
  created_at timestamptz default now()
);

-- HISTÓRICO PREÇOS FORNECEDOR
CREATE TABLE historico_precos_fornecedor (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references fornecedores(id) on delete cascade,
  planta_id uuid references plantas(id) on delete set null,
  porte text,
  unidade text,
  preco numeric(10,2) not null,
  projeto_id uuid references orcamentos(id) on delete set null,
  data_cotacao date not null,
  created_at timestamptz default now()
);

-- ÍNDICES
CREATE INDEX idx_orcamentos_cliente ON orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status ON orcamentos(status);
CREATE INDEX idx_orcamentos_codigo ON orcamentos(codigo);
CREATE INDEX idx_itens_orcamento ON orcamento_itens(orcamento_id);
CREATE INDEX idx_cotacoes_item ON orcamento_cotacoes(item_id);
CREATE INDEX idx_historico_fornecedor ON historico_precos_fornecedor(fornecedor_id, planta_id);

-- TRIGGER updated_at
CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE tipos_proposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_markup ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_markup_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE coeficientes_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos_mo ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_fretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_mo ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_custos_indiretos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_precos_fornecedor ENABLE ROW LEVEL SECURITY;

-- Policies: admin/administrativo/diretor full access on all tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tipos_proposta','perfis_markup','perfis_markup_categorias','coeficientes_insumos','cargos_mo',
    'orcamentos','orcamento_versoes','orcamento_itens','orcamento_cotacoes','orcamento_insumos',
    'orcamento_fretes','orcamento_mo','orcamento_transporte','orcamento_custos_indiretos',
    'orcamento_comissoes','orcamento_checklist','historico_precos_fornecedor'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''admin''::user_role, ''administrativo''::user_role, ''diretor''::user_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY[''admin''::user_role, ''administrativo''::user_role, ''diretor''::user_role]))', t || '_full_access', t);
  END LOOP;
END $$;