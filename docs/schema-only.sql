-- Schema export gerado em 2026-03-04T17:04:41.854Z
-- Etapa 1: schema apenas (sem dados)
BEGIN;
CREATE SCHEMA IF NOT EXISTS public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public."user_role" AS ENUM ('admin', 'gestor', 'operador', 'administrativo', 'gestao_campo', 'responsavel_obra', 'operador_campo', 'arquitetura');
  END IF;
END $$;

-- Tabelas
CREATE TABLE IF NOT EXISTS public."areas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "cor" text DEFAULT '#22c55e'::text,
  "ativo" boolean DEFAULT true NOT NULL,
  "ordem" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."calendario_eventos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "data" date NOT NULL,
  "recorrente" boolean DEFAULT false NOT NULL,
  "tipo" text DEFAULT 'evento'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."categorias_plantas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "campos_obrigatorios" jsonb DEFAULT '["porte", "unidade"]'::jsonb,
  "ordem" integer DEFAULT 0,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."categorias_servico" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "cor" text DEFAULT '#22c55e'::text,
  "ativo" boolean DEFAULT true NOT NULL,
  "ordem" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."cliente_atividades" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cliente_id" uuid NOT NULL,
  "usuario_id" uuid,
  "tipo" text NOT NULL,
  "acao" text NOT NULL,
  "descricao" text NOT NULL,
  "entidade_id" uuid,
  "dados_extras" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."clientes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "endereco" text,
  "bairro" text,
  "telefone" text,
  "email" text,
  "notas" text,
  "status" text DEFAULT 'ativo'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "cidade" text,
  "estado" text,
  "cep" text,
  "condominio" text,
  "cpf_cnpj" text,
  "inscricao_estadual" text,
  "proprietarios" jsonb DEFAULT '[]'::jsonb,
  "funcionarios_casa" jsonb DEFAULT '[]'::jsonb,
  "assessores" jsonb DEFAULT '[]'::jsonb,
  "datas_importantes" jsonb DEFAULT '[]'::jsonb,
  "particularidades" text,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."colaboradores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "cargo" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "area" text,
  "telefone" text,
  "endereco" text,
  "cidade" text,
  "estado" text,
  "cep" text,
  "maquinas_ids" uuid[] DEFAULT '{}'::uuid[],
  "tamanho_camiseta" text,
  "tamanho_calca" text,
  "tamanho_calcado" text,
  "observacoes" text,
  "data_nascimento" date,
  "cpf" text,
  "area_id" uuid,
  "foto_url" text,
  "user_id" uuid,
  "email" text,
  "username" text,
  "created_by" uuid,
  "updated_by" uuid,
  "sub_equipe" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."custos_equipe" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "colaborador_id" uuid NOT NULL,
  "salario_mensal" numeric DEFAULT 0 NOT NULL,
  "custo_dia_util" numeric,
  "data_vigencia" date DEFAULT CURRENT_DATE NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "observacoes" text
);
CREATE TABLE IF NOT EXISTS public."diarias" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cliente_id" uuid NOT NULL,
  "trecho_id" uuid,
  "data_visita" date NOT NULL,
  "periodo" text DEFAULT 'dia_inteiro'::text NOT NULL,
  "equipe_presente_ids" uuid[] DEFAULT '{}'::uuid[],
  "comentarios_jardim" text,
  "observacoes_internas" text,
  "status" text DEFAULT 'realizado'::text NOT NULL,
  "data_alerta" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."entregas_colaborador" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "colaborador_id" uuid NOT NULL,
  "insumo_id" uuid NOT NULL,
  "quantidade" numeric DEFAULT 1 NOT NULL,
  "data_entrega" date DEFAULT CURRENT_DATE NOT NULL,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."fornecedores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "cnpj" text,
  "telefone" text,
  "email" text,
  "endereco" text,
  "cidade" text,
  "estado" text,
  "observacoes" text,
  "status" text DEFAULT 'ativo'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "whatsapp" text
);
CREATE TABLE IF NOT EXISTS public."historico_precos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tipo_item" text NOT NULL,
  "planta_id" uuid,
  "insumo_id" uuid,
  "fornecedor_id" uuid,
  "preco_anterior" numeric,
  "preco_novo" numeric,
  "data_alteracao" timestamp with time zone DEFAULT now() NOT NULL,
  "usuario_id" uuid,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."historico_salarios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "colaborador_id" uuid NOT NULL,
  "salario_anterior" numeric,
  "salario_novo" numeric NOT NULL,
  "data_alteracao" timestamp with time zone DEFAULT now() NOT NULL,
  "usuario_id" uuid,
  "observacao" text
);
CREATE TABLE IF NOT EXISTS public."insumos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "categoria" text,
  "unidade" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "fornecedor_id" uuid,
  "preco_unitario" numeric,
  "ultima_compra" date,
  "observacoes" text,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."manutencao_recursos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "visita_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "maquina_id" uuid,
  "insumo_id" uuid,
  "quantidade" numeric,
  "unidade" text,
  "horas_uso" numeric,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."manutencao_servicos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "visita_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "descricao" text,
  "quantidade" numeric,
  "unidade" text,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."manutencao_visitas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL,
  "data_visita" date NOT NULL,
  "equipe_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "horas_trabalhadas" numeric DEFAULT 0 NOT NULL,
  "horas_por_pessoa" jsonb DEFAULT '[]'::jsonb,
  "ocorrencias" text,
  "observacoes_internas" text,
  "midia" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."maquinas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "modelo" text,
  "marca" text,
  "numero_serie" text,
  "codigo_interno" text,
  "categoria" text,
  "horas_acumuladas" numeric DEFAULT 0 NOT NULL,
  "horas_limite_manutencao" numeric DEFAULT 100 NOT NULL,
  "ultima_manutencao" date,
  "proxima_manutencao_em" numeric,
  "status" text DEFAULT 'ativa'::text NOT NULL,
  "observacoes" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."memorial_descritivo" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL,
  "nome_popular" text DEFAULT ''::text NOT NULL,
  "nome_cientifico" text DEFAULT ''::text,
  "porte" text DEFAULT ''::text,
  "quantidade" numeric DEFAULT 1 NOT NULL,
  "unidade" text DEFAULT 'un'::text,
  "ordem" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "tipo" text DEFAULT 'planta'::text NOT NULL,
  "planta_id" uuid,
  "insumo_id" uuid,
  "categoria" text DEFAULT ''::text,
  "dap" text DEFAULT ''::text
);
CREATE TABLE IF NOT EXISTS public."orcamento_cotacoes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL,
  "fornecedor_id" uuid,
  "fornecedor_nome" text,
  "preco_unitario" numeric DEFAULT 0 NOT NULL,
  "selecionada" boolean DEFAULT false NOT NULL,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."orcamento_itens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL,
  "tipo" text DEFAULT 'servico'::text NOT NULL,
  "planta_id" uuid,
  "insumo_id" uuid,
  "descricao" text NOT NULL,
  "quantidade" numeric DEFAULT 1 NOT NULL,
  "unidade" text DEFAULT 'un'::text,
  "margem_percentual" numeric DEFAULT 0,
  "reserva_valor" numeric DEFAULT 0,
  "preco_custo" numeric DEFAULT 0,
  "preco_venda" numeric DEFAULT 0,
  "ordem" integer DEFAULT 0,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."plantas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nome_popular" text NOT NULL,
  "nome_cientifico" text,
  "categoria_id" uuid,
  "fornecedor_id" uuid,
  "porte" text,
  "altura_cm" numeric,
  "dap_cm" numeric,
  "unidade" text,
  "nota_qualidade" integer,
  "preco_unitario" numeric,
  "ultima_compra" date,
  "midia" jsonb DEFAULT '[]'::jsonb,
  "observacoes" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."processo_etapas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "processo_id" uuid NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "responsavel" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."processos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "area_id" uuid NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "objetivo" text,
  "ordem" integer DEFAULT 0,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."profiles" (
  "id" uuid NOT NULL,
  "nome" text NOT NULL,
  "email" text,
  "area_id" uuid,
  "telefone" text,
  "avatar_url" text,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "whatsapp" text,
  "ultimo_acesso" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public."projeto_arquivos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "url" text NOT NULL,
  "tipo" text DEFAULT 'documento'::text,
  "tamanho" bigint,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."projeto_comentarios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL,
  "usuario_id" uuid,
  "texto" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."projeto_mao_de_obra" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "projeto_id" uuid NOT NULL,
  "descricao" text DEFAULT ''::text NOT NULL,
  "quantidade_funcionarios" integer DEFAULT 1 NOT NULL,
  "dias_previstos" integer DEFAULT 1 NOT NULL,
  "observacoes" text,
  "ordem" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."projetos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cliente_id" uuid NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "status" text DEFAULT 'orcamento'::text NOT NULL,
  "valor_total" numeric DEFAULT 0,
  "data_inicio" date,
  "data_previsao" date,
  "data_conclusao" date,
  "responsavel_id" uuid,
  "observacoes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "tipo" text DEFAULT 'implantacao'::text NOT NULL
);
CREATE TABLE IF NOT EXISTS public."propostas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cliente_id" uuid NOT NULL,
  "codigo" text NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "status" text DEFAULT 'rascunho'::text NOT NULL,
  "data_envio" date,
  "data_resposta" date,
  "valor" numeric(12,2),
  "observacoes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."recebimento_itens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "registro_id" uuid NOT NULL,
  "tipo_item" text NOT NULL,
  "planta_id" uuid,
  "insumo_id" uuid,
  "quantidade" numeric NOT NULL,
  "unidade" text,
  "porte" text,
  "altura_cm" numeric,
  "dap_cm" numeric,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."registro_insumos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "registro_id" uuid NOT NULL,
  "insumo_id" uuid NOT NULL,
  "quantidade" numeric NOT NULL,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."registro_maquinas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "registro_id" uuid NOT NULL,
  "maquina_id" uuid NOT NULL,
  "horas_utilizadas" numeric DEFAULT 0 NOT NULL,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."registros" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cliente_id" uuid NOT NULL,
  "trecho_id" uuid,
  "data_servico" date NOT NULL,
  "hora_servico" time without time zone,
  "tipo" text NOT NULL,
  "area_funcional" text,
  "colaboradores_ids" uuid[],
  "descricao" text NOT NULL,
  "observacoes_internas" text,
  "tags" text[],
  "humor_do_jardim" text,
  "midia" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "proposta_id" uuid,
  "equipe_presente_ids" uuid[] DEFAULT '{}'::uuid[],
  "executores_ids" uuid[] DEFAULT '{}'::uuid[],
  "solicitante" text,
  "status" text DEFAULT 'realizado'::text NOT NULL,
  "data_alerta" timestamp with time zone,
  "diaria_id" uuid,
  "categorias_ids" uuid[] DEFAULT '{}'::uuid[],
  "created_by" uuid,
  "updated_by" uuid,
  "prioridade" text DEFAULT 'normal'::text,
  "status_solicitacao" text,
  "projeto_id" uuid
);
CREATE TABLE IF NOT EXISTS public."registros_historico" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "registro_id" uuid NOT NULL,
  "usuario_id" uuid,
  "acao" text NOT NULL,
  "dados_anteriores" jsonb,
  "dados_novos" jsonb,
  "campos_alterados" text[],
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."system_state" (
  "key" text NOT NULL,
  "value" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."trechos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cliente_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS public."user_roles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" user_role DEFAULT 'operador'::user_role NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Constraints base
ALTER TABLE areas ADD CONSTRAINT "areas_nome_key" UNIQUE (nome);
ALTER TABLE areas ADD CONSTRAINT "areas_pkey" PRIMARY KEY (id);
ALTER TABLE calendario_eventos ADD CONSTRAINT "calendario_eventos_pkey" PRIMARY KEY (id);
ALTER TABLE categorias_plantas ADD CONSTRAINT "categorias_plantas_pkey" PRIMARY KEY (id);
ALTER TABLE categorias_servico ADD CONSTRAINT "categorias_servico_nome_key" UNIQUE (nome);
ALTER TABLE categorias_servico ADD CONSTRAINT "categorias_servico_pkey" PRIMARY KEY (id);
ALTER TABLE cliente_atividades ADD CONSTRAINT "cliente_atividades_pkey" PRIMARY KEY (id);
ALTER TABLE clientes ADD CONSTRAINT "clientes_pkey" PRIMARY KEY (id);
ALTER TABLE clientes ADD CONSTRAINT "clientes_status_check" CHECK (status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'prospecto'::text]));
ALTER TABLE colaboradores ADD CONSTRAINT "colaboradores_pkey" PRIMARY KEY (id);
ALTER TABLE colaboradores ADD CONSTRAINT "colaboradores_user_id_key" UNIQUE (user_id);
ALTER TABLE colaboradores ADD CONSTRAINT "colaboradores_username_key" UNIQUE (username);
ALTER TABLE custos_equipe ADD CONSTRAINT "custos_equipe_pkey" PRIMARY KEY (id);
ALTER TABLE diarias ADD CONSTRAINT "diarias_pkey" PRIMARY KEY (id);
ALTER TABLE entregas_colaborador ADD CONSTRAINT "entregas_colaborador_pkey" PRIMARY KEY (id);
ALTER TABLE fornecedores ADD CONSTRAINT "fornecedores_pkey" PRIMARY KEY (id);
ALTER TABLE historico_precos ADD CONSTRAINT "historico_precos_pkey" PRIMARY KEY (id);
ALTER TABLE historico_salarios ADD CONSTRAINT "historico_salarios_pkey" PRIMARY KEY (id);
ALTER TABLE insumos ADD CONSTRAINT "insumos_pkey" PRIMARY KEY (id);
ALTER TABLE manutencao_recursos ADD CONSTRAINT "manutencao_recursos_pkey" PRIMARY KEY (id);
ALTER TABLE manutencao_servicos ADD CONSTRAINT "manutencao_servicos_pkey" PRIMARY KEY (id);
ALTER TABLE manutencao_visitas ADD CONSTRAINT "manutencao_visitas_pkey" PRIMARY KEY (id);
ALTER TABLE maquinas ADD CONSTRAINT "maquinas_pkey" PRIMARY KEY (id);
ALTER TABLE memorial_descritivo ADD CONSTRAINT "memorial_descritivo_pkey" PRIMARY KEY (id);
ALTER TABLE orcamento_cotacoes ADD CONSTRAINT "orcamento_cotacoes_pkey" PRIMARY KEY (id);
ALTER TABLE orcamento_itens ADD CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY (id);
ALTER TABLE plantas ADD CONSTRAINT "plantas_nota_qualidade_check" CHECK (nota_qualidade >= 1 AND nota_qualidade <= 5);
ALTER TABLE plantas ADD CONSTRAINT "plantas_pkey" PRIMARY KEY (id);
ALTER TABLE processo_etapas ADD CONSTRAINT "processo_etapas_pkey" PRIMARY KEY (id);
ALTER TABLE processos ADD CONSTRAINT "processos_pkey" PRIMARY KEY (id);
ALTER TABLE profiles ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE projeto_arquivos ADD CONSTRAINT "projeto_arquivos_pkey" PRIMARY KEY (id);
ALTER TABLE projeto_comentarios ADD CONSTRAINT "projeto_comentarios_pkey" PRIMARY KEY (id);
ALTER TABLE projeto_mao_de_obra ADD CONSTRAINT "projeto_mao_de_obra_pkey" PRIMARY KEY (id);
ALTER TABLE projetos ADD CONSTRAINT "projetos_pkey" PRIMARY KEY (id);
ALTER TABLE propostas ADD CONSTRAINT "propostas_pkey" PRIMARY KEY (id);
ALTER TABLE recebimento_itens ADD CONSTRAINT "check_item_type" CHECK (tipo_item = 'planta'::text AND planta_id IS NOT NULL AND insumo_id IS NULL OR tipo_item = 'insumo'::text AND insumo_id IS NOT NULL AND planta_id IS NULL);
ALTER TABLE recebimento_itens ADD CONSTRAINT "recebimento_itens_pkey" PRIMARY KEY (id);
ALTER TABLE registro_insumos ADD CONSTRAINT "registro_insumos_pkey" PRIMARY KEY (id);
ALTER TABLE registro_maquinas ADD CONSTRAINT "registro_maquinas_pkey" PRIMARY KEY (id);
ALTER TABLE registros ADD CONSTRAINT "registros_area_funcional_check" CHECK (area_funcional = ANY (ARRAY['campo'::text, 'administrativo'::text, 'projetos'::text, 'direcao'::text]));
ALTER TABLE registros ADD CONSTRAINT "registros_pkey" PRIMARY KEY (id);
ALTER TABLE registros ADD CONSTRAINT "registros_tipo_check" CHECK (tipo = ANY (ARRAY['manutencao'::text, 'implantacao'::text, 'entrega'::text, 'visita_tecnica'::text, 'reuniao'::text, 'outro'::text]));
ALTER TABLE registros_historico ADD CONSTRAINT "registros_historico_pkey" PRIMARY KEY (id);
ALTER TABLE system_state ADD CONSTRAINT "system_state_pkey" PRIMARY KEY (key);
ALTER TABLE trechos ADD CONSTRAINT "trechos_pkey" PRIMARY KEY (id);
ALTER TABLE user_roles ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY (id);
ALTER TABLE user_roles ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE (user_id, role);

