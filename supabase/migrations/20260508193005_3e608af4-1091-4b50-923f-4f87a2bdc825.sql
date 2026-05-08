
-- Drop legacy orcamento tables (will be recreated with new schema)
DROP TABLE IF EXISTS public.orcamento_cotacoes CASCADE;
DROP TABLE IF EXISTS public.orcamento_itens CASCADE;

-- Tipos de proposta
CREATE TABLE public.tipos_proposta (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  ativo boolean default true,
  created_at timestamptz default now()
);

INSERT INTO public.tipos_proposta (codigo, nome) VALUES
  ('PI', 'Proposta de Implantação'),
  ('PD', 'Proposta de Desenvolvimento de Projeto'),
  ('PMO', 'Proposta de Fornecimento de Mão de Obra'),
  ('PM', 'Proposta de Manutenção'),
  ('PR', 'Proposta de Revitalização'),
  ('PF', 'Proposta de Fornecimento de Plantas')
ON CONFLICT (codigo) DO NOTHING;

-- Perfis de markup por categoria
CREATE TABLE public.perfis_markup (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  arbustos_herbaceas numeric(5,2),
  arvores numeric(5,2),
  forracoes numeric(5,2),
  gramado numeric(5,2),
  palmeiras numeric(5,2),
  vasos numeric(5,2),
  insumos_solo numeric(5,2),
  insumos_acabamento numeric(5,2),
  mao_de_obra numeric(5,2),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Coeficientes de insumos por tipo de planta
CREATE TABLE public.coeficientes_insumos (
  id uuid primary key default gen_random_uuid(),
  tipo_planta text not null,
  mo_dias numeric(8,4) default 0,
  terra_m3 numeric(8,4) default 0,
  adubo_kits numeric(8,4) default 0,
  munck_dias numeric(8,4) default 0,
  corda_metros numeric(8,4) default 0,
  versao integer default 1,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Orçamentos (cabeçalho)
CREATE TABLE public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  tipo_proposta_id uuid references public.tipos_proposta(id),
  codigo text not null unique,
  versao_sufixo text,
  cliente_id uuid references public.clientes(id) on delete set null,
  local_endereco text,
  tipo_cliente text check (tipo_cliente in ('residencial','condominio','resort','hotel','comercial')),
  cidade text,
  estado text,
  area_total_m2 numeric(10,2),
  data_criacao date default current_date,
  prazo_validade date,
  responsavel_id uuid references public.colaboradores(id) on delete set null,
  perfil_markup_id uuid references public.perfis_markup(id),
  observacoes text,
  status text not null default 'rascunho' check (status in ('rascunho','em_edicao','enviado','aprovado','reprovado','vencido')),
  data_aprovacao timestamptz,
  aprovado_por uuid references public.colaboradores(id) on delete set null,
  valor_negociado numeric(12,2),
  margem_negociacao_pct numeric(5,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Versões de orçamento (histórico)
CREATE TABLE public.orcamento_versoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  versao_sufixo text,
  alterado_por uuid references public.colaboradores(id) on delete set null,
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  motivo text,
  created_at timestamptz default now()
);

-- Itens do orçamento (plantas)
CREATE TABLE public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  planta_id uuid references public.plantas(id) on delete set null,
  nome_popular text not null,
  nome_cientifico text,
  categoria text,
  porte_solicitado text,
  unidade text,
  quantidade_esperada numeric(10,2) not null,
  margem_seguranca_pct numeric(5,2) default 0,
  quantidade_orcada numeric(10,2),
  fornecedor_principal_id uuid references public.fornecedores(id) on delete set null,
  fornecedor_backup1_id uuid references public.fornecedores(id) on delete set null,
  fornecedor_backup2_id uuid references public.fornecedores(id) on delete set null,
  preco_unitario_compra numeric(10,2),
  markup_pct numeric(5,2),
  preco_unitario_venda numeric(10,2),
  porte_divergente boolean default false,
  observacao text,
  ordem integer default 0,
  created_at timestamptz default now()
);

-- Cotações por item por fornecedor
CREATE TABLE public.orcamento_cotacoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_item_id uuid references public.orcamento_itens(id) on delete cascade,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  valor_unitario numeric(10,2),
  porte_ofertado text,
  unidade_ofertada text,
  disponibilidade boolean default true,
  selecionado text default 'descartado' check (selecionado in ('principal','backup1','backup2','descartado')),
  observacao text,
  created_at timestamptz default now()
);

