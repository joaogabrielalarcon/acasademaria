## Objetivo

Tornar a Etapa 4 (markup por categoria gravado em `orcamento_categorias_markup`) a única fonte de verdade do markup. Remover o sistema paralelo `markupsCategoria` / `markupModal` do Resumo Final. Expandir Etapa 4 para incluir Mão de Obra, Fretes, Transporte e Custos Indiretos. Adicionar ajuste bidirecional item a item no fechamento, com rastro de auditoria.

## Critério de aceite

- Um único lugar define markup (Etapa 4, persistido em `orcamento_categorias_markup`).
- Resumo Final (Etapa 6) lê markup do banco; totais batem com Etapa 4.
- Etapa 4 contempla categorias de plantas + Insumos + Mão de Obra + Fretes + Transporte + Custos Indiretos.
- Operador pode ajustar item a item: editar markup recalcula venda; editar venda recalcula markup. Default vem da categoria.
- Cada ajuste manual em item registra autor + timestamp + observação curta opcional. Categoria continua exigindo motivo (RPC existente).
- Etapas 1, 2, 3 intactas. Salvamento não quebra.

## Mudanças

### 1. Banco

Migration nova:
- Adicionar colunas em `orcamento_itens`:
  - `markup_override_pct numeric(8,4)` (nullable; presente = ajuste manual)
  - `preco_venda_override` (nullable; sempre derivado/sincronizado com markup)
  - `ajustado_por uuid`, `ajustado_em timestamptz`, `ajuste_obs text`
- Adicionar análogos em `orcamento_insumos`, `orcamento_mo`, `orcamento_fretes`, `orcamento_transporte`, `orcamento_custos_indiretos` (apenas `markup_override_pct`, `ajustado_por`, `ajustado_em`, `ajuste_obs`; preço unitário continua na tabela específica).
- Trigger `audit_orcamento_item_markup`: ao mudar `markup_override_pct`, grava em `audit_price_changes` ou tabela já existente; preencher `ajustado_por`/`ajustado_em` no trigger usando `auth.uid()` e `now()`.
- Categoria "Mão de Obra", "Fretes", "Transporte", "Custos Indiretos" passam a ser válidas em `perfis_markup_categorias` (apenas atualizar lista `CATEGORIAS_MARKUP` no front; constraint atual já é texto livre).

### 2. Etapa 4 (`Etapa4MarkupBlocoA.tsx`)

- Expandir `custosQuery` para somar custos de:
  - "Insumos": `orcamento_insumos` (não automáticos).
  - "Mão de Obra": soma de `orcamento_mo.valor_com_imposto`.
  - "Fretes": `orcamento_fretes.valor_total`.
  - "Transporte": `orcamento_transporte.subtotal`.
  - "Custos Indiretos": `orcamento_custos_indiretos.total`.
- Adicionar essas categorias à lista canônica (`CATEGORIAS_MARKUP` em `GerenciarPerfisMarkupDialog.tsx`).
- `useEtapa4Validacao`: validar que todas as categorias com custo > 0 (não só `orcamento_itens`) têm markup definido.

### 3. Resumo Final (Etapa 6) em `NovoOrcamento.tsx`

- Remover `markupsCategoria`, `markupModal`, `abrirEdicaoMarkup`, `confirmarMarkup`, modal de markup categoria e UI do Card "Perfil de markup" duplicado.
- Substituir hidratação de `novosMarkups` (linha 1421-1432) por leitura direta de `orcamento_categorias_markup`.
- `linhasResumo` e `totaisResumo` passam a derivar de `orcamento_categorias_markup` (query nova `useOrcamentoMarkups(id)`).
- `persistirOrcamentoCompleto`: ao gravar `orcamento_itens`/`orcamento_insumos`, usar markup do banco (categoria) como base; se item tem `markup_override_pct`, usa override; `preco_venda_unitario` = custo * (1 + markupEfetivo/100).
- Auto-save: remover `markupsCategoria` das dependências.

### 4. Ajuste item a item (novo bloco no fechamento — Etapa 6)

Novo componente `Etapa6AjustesItem.tsx`:
- Lista cada item de custo agrupado por categoria (plantas, insumos, MO, fretes, transporte, indiretos).
- Mostra: descrição, qtd, custo unit, markup % (default da categoria ou override), venda unit, venda total.
- Inputs editáveis: markup % e venda unit (bidirecionais). Limpar = volta ao default da categoria.
- Campo "observação" (opcional, max 200 chars) no popover de edição. Sem mínimo de caracteres.
- Ao salvar (debounce ou onBlur), grava `markup_override_pct`, `ajuste_obs` no row correspondente; trigger preenche autor/timestamp.
- Indicador visual quando o item está em override (badge "ajustado") com tooltip mostrando autor + quando + obs.

### 5. Limpeza

- Remover snapshot do `markupsCategoria` (substituir por snapshot de `orcamento_categorias_markup` + overrides de itens).
- Atualizar `versoesPendentes` para não gravar mais `markup_${categoria}` (RPC já grava em `audit_price_changes`).

## Arquivos afetados

- `supabase/migrations/<nova>.sql` (novo)
- `src/components/orcamento/Etapa4MarkupBlocoA.tsx`
- `src/components/orcamento/GerenciarPerfisMarkupDialog.tsx` (lista CATEGORIAS_MARKUP)
- `src/components/orcamento/Etapa6AjustesItem.tsx` (novo)
- `src/pages/NovoOrcamento.tsx` (refatoração ampla da etapa 6 e do save)

## Risco

`NovoOrcamento.tsx` tem 6500 linhas com auto-save acoplado. Vou manter `buildPayload` e `persistirOrcamentoCompleto` intactos no esqueleto, trocando apenas a fonte do markup. Snapshots antigos permanecem válidos (campo `markupsCategoria` continua presente lá só como histórico, mas não usado).

## Confirmar antes de seguir

Quer que o ajuste item a item viva na Etapa 6 (fechamento, como descrito) ou prefere um sub-bloco dentro da própria Etapa 4? Em ambos os casos, a fonte do dado é a mesma (`orcamento_itens.markup_override_pct` etc.).