-- Foreign keys
ALTER TABLE cliente_atividades ADD CONSTRAINT "cliente_atividades_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE cliente_atividades ADD CONSTRAINT "cliente_atividades_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE clientes ADD CONSTRAINT "clientes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE clientes ADD CONSTRAINT "clientes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE colaboradores ADD CONSTRAINT "colaboradores_area_id_fkey" FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;
ALTER TABLE colaboradores ADD CONSTRAINT "colaboradores_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE colaboradores ADD CONSTRAINT "colaboradores_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE custos_equipe ADD CONSTRAINT "custos_equipe_colaborador_id_fkey" FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE diarias ADD CONSTRAINT "diarias_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE diarias ADD CONSTRAINT "diarias_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE diarias ADD CONSTRAINT "diarias_trecho_id_fkey" FOREIGN KEY (trecho_id) REFERENCES trechos(id) ON DELETE SET NULL;
ALTER TABLE diarias ADD CONSTRAINT "diarias_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE entregas_colaborador ADD CONSTRAINT "entregas_colaborador_colaborador_id_fkey" FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE entregas_colaborador ADD CONSTRAINT "entregas_colaborador_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT;
ALTER TABLE fornecedores ADD CONSTRAINT "fornecedores_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE fornecedores ADD CONSTRAINT "fornecedores_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE historico_precos ADD CONSTRAINT "historico_precos_fornecedor_id_fkey" FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
ALTER TABLE historico_precos ADD CONSTRAINT "historico_precos_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE;
ALTER TABLE historico_precos ADD CONSTRAINT "historico_precos_planta_id_fkey" FOREIGN KEY (planta_id) REFERENCES plantas(id) ON DELETE CASCADE;
ALTER TABLE historico_salarios ADD CONSTRAINT "historico_salarios_colaborador_id_fkey" FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
ALTER TABLE insumos ADD CONSTRAINT "insumos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE insumos ADD CONSTRAINT "insumos_fornecedor_id_fkey" FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id);
ALTER TABLE insumos ADD CONSTRAINT "insumos_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE manutencao_recursos ADD CONSTRAINT "manutencao_recursos_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id);
ALTER TABLE manutencao_recursos ADD CONSTRAINT "manutencao_recursos_maquina_id_fkey" FOREIGN KEY (maquina_id) REFERENCES maquinas(id);
ALTER TABLE manutencao_recursos ADD CONSTRAINT "manutencao_recursos_visita_id_fkey" FOREIGN KEY (visita_id) REFERENCES manutencao_visitas(id) ON DELETE CASCADE;
ALTER TABLE manutencao_servicos ADD CONSTRAINT "manutencao_servicos_visita_id_fkey" FOREIGN KEY (visita_id) REFERENCES manutencao_visitas(id) ON DELETE CASCADE;
ALTER TABLE manutencao_visitas ADD CONSTRAINT "manutencao_visitas_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;
ALTER TABLE maquinas ADD CONSTRAINT "maquinas_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE maquinas ADD CONSTRAINT "maquinas_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE memorial_descritivo ADD CONSTRAINT "memorial_descritivo_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL;
ALTER TABLE memorial_descritivo ADD CONSTRAINT "memorial_descritivo_planta_id_fkey" FOREIGN KEY (planta_id) REFERENCES plantas(id) ON DELETE SET NULL;
ALTER TABLE memorial_descritivo ADD CONSTRAINT "memorial_descritivo_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;
ALTER TABLE orcamento_cotacoes ADD CONSTRAINT "orcamento_cotacoes_fornecedor_id_fkey" FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;
ALTER TABLE orcamento_cotacoes ADD CONSTRAINT "orcamento_cotacoes_item_id_fkey" FOREIGN KEY (item_id) REFERENCES orcamento_itens(id) ON DELETE CASCADE;
ALTER TABLE orcamento_itens ADD CONSTRAINT "orcamento_itens_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL;
ALTER TABLE orcamento_itens ADD CONSTRAINT "orcamento_itens_planta_id_fkey" FOREIGN KEY (planta_id) REFERENCES plantas(id) ON DELETE SET NULL;
ALTER TABLE orcamento_itens ADD CONSTRAINT "orcamento_itens_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;
ALTER TABLE plantas ADD CONSTRAINT "plantas_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias_plantas(id);
ALTER TABLE plantas ADD CONSTRAINT "plantas_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE plantas ADD CONSTRAINT "plantas_fornecedor_id_fkey" FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id);
ALTER TABLE plantas ADD CONSTRAINT "plantas_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE processo_etapas ADD CONSTRAINT "processo_etapas_processo_id_fkey" FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE;
ALTER TABLE processos ADD CONSTRAINT "processos_area_id_fkey" FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT "profiles_area_id_fkey" FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projeto_arquivos ADD CONSTRAINT "projeto_arquivos_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;
ALTER TABLE projeto_arquivos ADD CONSTRAINT "projeto_arquivos_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE projeto_comentarios ADD CONSTRAINT "projeto_comentarios_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;
ALTER TABLE projeto_comentarios ADD CONSTRAINT "projeto_comentarios_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE projeto_mao_de_obra ADD CONSTRAINT "projeto_mao_de_obra_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;
ALTER TABLE projetos ADD CONSTRAINT "projetos_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE propostas ADD CONSTRAINT "propostas_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE propostas ADD CONSTRAINT "propostas_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE propostas ADD CONSTRAINT "propostas_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE recebimento_itens ADD CONSTRAINT "recebimento_itens_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id);
ALTER TABLE recebimento_itens ADD CONSTRAINT "recebimento_itens_planta_id_fkey" FOREIGN KEY (planta_id) REFERENCES plantas(id);
ALTER TABLE recebimento_itens ADD CONSTRAINT "recebimento_itens_registro_id_fkey" FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE CASCADE;
ALTER TABLE registro_insumos ADD CONSTRAINT "registro_insumos_insumo_id_fkey" FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT;
ALTER TABLE registro_insumos ADD CONSTRAINT "registro_insumos_registro_id_fkey" FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE CASCADE;
ALTER TABLE registro_maquinas ADD CONSTRAINT "registro_maquinas_maquina_id_fkey" FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT;
ALTER TABLE registro_maquinas ADD CONSTRAINT "registro_maquinas_registro_id_fkey" FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE CASCADE;
ALTER TABLE registros ADD CONSTRAINT "registros_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE registros ADD CONSTRAINT "registros_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE registros ADD CONSTRAINT "registros_diaria_id_fkey" FOREIGN KEY (diaria_id) REFERENCES diarias(id) ON DELETE CASCADE;
ALTER TABLE registros ADD CONSTRAINT "registros_projeto_id_fkey" FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL;
ALTER TABLE registros ADD CONSTRAINT "registros_proposta_id_fkey" FOREIGN KEY (proposta_id) REFERENCES propostas(id) ON DELETE SET NULL;
ALTER TABLE registros ADD CONSTRAINT "registros_trecho_id_fkey" FOREIGN KEY (trecho_id) REFERENCES trechos(id) ON DELETE SET NULL;
ALTER TABLE registros ADD CONSTRAINT "registros_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE trechos ADD CONSTRAINT "trechos_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE trechos ADD CONSTRAINT "trechos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE trechos ADD CONSTRAINT "trechos_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE user_roles ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Funções
CREATE OR REPLACE FUNCTION public.atualizar_horas_maquina()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Soma as horas na máquina
    UPDATE public.maquinas
    SET horas_acumuladas = horas_acumuladas + NEW.horas_utilizadas
    WHERE id = NEW.maquina_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ajusta a diferença de horas
    UPDATE public.maquinas
    SET horas_acumuladas = horas_acumuladas - OLD.horas_utilizadas + NEW.horas_utilizadas
    WHERE id = NEW.maquina_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtrai as horas
    UPDATE public.maquinas
    SET horas_acumuladas = horas_acumuladas - OLD.horas_utilizadas
    WHERE id = OLD.maquina_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'administrativo')
  )
