## Auditoria transversal — status atual vs. o que falta

Antes de qualquer código novo, um diagnóstico honesto de cada item. Marquei ✅ atendido, 🟡 parcial, ❌ falta.

---

### (a) RLS no Supabase com escopo por operador

**Status: 🟡 parcial.**

Atendido:
- RLS já está habilitada na maioria das tabelas operacionais (`projetos`, `clientes`, `diario_visitas`, `colaboradores`, `user_roles`, `fornecedores`, `plantas`, `insumos`).
- Funções security-definer corretas: `has_role`, `has_any_role`, `is_allocated_to_project`, `can_access_diario_project`, `can_access_manutencao_client`, `can_access_avaliacao`. Sem recursão.
- Catálogo (`fornecedores`, `plantas`, `insumos`, `categorias_*`) com leitura para autenticados — alinhado à Core memory "Shared Catalog Access".

Falta / a verificar (PR transversal de RLS):
- Tabelas adicionadas no PR2 sem checagem explícita: `fornecedor_atendentes`, `operador_atendente_padrao`, `fornecedores_merge_log`, `itens_merge_log`. Confirmar RLS habilitada e políticas: leitura para autenticados; escrita admin/administrativo; `operador_atendente_padrao` com escopo `auth.uid() = operador_id`.
- Logs (`*_merge_log`, `historico_precos`, `registros_historico`, `historico_salarios`): leitura restrita a admin/administrativo; insert apenas via trigger/security-definer.
- Tabelas de orçamento (`orcamento_*`): garantir leitura/escrita restrita a admin/administrativo/arquitetura (operador_campo não acessa orçamento).
- Confirmar que nenhuma tabela ficou com `FOR ALL USING (true)` legada.

### (b) Índices em FKs e colunas mais consultadas

**Status: 🟡 parcial.** Há alguns índices ad-hoc (`idx_insumos_tipo_produto` do PR1; índice trgm em `fornecedores.nome`), mas não há cobertura sistemática.

Falta — migration única adicionando `IF NOT EXISTS`:
- FKs: `fornecedor_id` em `plantas`, `insumos`, `historico_precos`, `estoque_movimentacoes`, `financeiro_movimentacoes`, `orcamento_cotacoes`, `orcamento_insumos`, `fornecedor_avaliacoes`, `fornecedor_atendentes`.
- `historico_precos (item_id, item_tipo)` composto + `(data_orcamento DESC)`.
- `orcamento_cotacoes (orcamento_id)`, `(item_id, item_tipo)`.
- `projetos (cliente_id)`, `(status)`, `(responsavel_id)`.
- `crm_cards (status)`, `(projeto_id)`, `(cliente_id)`.
- `diario_visitas (projeto_id, data_visita DESC)`, `(cliente_id)`.
- `financeiro_movimentacoes (data_movimentacao DESC)`, `(projeto_id)`, `(tipo)`.
- Parciais úteis: `plantas (ativo) WHERE ativo`, `fornecedores (status) WHERE status='ativo'`.

### (c) Loading / empty / error padronizados

**Status: 🟡 parcial.** A maioria das páginas trata `isLoading`, mas o estilo é inconsistente: algumas usam `Loader2` inline, outras nada; "empty state" frequentemente é só "—" ou nada; erros geralmente caem em `toast` mas não há tela de fallback.

Falta:
- Criar 3 componentes reutilizáveis em `src/components/ui/`: `<ListSkeleton rows={n} />`, `<EmptyState icon title description action />`, `<ErrorState message retry />`.
- Aplicar nas listagens críticas: `Plantas`, `Insumos`, `Fornecedores`, `Orcamentos`, `Clientes`, `Equipe`, `Maquinas`, `Compras`, `AReceber`, `Diario`, `MinhaAgenda`.
- Padronizar modais (Mesclar, Importar, Fornecedor edit) com mesmos estados.

### (d) Confirmação dupla com prévia detalhada para ações destrutivas

**Status: 🟡 parcial.**
- Atendido: `MesclarItensDialog` já mostra prévia + alertas de divergência; `merge_fornecedores`/`plantas`/`insumos` marcam `fundido` em vez de deletar.
- Atendido: exclusão de cliente/planta usa `AlertDialog` simples.

Falta:
- Componente `<ConfirmDestructiveDialog>` exigindo digitar o nome do item OU checkbox "Entendo que esta ação..." + prévia (contadores de relacionamento) antes de habilitar o botão.
- Aplicar em: exclusão de Planta, Insumo, Fornecedor, Cliente, Projeto; mudança de status em massa; inativação de colaborador (já tem motive obrigatório, mas falta prévia de impacto).
- Fusão: já tem prévia, adicionar passo final "confirmo a mesclagem de N itens em X" antes do botão executar.

### (e) Auditoria de mutações (preço, fusão, status)

**Status: 🟡 parcial.**

