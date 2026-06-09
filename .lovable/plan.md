## Status atual

As 5 tabelas do Módulo de Demandas já foram criadas na migration anterior (`pipelines`, `pipelines_etapas`, `demandas`, `demanda_etapas_historico`, `demanda_responsaveis`), com seed dos 2 pipelines, 23 etapas, índices, trigger `updated_at` e RLS habilitada. Nenhuma tabela existente foi alterada.

Porém as policies ficaram permissivas (`USING (true)`), o que não atende ao padrão do projeto ("RLS ativo com policies por papel"). Este plano fecha essa pendência sem mexer em estrutura nem em tabelas existentes.

## O que será feito

Uma única migration de refinamento de RLS sobre as 5 tabelas já criadas:

### `pipelines` e `pipelines_etapas` (catálogo de configuração)
- SELECT: qualquer usuário autenticado.
- INSERT / UPDATE / DELETE: somente `admin` e `administrativo` (via `has_any_role`).

### `demandas`
- SELECT:
  - `admin`, `administrativo`, `gestao_campo`, `arquitetura`, `gestor` veem tudo.
  - `responsavel_obra` e `operador_campo` veem apenas demandas onde são `responsavel_atual_id` ou aparecem em `demanda_responsaveis`, ou cujo `orcamento_id`/`cliente_id` esteja num projeto ao qual estão alocados (reaproveitando `is_allocated_to_project` quando aplicável).
- INSERT: `admin`, `administrativo`, `gestao_campo`, `arquitetura`, `gestor`.
- UPDATE: mesmos papéis acima, mais o `responsavel_atual_id` da própria demanda.
- DELETE: somente `admin` (padrão do projeto: deleção é admin-only).

### `demanda_responsaveis`
- SELECT: quem pode ver a demanda pai.
- INSERT / UPDATE / DELETE: `admin`, `administrativo`, `gestao_campo`, `arquitetura`, `gestor`.

### `demanda_etapas_historico` (log imutável de auditoria)
- SELECT: quem pode ver a demanda pai.
- INSERT: feito apenas por trigger/funções `SECURITY DEFINER` (sem policy de INSERT para usuários comuns).
- UPDATE / DELETE: nenhuma policy (imutável), conforme padrão "Logs de auditoria são imutáveis".

### Trigger de histórico automático
Adicionar trigger `BEFORE UPDATE` em `demandas`: quando `etapa_atual_id` mudar, insere linha em `demanda_etapas_historico` com `etapa_de_id`, `etapa_para_id`, `movido_por = auth.uid()` mapeado para colaborador via `get_colaborador_id`, e `tempo_na_etapa_dias` calculado a partir da última entrada do histórico (ou `data_entrada` se for a primeira transição). Função `SECURITY DEFINER` com `search_path = public`.

### GRANTs
Reafirmar `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` e `GRANT ALL ... TO service_role` em todas as 5 tabelas (idempotente), garantindo que a Data API funcione.

## Fora de escopo

- Nenhuma interface (UI) será criada.
- Nenhuma tabela existente será alterada.
- Sem `realtime` por enquanto (será habilitado quando a tela operacional for construída).

## Próximo passo proposto após aprovação

Rodar a migration de policies + trigger de histórico. Depois disso, partir para a tela do módulo (Kanban estilo Monday) em PR separado.