$function$;
CREATE OR REPLACE FUNCTION public.check_inactive_clients()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins should run maintenance
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE clientes c
  SET 
    status = 'inativo',
    updated_at = now()
  WHERE 
    c.status = 'ativo'
    AND c.updated_at < (now() - INTERVAL '60 days')
    AND NOT EXISTS (
      SELECT 1 FROM registros r 
      WHERE r.cliente_id = c.id 
      AND (r.created_at >= (now() - INTERVAL '60 days') OR r.data_servico >= (CURRENT_DATE - 60))
    )
    AND NOT EXISTS (
      SELECT 1 FROM diarias d 
      WHERE d.cliente_id = c.id 
      AND (d.created_at >= (now() - INTERVAL '60 days') OR d.data_visita >= (CURRENT_DATE - 60))
    )
    AND NOT EXISTS (
      SELECT 1 FROM propostas p 
      WHERE p.cliente_id = c.id 
      AND p.created_at >= (now() - INTERVAL '60 days')
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.get_colaborador_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.colaboradores
  WHERE user_id = _user_id AND ativo = true
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION public.get_user_area(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT area_id
  FROM public.profiles
  WHERE id = _user_id
$function$;
CREATE OR REPLACE FUNCTION public.get_user_id_by_username(_username text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_id
  FROM public.colaboradores
  WHERE username = LOWER(_username)
    AND ativo = true
    AND user_id IS NOT NULL
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador_campo');
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles user_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$function$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;
CREATE OR REPLACE FUNCTION public.is_allocated_to_project(_user_id uuid, _projeto_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = _user_id AND c.ativo = true
    AND (
      EXISTS (
        SELECT 1 FROM public.projetos p
        WHERE p.id = _projeto_id AND p.responsavel_id = c.id
      )
      OR EXISTS (
        SELECT 1 FROM public.registros r
        WHERE r.projeto_id = _projeto_id
        AND (c.id = ANY(r.executores_ids) OR c.id = ANY(r.equipe_presente_ids))
      )
    )
  )
$function$;
CREATE OR REPLACE FUNCTION public.is_colaborador_ativo(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.colaboradores
    WHERE user_id = _user_id
      AND ativo = true
  )
$function$;
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'administrativo', 'gestao_campo')
  )
$function$;
CREATE OR REPLACE FUNCTION public.log_alteracao_salario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.salario_mensal IS DISTINCT FROM NEW.salario_mensal THEN
    INSERT INTO public.historico_salarios (colaborador_id, salario_anterior, salario_novo, usuario_id)
    VALUES (NEW.colaborador_id, OLD.salario_mensal, NEW.salario_mensal, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_cliente_atividade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id)
    VALUES (NEW.id, auth.uid(), 'cliente', 'atualizado', 'Cadastro do cliente atualizado', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_preco_insumo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario THEN
    INSERT INTO public.historico_precos (tipo_item, insumo_id, fornecedor_id, preco_anterior, preco_novo, usuario_id)
    VALUES ('insumo', NEW.id, NEW.fornecedor_id, OLD.preco_unitario, NEW.preco_unitario, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_preco_planta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.preco_unitario IS DISTINCT FROM NEW.preco_unitario THEN
    INSERT INTO public.historico_precos (tipo_item, planta_id, fornecedor_id, preco_anterior, preco_novo, usuario_id)
    VALUES ('planta', NEW.id, NEW.fornecedor_id, OLD.preco_unitario, NEW.preco_unitario, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_projeto_atividade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _descricao text;
  _acao text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'criado';
    _descricao := 'Novo projeto criado: ' || NEW.titulo;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'projeto', _acao, _descricao, NEW.id, jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _descricao := 'Projeto "' || NEW.titulo || '": status alterado de "' || OLD.status || '" para "' || NEW.status || '"';
      _acao := 'status_alterado';
    ELSE
      _descricao := 'Projeto "' || NEW.titulo || '" atualizado';
      _acao := 'atualizado';
    END IF;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'projeto', _acao, _descricao, NEW.id, jsonb_build_object('status', NEW.status));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_proposta_atividade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _descricao text;
  _acao text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'criado';
    _descricao := 'Nova proposta criada: ' || NEW.codigo || ' - ' || NEW.titulo;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'proposta', _acao, _descricao, NEW.id, jsonb_build_object('codigo', NEW.codigo, 'status', NEW.status, 'valor', NEW.valor));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _descricao := 'Proposta ' || NEW.codigo || ': status alterado de "' || OLD.status || '" para "' || NEW.status || '"';
      _acao := 'status_alterado';
    ELSE
      _descricao := 'Proposta ' || NEW.codigo || ' atualizada';
      _acao := 'atualizado';
    END IF;
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'proposta', _acao, _descricao, NEW.id, jsonb_build_object('codigo', NEW.codigo, 'status', NEW.status));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_registro_atividade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _descricao text;
  _acao text;
  _dados jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'criado';
    _descricao := 'Novo registro: ' || COALESCE(NEW.tipo, '') || ' - ' || LEFT(NEW.descricao, 100);
    _dados := jsonb_build_object('tipo', NEW.tipo, 'status', NEW.status, 'data_servico', NEW.data_servico);
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'registro', _acao, _descricao, NEW.id, _dados);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _acao := 'status_alterado';
      _descricao := 'Status do registro alterado de "' || COALESCE(OLD.status,'') || '" para "' || COALESCE(NEW.status,'') || '"';
    ELSE
      _acao := 'atualizado';
      _descricao := 'Registro atualizado: ' || LEFT(NEW.descricao, 100);
    END IF;
    _dados := jsonb_build_object('tipo', NEW.tipo, 'status', NEW.status);
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id, dados_extras)
    VALUES (NEW.cliente_id, auth.uid(), 'registro', _acao, _descricao, NEW.id, _dados);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.cliente_atividades (cliente_id, usuario_id, tipo, acao, descricao, entidade_id)
    VALUES (OLD.cliente_id, auth.uid(), 'registro', 'excluido', 'Registro excluído: ' || LEFT(OLD.descricao, 100), OLD.id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
CREATE OR REPLACE FUNCTION public.log_registro_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  campos_alterados TEXT[] := '{}';
  dados_ant JSONB;
  dados_nov JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Novo registro criado
    INSERT INTO public.registros_historico (
      registro_id,
      usuario_id,
      acao,
      dados_anteriores,
      dados_novos,
      campos_alterados
    ) VALUES (
      NEW.id,
      auth.uid(),
      'criado',
      NULL,
      to_jsonb(NEW),
      NULL
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar quais campos foram alterados
    IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
      campos_alterados := array_append(campos_alterados, 'descricao');
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      campos_alterados := array_append(campos_alterados, 'status');
    END IF;
    IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
      campos_alterados := array_append(campos_alterados, 'tipo');
    END IF;
    IF OLD.data_servico IS DISTINCT FROM NEW.data_servico THEN
      campos_alterados := array_append(campos_alterados, 'data_servico');
    END IF;
    IF OLD.trecho_id IS DISTINCT FROM NEW.trecho_id THEN
      campos_alterados := array_append(campos_alterados, 'trecho_id');
    END IF;
    IF OLD.categorias_ids IS DISTINCT FROM NEW.categorias_ids THEN
      campos_alterados := array_append(campos_alterados, 'categorias_ids');
    END IF;
    IF OLD.executores_ids IS DISTINCT FROM NEW.executores_ids THEN
      campos_alterados := array_append(campos_alterados, 'executores_ids');
    END IF;
    IF OLD.equipe_presente_ids IS DISTINCT FROM NEW.equipe_presente_ids THEN
      campos_alterados := array_append(campos_alterados, 'equipe_presente_ids');
    END IF;
    IF OLD.solicitante IS DISTINCT FROM NEW.solicitante THEN
      campos_alterados := array_append(campos_alterados, 'solicitante');
    END IF;
    IF OLD.observacoes_internas IS DISTINCT FROM NEW.observacoes_internas THEN
      campos_alterados := array_append(campos_alterados, 'observacoes_internas');
    END IF;
    IF OLD.midia IS DISTINCT FROM NEW.midia THEN
      campos_alterados := array_append(campos_alterados, 'midia');
    END IF;
    
    -- Só registra se houve alteração real
    IF array_length(campos_alterados, 1) > 0 THEN
      -- Determinar a ação
      INSERT INTO public.registros_historico (
        registro_id,
        usuario_id,
        acao,
        dados_anteriores,
        dados_novos,
        campos_alterados
      ) VALUES (
        NEW.id,
        auth.uid(),
        CASE 
          WHEN NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN 'cancelado'
          ELSE 'atualizado'
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        campos_alterados
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;
CREATE OR REPLACE FUNCTION public.set_audit_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.verificar_manutencao_maquina()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se horas acumuladas >= limite, atualiza status para precisando manutenção
  IF NEW.horas_acumuladas >= NEW.horas_limite_manutencao AND NEW.status = 'ativa' THEN
    NEW.status := 'manutencao_pendente';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Views
CREATE OR REPLACE VIEW public.colaboradores_basico AS  SELECT id,
    nome,
    cargo,
    area,
    area_id,
    ativo,
    foto_url
   FROM colaboradores;

-- Índices
CREATE INDEX IF NOT EXISTS idx_cliente_atividades_cliente_id ON public.cliente_atividades USING btree (cliente_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_colaboradores_username ON public.colaboradores USING btree (username)
CREATE INDEX IF NOT EXISTS idx_diarias_cliente_id ON public.diarias USING btree (cliente_id)
CREATE INDEX IF NOT EXISTS idx_diarias_data_visita ON public.diarias USING btree (data_visita)
CREATE INDEX IF NOT EXISTS idx_diarias_status ON public.diarias USING btree (status)
CREATE INDEX IF NOT EXISTS idx_insumos_ativo ON public.insumos USING btree (ativo)
CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON public.insumos USING btree (categoria)
CREATE INDEX IF NOT EXISTS idx_insumos_fornecedor_id ON public.insumos USING btree (fornecedor_id)
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_insumo_id ON public.orcamento_itens USING btree (insumo_id)
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_planta_id ON public.orcamento_itens USING btree (planta_id)
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_projeto_id ON public.orcamento_itens USING btree (projeto_id)
CREATE INDEX IF NOT EXISTS idx_plantas_categoria_id ON public.plantas USING btree (categoria_id)
CREATE INDEX IF NOT EXISTS idx_plantas_fornecedor_id ON public.plantas USING btree (fornecedor_id)
CREATE INDEX IF NOT EXISTS idx_processo_etapas_processo ON public.processo_etapas USING btree (processo_id, ordem)
CREATE INDEX IF NOT EXISTS idx_processos_area ON public.processos USING btree (area_id)
CREATE INDEX IF NOT EXISTS idx_projeto_arquivos_projeto ON public.projeto_arquivos USING btree (projeto_id)
CREATE INDEX IF NOT EXISTS idx_projeto_comentarios_projeto ON public.projeto_comentarios USING btree (projeto_id)
CREATE INDEX IF NOT EXISTS idx_projetos_cliente_id ON public.projetos USING btree (cliente_id)
CREATE INDEX IF NOT EXISTS idx_projetos_status ON public.projetos USING btree (status)
CREATE INDEX IF NOT EXISTS idx_propostas_cliente_id ON public.propostas USING btree (cliente_id)
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas USING btree (status)
CREATE INDEX IF NOT EXISTS idx_registro_insumos_insumo_id ON public.registro_insumos USING btree (insumo_id)
CREATE INDEX IF NOT EXISTS idx_registro_insumos_registro_id ON public.registro_insumos USING btree (registro_id)
CREATE INDEX IF NOT EXISTS idx_registros_calendario ON public.registros USING btree (cliente_id, data_servico, status)
CREATE INDEX IF NOT EXISTS idx_registros_cliente ON public.registros USING btree (cliente_id)
CREATE INDEX IF NOT EXISTS idx_registros_data ON public.registros USING btree (data_servico DESC)
CREATE INDEX IF NOT EXISTS idx_registros_diaria_id ON public.registros USING btree (diaria_id)
CREATE INDEX IF NOT EXISTS idx_registros_projeto_id ON public.registros USING btree (projeto_id)
CREATE INDEX IF NOT EXISTS idx_registros_proposta_id ON public.registros USING btree (proposta_id)
CREATE INDEX IF NOT EXISTS idx_registros_status ON public.registros USING btree (status)
CREATE INDEX IF NOT EXISTS idx_registros_historico_created_at ON public.registros_historico USING btree (created_at DESC)
CREATE INDEX IF NOT EXISTS idx_registros_historico_registro_id ON public.registros_historico USING btree (registro_id)
CREATE INDEX IF NOT EXISTS idx_trechos_cliente ON public.trechos USING btree (cliente_id)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id)

-- RLS
ALTER TABLE public."areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."calendario_eventos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."categorias_plantas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."categorias_servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cliente_atividades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."colaboradores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."custos_equipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."diarias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."entregas_colaborador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fornecedores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."historico_precos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."historico_salarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."insumos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."manutencao_recursos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."manutencao_servicos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."manutencao_visitas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."maquinas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."memorial_descritivo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."orcamento_cotacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."orcamento_itens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."plantas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."processo_etapas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."processos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."projeto_arquivos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."projeto_comentarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."projeto_mao_de_obra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."projetos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."propostas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."recebimento_itens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."registro_insumos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."registro_maquinas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."registros_historico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."system_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."trechos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_roles" ENABLE ROW LEVEL SECURITY;

-- Buckets de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('colaboradores-fotos', 'colaboradores-fotos', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('projeto-arquivos', 'projeto-arquivos', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('registros-midia', 'registros-midia', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies (public)
DROP POLICY IF EXISTS "Admins can delete areas" ON "public"."areas";
CREATE POLICY "Admins can delete areas" ON "public"."areas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert areas" ON "public"."areas";
CREATE POLICY "Admins can insert areas" ON "public"."areas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can read areas" ON "public"."areas";
CREATE POLICY "Admins can read areas" ON "public"."areas" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update areas" ON "public"."areas";
CREATE POLICY "Admins can update areas" ON "public"."areas" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can delete calendario_eventos" ON "public"."calendario_eventos";
CREATE POLICY "Admins can delete calendario_eventos" ON "public"."calendario_eventos" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read calendario_eventos" ON "public"."calendario_eventos";
CREATE POLICY "Authenticated can read calendario_eventos" ON "public"."calendario_eventos" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role, 'responsavel_obra'::user_role]));
DROP POLICY IF EXISTS "Managers can insert calendario_eventos" ON "public"."calendario_eventos";
CREATE POLICY "Managers can insert calendario_eventos" ON "public"."calendario_eventos" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Managers can update calendario_eventos" ON "public"."calendario_eventos";
CREATE POLICY "Managers can update calendario_eventos" ON "public"."calendario_eventos" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete categorias_plantas" ON "public"."categorias_plantas";
CREATE POLICY "Admins can delete categorias_plantas" ON "public"."categorias_plantas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert categorias_plantas" ON "public"."categorias_plantas";
CREATE POLICY "Admins can insert categorias_plantas" ON "public"."categorias_plantas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can read categorias_plantas" ON "public"."categorias_plantas";
CREATE POLICY "Admins can read categorias_plantas" ON "public"."categorias_plantas" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Admins can update categorias_plantas" ON "public"."categorias_plantas";
CREATE POLICY "Admins can update categorias_plantas" ON "public"."categorias_plantas" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can delete categorias_servico" ON "public"."categorias_servico";
CREATE POLICY "Admins can delete categorias_servico" ON "public"."categorias_servico" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert categorias_servico" ON "public"."categorias_servico";
CREATE POLICY "Admins can insert categorias_servico" ON "public"."categorias_servico" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can read categorias_servico" ON "public"."categorias_servico";
CREATE POLICY "Admins can read categorias_servico" ON "public"."categorias_servico" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can update categorias_servico" ON "public"."categorias_servico";
CREATE POLICY "Admins can update categorias_servico" ON "public"."categorias_servico" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert cliente_atividades" ON "public"."cliente_atividades";
CREATE POLICY "Admins can insert cliente_atividades" ON "public"."cliente_atividades" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Managers can read cliente_atividades" ON "public"."cliente_atividades";
CREATE POLICY "Managers can read cliente_atividades" ON "public"."cliente_atividades" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Admins can delete clientes" ON "public"."clientes";
CREATE POLICY "Admins can delete clientes" ON "public"."clientes" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Managers can insert clientes" ON "public"."clientes";
CREATE POLICY "Managers can insert clientes" ON "public"."clientes" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Managers can read clientes" ON "public"."clientes";
CREATE POLICY "Managers can read clientes" ON "public"."clientes" AS PERMISSIVE FOR SELECT TO authenticated USING (is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Managers can update clientes" ON "public"."clientes";
CREATE POLICY "Managers can update clientes" ON "public"."clientes" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete colaboradores" ON "public"."colaboradores";
CREATE POLICY "Admins can delete colaboradores" ON "public"."colaboradores" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Managers can insert colaboradores" ON "public"."colaboradores";
CREATE POLICY "Managers can insert colaboradores" ON "public"."colaboradores" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Managers can read all colaboradores data" ON "public"."colaboradores";
CREATE POLICY "Managers can read all colaboradores data" ON "public"."colaboradores" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Managers can update colaboradores" ON "public"."colaboradores";
CREATE POLICY "Managers can update colaboradores" ON "public"."colaboradores" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Users can read own colaborador data" ON "public"."colaboradores";
CREATE POLICY "Users can read own colaborador data" ON "public"."colaboradores" AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can delete custos_equipe" ON "public"."custos_equipe";
CREATE POLICY "Admins can delete custos_equipe" ON "public"."custos_equipe" AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert custos_equipe" ON "public"."custos_equipe";
CREATE POLICY "Admins can insert custos_equipe" ON "public"."custos_equipe" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can read custos_equipe" ON "public"."custos_equipe";
CREATE POLICY "Admins can read custos_equipe" ON "public"."custos_equipe" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update custos_equipe" ON "public"."custos_equipe";
CREATE POLICY "Admins can update custos_equipe" ON "public"."custos_equipe" AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete diarias" ON "public"."diarias";
CREATE POLICY "Admins can delete diarias" ON "public"."diarias" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read diarias" ON "public"."diarias";
CREATE POLICY "Authenticated can read diarias" ON "public"."diarias" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (get_colaborador_id(auth.uid()) = ANY (equipe_presente_ids)))));
DROP POLICY IF EXISTS "Managers can insert diarias" ON "public"."diarias";
CREATE POLICY "Managers can insert diarias" ON "public"."diarias" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR has_role(auth.uid(), 'responsavel_obra'::user_role)));
DROP POLICY IF EXISTS "Managers can update diarias" ON "public"."diarias";
CREATE POLICY "Managers can update diarias" ON "public"."diarias" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete entregas_colaborador" ON "public"."entregas_colaborador";
CREATE POLICY "Admins can delete entregas_colaborador" ON "public"."entregas_colaborador" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert entregas_colaborador" ON "public"."entregas_colaborador";
CREATE POLICY "Admins can insert entregas_colaborador" ON "public"."entregas_colaborador" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can read entregas_colaborador" ON "public"."entregas_colaborador";
CREATE POLICY "Admins can read entregas_colaborador" ON "public"."entregas_colaborador" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can update entregas_colaborador" ON "public"."entregas_colaborador";
CREATE POLICY "Admins can update entregas_colaborador" ON "public"."entregas_colaborador" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete fornecedores" ON "public"."fornecedores";
CREATE POLICY "Admins can delete fornecedores" ON "public"."fornecedores" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert fornecedores" ON "public"."fornecedores";
CREATE POLICY "Admins can insert fornecedores" ON "public"."fornecedores" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can read fornecedores" ON "public"."fornecedores";
CREATE POLICY "Admins can read fornecedores" ON "public"."fornecedores" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can update fornecedores" ON "public"."fornecedores";
CREATE POLICY "Admins can update fornecedores" ON "public"."fornecedores" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can insert historico_precos" ON "public"."historico_precos";
CREATE POLICY "Admins can insert historico_precos" ON "public"."historico_precos" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can read historico_precos" ON "public"."historico_precos";
CREATE POLICY "Admins can read historico_precos" ON "public"."historico_precos" AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert historico_salarios" ON "public"."historico_salarios";
CREATE POLICY "Admins can insert historico_salarios" ON "public"."historico_salarios" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can read historico_salarios" ON "public"."historico_salarios";
CREATE POLICY "Admins can read historico_salarios" ON "public"."historico_salarios" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete insumos" ON "public"."insumos";
CREATE POLICY "Admins can delete insumos" ON "public"."insumos" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert insumos" ON "public"."insumos";
CREATE POLICY "Admins can insert insumos" ON "public"."insumos" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can read insumos" ON "public"."insumos";
CREATE POLICY "Admins can read insumos" ON "public"."insumos" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can update insumos" ON "public"."insumos";
CREATE POLICY "Admins can update insumos" ON "public"."insumos" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete manutencao_recursos" ON "public"."manutencao_recursos";
CREATE POLICY "Admins can delete manutencao_recursos" ON "public"."manutencao_recursos" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_recursos.visita_id) AND has_role(auth.uid(), 'admin'::user_role)))));
DROP POLICY IF EXISTS "Managers can insert manutencao_recursos" ON "public"."manutencao_recursos";
CREATE POLICY "Managers can insert manutencao_recursos" ON "public"."manutencao_recursos" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_recursos.visita_id) AND (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can read manutencao_recursos" ON "public"."manutencao_recursos";
CREATE POLICY "Managers can read manutencao_recursos" ON "public"."manutencao_recursos" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_recursos.visita_id) AND (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can update manutencao_recursos" ON "public"."manutencao_recursos";
CREATE POLICY "Managers can update manutencao_recursos" ON "public"."manutencao_recursos" AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_recursos.visita_id) AND has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role])))));
DROP POLICY IF EXISTS "Admins can delete manutencao_servicos" ON "public"."manutencao_servicos";
CREATE POLICY "Admins can delete manutencao_servicos" ON "public"."manutencao_servicos" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_servicos.visita_id) AND has_role(auth.uid(), 'admin'::user_role)))));
DROP POLICY IF EXISTS "Managers can insert manutencao_servicos" ON "public"."manutencao_servicos";
CREATE POLICY "Managers can insert manutencao_servicos" ON "public"."manutencao_servicos" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_servicos.visita_id) AND (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can read manutencao_servicos" ON "public"."manutencao_servicos";
CREATE POLICY "Managers can read manutencao_servicos" ON "public"."manutencao_servicos" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_servicos.visita_id) AND (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), v.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can update manutencao_servicos" ON "public"."manutencao_servicos";
CREATE POLICY "Managers can update manutencao_servicos" ON "public"."manutencao_servicos" AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM manutencao_visitas v
  WHERE ((v.id = manutencao_servicos.visita_id) AND has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role])))));