Atendido:
- `historico_precos` populado por triggers `log_preco_planta` e `log_preco_insumo`.
- `fornecedores_merge_log` e `itens_merge_log` registram fusão com `executado_por`, `executado_por_nome`, `dados_anteriores`, `contadores`.
- `historico_salarios` via `log_alteracao_salario`.
- `registros_historico` via `log_registro_changes`.
- `cliente_atividades` via `log_*_atividade`.

Falta:
- Tabela `audit_status_changes` (entidade, entidade_id, status_anterior, status_novo, usuario_id, usuario_nome, motivo, criado_em) com triggers em: `projetos`, `crm_cards`, `financeiro_parcelas`, `colaboradores.ativo`, `fornecedores.status`, `plantas.ativo`, `insumos.ativo`.
- Garantir que `historico_precos` capture também alterações via `merge_*` (já capturado para insumos/plantas; revisar fornecedores).
- Política de leitura dos logs: admin/administrativo apenas.

### (f) Responsividade mobile básica

**Status: 🟡 parcial.** Existe `MobileNav` e `MobileHeader`. Algumas páginas usam classes responsivas, mas tabelas críticas (Fornecedores, Plantas, Recebimento) usam `DataTableExcel` que rola horizontalmente mas não oferece "card view" no mobile.

Falta nas telas de campo:
- `NovoRecebimento`: revisar grid/tabs em viewport <640px (botões em coluna única, inputs full-width, número grande para quantidade).
- `Fornecedores` (consulta): card-list em mobile com nome, mercado, telefone (botão WhatsApp já existe), atendente padrão.
- `Plantas` (busca): em mobile, exibir cards (nome popular + altura formatada + foto thumbnail) em vez de tabela.
- Garantir que modais (`MesclarItensDialog`, `ImportarPlantasDialog`, `FornecedorPopover`) usem `max-h-[90vh] overflow-auto` e largura fluida.

### (g) Navegação por teclado em tabelas e formulários

**Status: ❌ pouco coberto.** Componentes shadcn (Input, Select, Button) já são acessíveis por padrão, mas:
- `DataTableExcel` não tem navegação por setas entre células nem `Enter` para abrir editor inline.
- Modais não fecham com `Esc` consistentemente (na verdade Radix Dialog faz isso por padrão — confirmar que não há `onOpenChange` bloqueando).
- Forms longos (`NovaPlanta`, `NovoCliente`, `NovoOrcamento`) não têm "submit on Cmd+Enter" nem foco automático no primeiro campo.

Falta:
- `DataTableExcel`: arrow-keys para navegar linhas, `Enter` para abrir ações da linha, `/` para focar busca.
- Hook `useFormKeyboard({ onSubmit })` que escuta `Cmd/Ctrl+Enter`.
- Auto-focus no primeiro campo dos modais (`autoFocus` no primeiro Input).
- Botão de ação primária recebe `Enter` global no contexto do form.

---

## Plano de execução — 4 PRs transversais antes do próximo PR funcional

### PR-T1 — Banco: RLS auditada + índices (1 migração SQL)
- Habilitar/ajustar RLS nas tabelas de log e PR2.
- Criar todos os índices listados em (b) com `IF NOT EXISTS`.
- Rodar `supabase--linter` e zerar erros críticos.

### PR-T2 — UI primitives (loading/empty/error + confirm destrutivo)
- `ListSkeleton`, `EmptyState`, `ErrorState`, `ConfirmDestructiveDialog`.
- Aplicar nas 10 listagens críticas e nos 4 modais destrutivos.
- Wrap em `MesclarItensDialog` e exclusões para usar `ConfirmDestructiveDialog`.

### PR-T3 — Auditoria de status + responsividade mobile
- Migration: tabela `audit_status_changes` + triggers nas 7 entidades.
- Card-view mobile para `Plantas`, `Fornecedores`, `NovoRecebimento`.
- Padronizar modais com largura/altura fluidas.

### PR-T4 — Acessibilidade por teclado
- Setas/Enter em `DataTableExcel`.
- `useFormKeyboard` aplicado nos forms longos.
- Auto-focus em modais.

---

## Decisões a confirmar antes de começar

1. **Escopo de RLS para `orcamento_*`**: confirmar que `operador_campo` e `responsavel_obra` não têm acesso a orçamentos (atualmente está aberto?). Quero restringir a `admin`, `administrativo`, `arquitetura`.
2. **`ConfirmDestructiveDialog`**: prefere "digitar o nome" (mais friccional, estilo GitHub) ou só checkbox "Entendo o impacto" + prévia? Recomendo digitar o nome para exclusão definitiva e checkbox para fusão.
3. **Card-view mobile**: posso adicionar um modo automático em `DataTableExcel` (vira cards <640px) ou prefere componentes dedicados em cada página?
4. **Ordem de execução**: posso emendar os 4 PRs nesta mesma conversa, ou paramos após cada um para você validar visualmente no preview?
