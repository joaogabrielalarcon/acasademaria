## O que vai mudar

### 1. Reestruturação das etapas (de 5 para 4)

```text
Hoje:  1 Cadastro · 2 Fornecedores · 3 Markup · 4 MO/Fretes · 5 Resumo
Novo:  1 Informações Iniciais · 2 Fornecedores · 3 Mão de Obra e Fretes · 4 Resumo Final
```

- A configuração de **Markup e Margens** (categorias + perfis) sai da etapa própria e entra dentro de **Informações Iniciais** como um bloco acordeão abaixo de Cliente/Prazo. Mesmos componentes, só muda o lugar de render.
- Renumerar `etapaAtual`, navegação, breadcrumbs e validações.

### 2. Card do item (TabelaItensProjeto)

Hoje o card só ganha uma barrinha lateral marinho. Vai ficar:

- **Resolvido (tem fornecedor principal)**: fundo `bg-marinho/5`, borda `border-marinho/40`, barra lateral marinho de 4px. Quando há reservas, mostra um pequeno "+2 reservas".
- **Pendente**: mantém o visual atual (terracota).
- **Linha de totais** dentro do card quando resolvido:
  `Qtd × Custo unit. = Total compra · Markup X% → Total venda`
  Puxa o markup da categoria do item (mesma lógica que já alimenta Etapa Resumo).

### 3. Múltipla seleção de fornecedores por item

- Novo conceito de **rank**: 1 = principal, 2,3,4… = reservas.
- Cada linha de fornecedor expandida ganha:
  - Botão **"Definir como principal"** (se não for) → vira rank 1, o antigo principal cai pra reserva.
  - Botão **"Adicionar como reserva"** (se não estiver na lista).
  - Botão **"Remover"** (se já estiver na lista).
- Selecionados aparecem no topo da lista com badge **Principal / Reserva 2 / Reserva 3…**.
- O preço/total do card sempre usa o **principal**. Reservas ficam visíveis para fallback rápido durante compras.

### 4. Informações novas dentro do card expandido

Para cada linha de fornecedor:

- **Miniatura de foto** do item-naquele-fornecedor (40×40) à esquerda. Clique abre lightbox. Quando não há foto, mostra placeholder discreto.
- **Observação do arquiteto** (vinda do memorial, `item.observacao`) aparece **uma vez no topo do card expandido**, num bloco terracota claro com ícone de balão (só se houver).
- **Observação do fornecedor** (texto livre por cotação) aparece como linha auxiliar abaixo do nome do fornecedor, em cinza pequeno.
- **Nota do item nesse fornecedor** (estrelas 0–5, já existe `estrelas` na alternativa) renderiza como ⭐ no lugar de só número.
- **Selos** ao lado do nome:
  - 🏷️ **Melhor preço** (já existe, mantém)
  - ⭐ **Melhor nota** (novo) — fornecedor com `estrelas` máxima entre os com cotação válida.
  - Quando o mesmo é melhor preço e melhor nota, mostra os dois selos.

### 5. Dados que precisam existir (backend)

Tabela nova `orcamento_item_fornecedores` para guardar a lista de selecionados com rank:

```text
orcamento_item_fornecedores
  id uuid pk
  orcamento_item_id uuid fk -> orcamento_itens
  fornecedor_id uuid fk -> fornecedores
  rank smallint        -- 1 principal, 2+ reservas
  preco_unitario numeric
  unidade text
  observacao text       -- obs do fornecedor sobre o item
  foto_url text         -- preenchido depois quando houver upload
  created_at, updated_at
  unique (orcamento_item_id, fornecedor_id)
  unique (orcamento_item_id, rank) deferrable
```

RLS por orçamento + GRANTs padrão. Mantém `orcamento_itens.fornecedor_id` como espelho do rank 1 (compatibilidade com o resto do código).

A coluna `foto_url` fica preparada mas o **upload de foto não entra agora** — só o slot de exibição + placeholder. O upload vem num passo seguinte com o bucket.

### 6. O que NÃO entra agora (fica para próximo passo)

- Upload real de foto do item-no-fornecedor (precisa decidir bucket + UI de upload). Hoje só o placeholder e a abertura do lightbox quando já existir URL.
- Migrar dados antigos: orçamentos existentes continuam com 1 fornecedor; a tabela nova só passa a popular daqui pra frente.

## Detalhes técnicos

- `src/pages/NovoOrcamento.tsx`: reduzir steps, mover bloco de Markup pra dentro da etapa 1, ajustar todos os `etapaAtual === N`, navegação e progresso.
- `src/components/orcamento/TabelaItensProjeto.tsx`:
  - novo visual resolvido (azul cheio)
  - bloco de totais (compra/venda) dentro do card
  - selos de melhor nota
  - render de observação do arquiteto no topo do expandido
  - render de foto miniatura + obs do fornecedor + estrelas em cada linha
  - botões Principal / Reserva / Remover por fornecedor
- Novo hook `useOrcamentoItemFornecedores(orcamento_item_id)` para CRUD da tabela nova + retorno consolidado para o card.
- Migration cria a tabela + índices + RLS + GRANTs.
- Função utilitária para calcular preço de venda: `custo × (1 + markup_categoria)` reaproveitando a lógica de Etapa Resumo já existente.

## Aceite

- Selecionar fornecedor pinta o card de azul e mostra Total compra/Total venda.
- Dá pra marcar 1 principal e várias reservas; reservas ficam visíveis com rank.
- Trocar o principal rebaixa o anterior para reserva sem perder.
- Observação do arquiteto aparece em destaque dentro do card expandido.
- Selo de melhor nota aparece junto do de melhor preço.
- Slot de foto aparece (placeholder por enquanto), pronto para o upload do próximo passo.
- Tabs ficam: Informações Iniciais (com Markup) · Fornecedores · MO/Fretes · Resumo Final.