DROP POLICY IF EXISTS "Admins can delete manutencao_visitas" ON "public"."manutencao_visitas";
CREATE POLICY "Admins can delete manutencao_visitas" ON "public"."manutencao_visitas" AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Managers can insert manutencao_visitas" ON "public"."manutencao_visitas";
CREATE POLICY "Managers can insert manutencao_visitas" ON "public"."manutencao_visitas" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))));
DROP POLICY IF EXISTS "Managers can read manutencao_visitas" ON "public"."manutencao_visitas";
CREATE POLICY "Managers can read manutencao_visitas" ON "public"."manutencao_visitas" AS PERMISSIVE FOR SELECT TO public USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))));
DROP POLICY IF EXISTS "Managers can update manutencao_visitas" ON "public"."manutencao_visitas";
CREATE POLICY "Managers can update manutencao_visitas" ON "public"."manutencao_visitas" AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete maquinas" ON "public"."maquinas";
CREATE POLICY "Admins can delete maquinas" ON "public"."maquinas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert maquinas" ON "public"."maquinas";
CREATE POLICY "Admins can insert maquinas" ON "public"."maquinas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can read maquinas" ON "public"."maquinas";
CREATE POLICY "Admins can read maquinas" ON "public"."maquinas" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can update maquinas" ON "public"."maquinas";
CREATE POLICY "Admins can update maquinas" ON "public"."maquinas" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete memorial_descritivo" ON "public"."memorial_descritivo";
CREATE POLICY "Admins can delete memorial_descritivo" ON "public"."memorial_descritivo" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert memorial_descritivo" ON "public"."memorial_descritivo";
CREATE POLICY "Admins can insert memorial_descritivo" ON "public"."memorial_descritivo" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Admins can update memorial_descritivo" ON "public"."memorial_descritivo";
CREATE POLICY "Admins can update memorial_descritivo" ON "public"."memorial_descritivo" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Managers can read memorial_descritivo" ON "public"."memorial_descritivo";
CREATE POLICY "Managers can read memorial_descritivo" ON "public"."memorial_descritivo" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Admins can delete orcamento_cotacoes" ON "public"."orcamento_cotacoes";
CREATE POLICY "Admins can delete orcamento_cotacoes" ON "public"."orcamento_cotacoes" AS PERMISSIVE FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can insert orcamento_cotacoes" ON "public"."orcamento_cotacoes";
CREATE POLICY "Admins can insert orcamento_cotacoes" ON "public"."orcamento_cotacoes" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update orcamento_cotacoes" ON "public"."orcamento_cotacoes";
CREATE POLICY "Admins can update orcamento_cotacoes" ON "public"."orcamento_cotacoes" AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Managers can read orcamento_cotacoes" ON "public"."orcamento_cotacoes";
CREATE POLICY "Managers can read orcamento_cotacoes" ON "public"."orcamento_cotacoes" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete orcamento_itens" ON "public"."orcamento_itens";
CREATE POLICY "Admins can delete orcamento_itens" ON "public"."orcamento_itens" AS PERMISSIVE FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can insert orcamento_itens" ON "public"."orcamento_itens";
CREATE POLICY "Admins can insert orcamento_itens" ON "public"."orcamento_itens" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update orcamento_itens" ON "public"."orcamento_itens";
CREATE POLICY "Admins can update orcamento_itens" ON "public"."orcamento_itens" AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Managers can read orcamento_itens" ON "public"."orcamento_itens";
CREATE POLICY "Managers can read orcamento_itens" ON "public"."orcamento_itens" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete plantas" ON "public"."plantas";
CREATE POLICY "Admins can delete plantas" ON "public"."plantas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert plantas" ON "public"."plantas";
CREATE POLICY "Admins can insert plantas" ON "public"."plantas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can read plantas" ON "public"."plantas";
CREATE POLICY "Admins can read plantas" ON "public"."plantas" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'arquitetura'::user_role]));
DROP POLICY IF EXISTS "Admins can update plantas" ON "public"."plantas";
CREATE POLICY "Admins can update plantas" ON "public"."plantas" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete processo_etapas" ON "public"."processo_etapas";
CREATE POLICY "Admins can delete processo_etapas" ON "public"."processo_etapas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert processo_etapas" ON "public"."processo_etapas";
CREATE POLICY "Admins can insert processo_etapas" ON "public"."processo_etapas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update processo_etapas" ON "public"."processo_etapas";
CREATE POLICY "Admins can update processo_etapas" ON "public"."processo_etapas" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated can read processo_etapas" ON "public"."processo_etapas";
CREATE POLICY "Authenticated can read processo_etapas" ON "public"."processo_etapas" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can delete processos" ON "public"."processos";
CREATE POLICY "Admins can delete processos" ON "public"."processos" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert processos" ON "public"."processos";
CREATE POLICY "Admins can insert processos" ON "public"."processos" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update processos" ON "public"."processos";
CREATE POLICY "Admins can update processos" ON "public"."processos" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Authenticated can read processos" ON "public"."processos";
CREATE POLICY "Authenticated can read processos" ON "public"."processos" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can insert profiles" ON "public"."profiles";
CREATE POLICY "Admins can insert profiles" ON "public"."profiles" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR (auth.uid() = id)));
DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."profiles";
CREATE POLICY "Admins can view all profiles" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
CREATE POLICY "Users can update own profile" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";
CREATE POLICY "Users can view own profile" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
DROP POLICY IF EXISTS "Admins can delete projeto_arquivos" ON "public"."projeto_arquivos";
CREATE POLICY "Admins can delete projeto_arquivos" ON "public"."projeto_arquivos" AS PERMISSIVE FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can insert projeto_arquivos" ON "public"."projeto_arquivos";
CREATE POLICY "Admins can insert projeto_arquivos" ON "public"."projeto_arquivos" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))));
DROP POLICY IF EXISTS "Managers can read projeto_arquivos" ON "public"."projeto_arquivos";
CREATE POLICY "Managers can read projeto_arquivos" ON "public"."projeto_arquivos" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))));
DROP POLICY IF EXISTS "Admins can delete projeto_comentarios" ON "public"."projeto_comentarios";
CREATE POLICY "Admins can delete projeto_comentarios" ON "public"."projeto_comentarios" AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'admin'::user_role) OR (usuario_id = auth.uid())));
DROP POLICY IF EXISTS "Managers can insert projeto_comentarios" ON "public"."projeto_comentarios";
CREATE POLICY "Managers can insert projeto_comentarios" ON "public"."projeto_comentarios" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))));
DROP POLICY IF EXISTS "Managers can read projeto_comentarios" ON "public"."projeto_comentarios";
CREATE POLICY "Managers can read projeto_comentarios" ON "public"."projeto_comentarios" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), projeto_id))));
DROP POLICY IF EXISTS "Users can update own comments" ON "public"."projeto_comentarios";
CREATE POLICY "Users can update own comments" ON "public"."projeto_comentarios" AS PERMISSIVE FOR UPDATE TO authenticated USING ((usuario_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can delete projeto_mao_de_obra" ON "public"."projeto_mao_de_obra";
CREATE POLICY "Admins can delete projeto_mao_de_obra" ON "public"."projeto_mao_de_obra" AS PERMISSIVE FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can insert projeto_mao_de_obra" ON "public"."projeto_mao_de_obra";
CREATE POLICY "Admins can insert projeto_mao_de_obra" ON "public"."projeto_mao_de_obra" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update projeto_mao_de_obra" ON "public"."projeto_mao_de_obra";
CREATE POLICY "Admins can update projeto_mao_de_obra" ON "public"."projeto_mao_de_obra" AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Managers can read projeto_mao_de_obra" ON "public"."projeto_mao_de_obra";
CREATE POLICY "Managers can read projeto_mao_de_obra" ON "public"."projeto_mao_de_obra" AS PERMISSIVE FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete projetos" ON "public"."projetos";
CREATE POLICY "Admins can delete projetos" ON "public"."projetos" AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert projetos" ON "public"."projetos";
CREATE POLICY "Admins can insert projetos" ON "public"."projetos" AS PERMISSIVE FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update projetos" ON "public"."projetos";
CREATE POLICY "Admins can update projetos" ON "public"."projetos" AS PERMISSIVE FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Managers can read projetos" ON "public"."projetos";
CREATE POLICY "Managers can read projetos" ON "public"."projetos" AS PERMISSIVE FOR SELECT TO public USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND is_allocated_to_project(auth.uid(), id))));
DROP POLICY IF EXISTS "Admins can delete propostas" ON "public"."propostas";
CREATE POLICY "Admins can delete propostas" ON "public"."propostas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Admins can insert propostas" ON "public"."propostas";
CREATE POLICY "Admins can insert propostas" ON "public"."propostas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can read propostas" ON "public"."propostas";
CREATE POLICY "Admins can read propostas" ON "public"."propostas" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can update propostas" ON "public"."propostas";
CREATE POLICY "Admins can update propostas" ON "public"."propostas" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete recebimento_itens" ON "public"."recebimento_itens";
CREATE POLICY "Admins can delete recebimento_itens" ON "public"."recebimento_itens" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read recebimento_itens" ON "public"."recebimento_itens";
CREATE POLICY "Authenticated can read recebimento_itens" ON "public"."recebimento_itens" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (EXISTS ( SELECT 1
   FROM registros r
  WHERE ((r.id = recebimento_itens.registro_id) AND is_allocated_to_project(auth.uid(), r.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can insert recebimento_itens" ON "public"."recebimento_itens";
CREATE POLICY "Managers can insert recebimento_itens" ON "public"."recebimento_itens" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (EXISTS ( SELECT 1
   FROM registros r
  WHERE ((r.id = recebimento_itens.registro_id) AND is_allocated_to_project(auth.uid(), r.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can update recebimento_itens" ON "public"."recebimento_itens";
CREATE POLICY "Managers can update recebimento_itens" ON "public"."recebimento_itens" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete registro_insumos" ON "public"."registro_insumos";
CREATE POLICY "Admins can delete registro_insumos" ON "public"."registro_insumos" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read registro_insumos" ON "public"."registro_insumos";
CREATE POLICY "Authenticated can read registro_insumos" ON "public"."registro_insumos" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (EXISTS ( SELECT 1
   FROM registros r
  WHERE ((r.id = registro_insumos.registro_id) AND (is_allocated_to_project(auth.uid(), r.projeto_id) OR (get_colaborador_id(auth.uid()) = ANY (r.executores_ids)))))))));
DROP POLICY IF EXISTS "Managers can insert registro_insumos" ON "public"."registro_insumos";
CREATE POLICY "Managers can insert registro_insumos" ON "public"."registro_insumos" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (EXISTS ( SELECT 1
   FROM registros r
  WHERE ((r.id = registro_insumos.registro_id) AND is_allocated_to_project(auth.uid(), r.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can update registro_insumos" ON "public"."registro_insumos";
CREATE POLICY "Managers can update registro_insumos" ON "public"."registro_insumos" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete registro_maquinas" ON "public"."registro_maquinas";
CREATE POLICY "Admins can delete registro_maquinas" ON "public"."registro_maquinas" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read registro_maquinas" ON "public"."registro_maquinas";
CREATE POLICY "Authenticated can read registro_maquinas" ON "public"."registro_maquinas" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (EXISTS ( SELECT 1
   FROM registros r
  WHERE ((r.id = registro_maquinas.registro_id) AND is_allocated_to_project(auth.uid(), r.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can insert registro_maquinas" ON "public"."registro_maquinas";
CREATE POLICY "Managers can insert registro_maquinas" ON "public"."registro_maquinas" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (EXISTS ( SELECT 1
   FROM registros r
  WHERE ((r.id = registro_maquinas.registro_id) AND is_allocated_to_project(auth.uid(), r.projeto_id)))))));
DROP POLICY IF EXISTS "Managers can update registro_maquinas" ON "public"."registro_maquinas";
CREATE POLICY "Managers can update registro_maquinas" ON "public"."registro_maquinas" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Admins can delete registros" ON "public"."registros";
CREATE POLICY "Admins can delete registros" ON "public"."registros" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read registros" ON "public"."registros";
CREATE POLICY "Authenticated can read registros" ON "public"."registros" AS PERMISSIVE FOR SELECT TO authenticated USING ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (is_allocated_to_project(auth.uid(), projeto_id) OR (get_colaborador_id(auth.uid()) = ANY (executores_ids)) OR (get_colaborador_id(auth.uid()) = ANY (equipe_presente_ids))))));
DROP POLICY IF EXISTS "Managers can insert registros" ON "public"."registros";
CREATE POLICY "Managers can insert registros" ON "public"."registros" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]) OR (has_role(auth.uid(), 'responsavel_obra'::user_role) AND (is_allocated_to_project(auth.uid(), projeto_id) OR (get_colaborador_id(auth.uid()) = ANY (executores_ids))))));
DROP POLICY IF EXISTS "Managers can update registros" ON "public"."registros";
CREATE POLICY "Managers can update registros" ON "public"."registros" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Managers can read registros_historico" ON "public"."registros_historico";
CREATE POLICY "Managers can read registros_historico" ON "public"."registros_historico" AS PERMISSIVE FOR SELECT TO authenticated USING (is_manager_or_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete trechos" ON "public"."trechos";
CREATE POLICY "Admins can delete trechos" ON "public"."trechos" AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Authenticated can read trechos" ON "public"."trechos";
CREATE POLICY "Authenticated can read trechos" ON "public"."trechos" AS PERMISSIVE FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role, 'arquitetura'::user_role, 'responsavel_obra'::user_role]));
DROP POLICY IF EXISTS "Managers can insert trechos" ON "public"."trechos";
CREATE POLICY "Managers can insert trechos" ON "public"."trechos" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Managers can update trechos" ON "public"."trechos";
CREATE POLICY "Managers can update trechos" ON "public"."trechos" AS PERMISSIVE FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role, 'gestao_campo'::user_role]));
DROP POLICY IF EXISTS "Only admins can manage roles" ON "public"."user_roles";
CREATE POLICY "Only admins can manage roles" ON "public"."user_roles" AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::user_role));
DROP POLICY IF EXISTS "Users can view own roles" ON "public"."user_roles";
CREATE POLICY "Users can view own roles" ON "public"."user_roles" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR has_any_role(auth.uid(), ARRAY['admin'::user_role, 'administrativo'::user_role])));

