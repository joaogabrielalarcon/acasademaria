# Melhorias no Orçamento e Cotações

Vou implementar um conjunto de melhorias no fluxo de orçamento (`/orcamentos/:id` e Memorial Descritivo) organizadas em 6 frentes. Caso queira priorizar / remover algo, me diga antes de aprovar.

---

## 1. Memorial Descritivo — edição completa

- **Editar porte** (altura/DAP) já é possível na seção "Plantas", mas vou garantir que essas alterações sejam respeitadas pelo orçamento.
- **Excluir itens**: já existe botão de lixeira no modo edição — vou tornar a edição mais acessível (botão "Editar" mais visível) e permitir excluir item a item também na visualização do orçamento.

---

## 2. Cotações com tolerância de porte

Hoje o orçamento busca preços do **histórico** apenas pelo nome (popular). Vou adicionar:

- **Filtro por porte** com tolerância configurável (ex.: ±20% na altura, ±2cm DAP).
- Toggle por item: "Apenas porte exato" / "Aceitar portes próximos" / "Qualquer porte".
- Quando o porte cotado for diferente do solicitado, mostrar badge "Porte ~2,5m (solicitado 3m)" ao lado do preço.  

- exibir todas as opçoes de porte que temos para cada planta, assim o orçamento fica personalizavel na hora da seleção. o usuario pode qual padrao de porte ele quer visualizar para aquele item em especifico, caso contrario todos as opçoes daquele item cadastrados serao exibidas.  

- exibir todos os dados relevantes para a escolha do fornecedor - porte; valor; data de ultima cotação e nota de avaliaçao daquele item.
- ser possivel filtrar os itens que vao aparecer tambem pela localizaçao do fornecedor (ceagesp, ceaflor, e caso nao tenha essa informação cadastrada aparece em todas as seleções)   


---

## 3. Atualizar preço diretamente na cotação

- Cada linha de fornecedor terá um campo de preço **editável**.
- Ao salvar, registra automaticamente em `historico_precos` com a data atual e o usuário, mantendo o histórico.
- Botão "Atualizar cotação" registra um novo ponto no histórico mesmo se o valor for igual (revalidação).

---

## 4. Adicionar fornecedor + item na hora

No diálogo de "Adicionar cotação":

- Campo de fornecedor com **autocomplete + opção "Cadastrar novo fornecedor"** (abre mini-form: nome, telefone/WhatsApp, e-mail, cidade, mercado).
- Se o item ainda não existe na base de plantas/insumos, opção **"Cadastrar nova planta"** já preenchida com nome popular/científico do memorial, e o usuário só preenche porte, unidade e preço.
- Tudo num único modal, sem sair do orçamento.

---

## 5. Acesso rápido aos dados do fornecedor

- Na linha de cada cotação, ícone para **abrir um popover** com: nome, telefone, WhatsApp (link `wa.me`), e-mail, cidade, categoria, observações.
- Botão direto "Abrir WhatsApp" e "Copiar telefone".

---

## 6. Filtros e ranking de fornecedores

Para cada item, oferecer ordenação/filtro dos fornecedores listados por:

- Menor preço
- Cotação mais recente
- Porte mais próximo do solicitado
- Melhor avaliação (nota média) — exige adicionar tabela de avaliações de fornecedor (ver técnico)

Filtros aplicados como chips acima da lista de cotações.

---

## 7. Resumo para WhatsApp (mais importante)

Após selecionar fornecedores, novo botão **"Gerar resumo para fornecedores"** que abre um modal com:

- **Agrupamento por fornecedor** dos itens selecionados.
- Para cada fornecedor, uma **tabela** com: Nome popular | Nome científico | Porte | Unidade | Quantidade.
- Botão **"Copiar tabela"** (formato compatível com WhatsApp — texto monoespaçado / markdown simples).
- Botão **"Abrir WhatsApp"** com mensagem-padrão pré-preenchida + tabela.
- Mensagem padrão editável (ex.: "Olá, [nome], poderia atualizar os valores das plantas abaixo? Obrigado, MFM Paisagismo.").

---

## 8. Importar resposta do fornecedor via IA

Quando o fornecedor responder no WhatsApp:

- Botão "Colar resposta do fornecedor" abre textarea + seleção do fornecedor.
- IA (Claude via edge function existente) extrai: item → preço → porte → unidade -> registra a data.
- Mostra preview "atualizar X itens?" com confirmação.
- Ao confirmar, grava em `historico_precos` (mantendo histórico) e atualiza a cotação atual.

---

## Detalhes técnicos

**Migrations:**

- `fornecedor_avaliacoes` (fornecedor_id, item_id, item_tipo, nota 1–5, comentario, criado_por, created_at) — para ranking.
- Garantir que `historico_precos` tem coluna `porte` (altura/dap) — adicionar se faltar.

**Frontend (`src/pages/NovoOrcamento.tsx` + novos componentes):**

- `CotacaoLinhaPreco.tsx` — input editável de preço com auto-save no histórico.
- `FornecedorPopover.tsx` — dados rápidos + WhatsApp.
- `NovoFornecedorInline.tsx` — mini-form em dialog.
- `ResumoFornecedoresDialog.tsx` — agrupamento + tabela copiável.
- `ImportarRespostaFornecedorDialog.tsx` — colar texto + IA.
- Filtros/ordenação com `useMemo` sobre o array de cotações por item.

**Edge function:**

- Reusar `extract-doc-data` ou criar `extract-cotacao-resposta` (Claude) com schema `{itens: [{nome, preco, porte, unidade}]}`.

**Memorial (`src/components/projeto/MemorialDescritivo.tsx`):**

- Já tem add/remove no modo edição — adicionar atalho "Editar" mais visível e tooltip nos botões.

---

## Ordem sugerida de entrega

1. Edição inline de preço + histórico automático (#3)
2. Popover de fornecedor + WhatsApp (#5)
3. Cadastrar fornecedor/item inline (#4)
4. Resumo agrupado para WhatsApp (#7)
5. Filtros/ranking de fornecedores (#6) — sem nota inicialmente
6. Tolerância de porte nas cotações (#2)
7. Importar resposta via IA (#8)
8. Avaliações de fornecedor + ranking por nota (parte do #6)

Posso entregar tudo de uma vez (resposta longa) ou ir por blocos. **Como prefere?**