-- Insumos do orçamento
CREATE TABLE public.orcamento_insumos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  insumo_id uuid references public.insumos(id) on delete set null,
  nome text not null,
  categoria text,
  unidade text,
  quantidade_esperada numeric(10,2),
  margem_seguranca_pct numeric(5,2) default 0,
  quantidade_orcada numeric(10,2),
  preco_unitario_compra numeric(10,2),
  markup_pct numeric(5,2),
  preco_unitario_venda numeric(10,2),
  calculado_automaticamente boolean default false,
  ordem integer default 0,
  created_at timestamptz default now()
);

-- Fretes do orçamento
CREATE TABLE public.orcamento_fretes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  descricao text not null,
  fornecedor text,
  valor_unitario numeric(10,2),
  quantidade_esperada numeric(10,2),
  margem_seguranca_pct numeric(5,2) default 0,
  quantidade_orcada numeric(10,2),
  valor_total numeric(12,2),
  created_at timestamptz default now()
);

-- Custos indiretos
CREATE TABLE public.orcamento_custos_indiretos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  tipo text not null,
  descricao text,
  valor numeric(12,2),
  created_at timestamptz default now()
);

-- Comissões
CREATE TABLE public.orcamento_comissoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  tipo text,
  percentual numeric(5,2),
  beneficiario text,
  valor_calculado numeric(12,2),
  created_at timestamptz default now()
);

-- Indexes
CREATE INDEX idx_orcamentos_cliente ON public.orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX idx_orcamento_itens_orcamento ON public.orcamento_itens(orcamento_id);
CREATE INDEX idx_orcamento_cotacoes_item ON public.orcamento_cotacoes(orcamento_item_id);
CREATE INDEX idx_orcamento_insumos_orcamento ON public.orcamento_insumos(orcamento_id);
CREATE INDEX idx_orcamento_fretes_orcamento ON public.orcamento_fretes(orcamento_id);
CREATE INDEX idx_orcamento_custos_indiretos_orcamento ON public.orcamento_custos_indiretos(orcamento_id);
CREATE INDEX idx_orcamento_comissoes_orcamento ON public.orcamento_comissoes(orcamento_id);
CREATE INDEX idx_orcamento_versoes_orcamento ON public.orcamento_versoes(orcamento_id);

-- RLS
ALTER TABLE public.tipos_proposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_markup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coeficientes_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_fretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_custos_indiretos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_comissoes ENABLE ROW LEVEL SECURITY;

-- Catálogos: leitura para autenticados, gestão restrita a admin/administrativo/diretor
CREATE POLICY "tipos_proposta_select" ON public.tipos_proposta FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipos_proposta_manage" ON public.tipos_proposta FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "perfis_markup_select" ON public.perfis_markup FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_markup_manage" ON public.perfis_markup FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "coeficientes_insumos_select" ON public.coeficientes_insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "coeficientes_insumos_manage" ON public.coeficientes_insumos FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

-- Orçamentos e tabelas filhas: acesso total restrito a admin/administrativo/diretor
CREATE POLICY "orcamentos_acesso" ON public.orcamentos FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_versoes_acesso" ON public.orcamento_versoes FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_itens_acesso" ON public.orcamento_itens FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_cotacoes_acesso" ON public.orcamento_cotacoes FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_insumos_acesso" ON public.orcamento_insumos FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_fretes_acesso" ON public.orcamento_fretes FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_custos_indiretos_acesso" ON public.orcamento_custos_indiretos FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

CREATE POLICY "orcamento_comissoes_acesso" ON public.orcamento_comissoes FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'diretor'::user_role]));

-- Trigger updated_at em orcamentos (reusa função existente update_updated_at_column)
CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