-- Policies (storage)
DROP POLICY IF EXISTS "Admins can delete project files" ON "storage"."objects";
CREATE POLICY "Admins can delete project files" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'projeto-arquivos'::text) AND has_role(auth.uid(), 'admin'::user_role)));
DROP POLICY IF EXISTS "Authenticated read for colaboradores fotos" ON "storage"."objects";
CREATE POLICY "Authenticated read for colaboradores fotos" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'colaboradores-fotos'::text));
DROP POLICY IF EXISTS "Authenticated read for registros midia" ON "storage"."objects";
CREATE POLICY "Authenticated read for registros midia" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'registros-midia'::text));
DROP POLICY IF EXISTS "Authenticated users can delete colaboradores fotos" ON "storage"."objects";
CREATE POLICY "Authenticated users can delete colaboradores fotos" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO public USING ((bucket_id = 'colaboradores-fotos'::text));
DROP POLICY IF EXISTS "Authenticated users can delete registros midia" ON "storage"."objects";
CREATE POLICY "Authenticated users can delete registros midia" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO public USING ((bucket_id = 'registros-midia'::text));
DROP POLICY IF EXISTS "Authenticated users can read project files" ON "storage"."objects";
CREATE POLICY "Authenticated users can read project files" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'projeto-arquivos'::text));
DROP POLICY IF EXISTS "Authenticated users can update colaboradores fotos" ON "storage"."objects";
CREATE POLICY "Authenticated users can update colaboradores fotos" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO public USING ((bucket_id = 'colaboradores-fotos'::text));
DROP POLICY IF EXISTS "Authenticated users can update registros midia" ON "storage"."objects";
CREATE POLICY "Authenticated users can update registros midia" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO public USING ((bucket_id = 'registros-midia'::text));
DROP POLICY IF EXISTS "Authenticated users can upload colaboradores fotos" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload colaboradores fotos" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = 'colaboradores-fotos'::text));
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload project files" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'projeto-arquivos'::text));
DROP POLICY IF EXISTS "Authenticated users can upload registros midia" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload registros midia" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = 'registros-midia'::text));

-- Triggers
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
DROP TRIGGER IF EXISTS "set_calendario_eventos_audit" ON "public"."calendario_eventos";
CREATE TRIGGER set_calendario_eventos_audit BEFORE INSERT OR UPDATE ON calendario_eventos FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "update_calendario_eventos_updated_at" ON "public"."calendario_eventos";
CREATE TRIGGER update_calendario_eventos_updated_at BEFORE UPDATE ON calendario_eventos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_clientes" ON "public"."clientes";
CREATE TRIGGER set_audit_clientes BEFORE INSERT OR UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "trg_cliente_atividade" ON "public"."clientes";
CREATE TRIGGER trg_cliente_atividade AFTER UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION log_cliente_atividade();
DROP TRIGGER IF EXISTS "update_clientes_updated_at" ON "public"."clientes";
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_colaboradores" ON "public"."colaboradores";
CREATE TRIGGER set_audit_colaboradores BEFORE INSERT OR UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "trigger_log_salario" ON "public"."custos_equipe";
CREATE TRIGGER trigger_log_salario AFTER UPDATE ON custos_equipe FOR EACH ROW EXECUTE FUNCTION log_alteracao_salario();
DROP TRIGGER IF EXISTS "set_audit_diarias" ON "public"."diarias";
CREATE TRIGGER set_audit_diarias BEFORE INSERT OR UPDATE ON diarias FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "update_diarias_updated_at" ON "public"."diarias";
CREATE TRIGGER update_diarias_updated_at BEFORE UPDATE ON diarias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_fornecedores" ON "public"."fornecedores";
CREATE TRIGGER set_audit_fornecedores BEFORE INSERT OR UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "update_fornecedores_updated_at" ON "public"."fornecedores";
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_insumos" ON "public"."insumos";
CREATE TRIGGER set_audit_insumos BEFORE INSERT OR UPDATE ON insumos FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "trg_log_preco_insumo" ON "public"."insumos";
CREATE TRIGGER trg_log_preco_insumo BEFORE UPDATE ON insumos FOR EACH ROW EXECUTE FUNCTION log_preco_insumo();
DROP TRIGGER IF EXISTS "set_manutencao_visitas_audit" ON "public"."manutencao_visitas";
CREATE TRIGGER set_manutencao_visitas_audit BEFORE INSERT OR UPDATE ON manutencao_visitas FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "update_manutencao_visitas_updated_at" ON "public"."manutencao_visitas";
CREATE TRIGGER update_manutencao_visitas_updated_at BEFORE UPDATE ON manutencao_visitas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_maquinas" ON "public"."maquinas";
CREATE TRIGGER set_audit_maquinas BEFORE INSERT OR UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "trigger_verificar_manutencao" ON "public"."maquinas";
CREATE TRIGGER trigger_verificar_manutencao BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION verificar_manutencao_maquina();
DROP TRIGGER IF EXISTS "update_maquinas_updated_at" ON "public"."maquinas";
CREATE TRIGGER update_maquinas_updated_at BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_orcamento_itens_audit" ON "public"."orcamento_itens";
CREATE TRIGGER set_orcamento_itens_audit BEFORE INSERT OR UPDATE ON orcamento_itens FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "set_orcamento_itens_updated_at" ON "public"."orcamento_itens";
CREATE TRIGGER set_orcamento_itens_updated_at BEFORE UPDATE ON orcamento_itens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_plantas" ON "public"."plantas";
CREATE TRIGGER set_audit_plantas BEFORE INSERT OR UPDATE ON plantas FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "trg_log_preco_planta" ON "public"."plantas";
CREATE TRIGGER trg_log_preco_planta BEFORE UPDATE ON plantas FOR EACH ROW EXECUTE FUNCTION log_preco_planta();
DROP TRIGGER IF EXISTS "update_plantas_updated_at" ON "public"."plantas";
CREATE TRIGGER update_plantas_updated_at BEFORE UPDATE ON plantas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_processos_audit" ON "public"."processos";
CREATE TRIGGER set_processos_audit BEFORE INSERT OR UPDATE ON processos FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "update_processos_updated_at" ON "public"."processos";
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON processos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "update_profiles_updated_at" ON "public"."profiles";
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_projetos_audit" ON "public"."projetos";
CREATE TRIGGER set_projetos_audit BEFORE INSERT OR UPDATE ON projetos FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "set_projetos_updated_at" ON "public"."projetos";
CREATE TRIGGER set_projetos_updated_at BEFORE UPDATE ON projetos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "trg_projeto_atividade" ON "public"."projetos";
CREATE TRIGGER trg_projeto_atividade AFTER INSERT OR UPDATE ON projetos FOR EACH ROW EXECUTE FUNCTION log_projeto_atividade();
DROP TRIGGER IF EXISTS "set_audit_propostas" ON "public"."propostas";
CREATE TRIGGER set_audit_propostas BEFORE INSERT OR UPDATE ON propostas FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "trg_proposta_atividade" ON "public"."propostas";
CREATE TRIGGER trg_proposta_atividade AFTER INSERT OR UPDATE ON propostas FOR EACH ROW EXECUTE FUNCTION log_proposta_atividade();
DROP TRIGGER IF EXISTS "update_propostas_updated_at" ON "public"."propostas";
CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON propostas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "trigger_atualizar_horas_maquina" ON "public"."registro_maquinas";
CREATE TRIGGER trigger_atualizar_horas_maquina AFTER INSERT OR DELETE OR UPDATE ON registro_maquinas FOR EACH ROW EXECUTE FUNCTION atualizar_horas_maquina();
DROP TRIGGER IF EXISTS "set_audit_registros" ON "public"."registros";
CREATE TRIGGER set_audit_registros BEFORE INSERT OR UPDATE ON registros FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
DROP TRIGGER IF EXISTS "tr_log_registro_changes" ON "public"."registros";
CREATE TRIGGER tr_log_registro_changes AFTER INSERT OR UPDATE ON registros FOR EACH ROW EXECUTE FUNCTION log_registro_changes();
DROP TRIGGER IF EXISTS "trg_registro_atividade" ON "public"."registros";
CREATE TRIGGER trg_registro_atividade AFTER INSERT OR DELETE OR UPDATE ON registros FOR EACH ROW EXECUTE FUNCTION log_registro_atividade();
DROP TRIGGER IF EXISTS "update_registros_updated_at" ON "public"."registros";
CREATE TRIGGER update_registros_updated_at BEFORE UPDATE ON registros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_audit_trechos" ON "public"."trechos";
CREATE TRIGGER set_audit_trechos BEFORE INSERT OR UPDATE ON trechos FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

COMMIT;