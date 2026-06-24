## Fase 3 — Tabela unificada da Etapa 3 (em 3 sub-entregas)

A Etapa 3 atual ocupa ~1.500 linhas em `NovoOrcamento.tsx` (fornecedores das plantas + bloco de Insumos de Plantio + checkboxes de adicionais). Refatorar tudo de uma vez é arriscado. Proponho 3 sub-entregas com revisão entre elas.

### Sub-fase 3A — Modelo unificado e carga dos insumos base
- Criar tipo `ItemProjeto = { tipo: "planta" | "insumo", id, nome, categoria, quantidade, unidade, fornecedorSelecionadoId, valorUnit, badges }`.
- Hook/derivado `itensProjeto` que une:
  - plantas vindas do memorial (`itensMaterial`)
  - insumos extraordinários do memorial (novo `insumos[]` da Fase 2)
  - insumos `is_base = true` (pré-carregados com quantidade calculada via coeficientes existentes — terra, corda, bidim etc.)
- Persistência: nenhuma mudança em `orcamento_itens`/`orcamento_insumos`/`orcamento_cotacoes`. Adapter de leitura/escrita mantém o formato atual.
- UI: ainda não troca a tela. Sub-fase 3A só prepara os dados. Resultado verificado por console/log para a sub-fase seguinte ter base sólida.

### Sub-fase 3B — Nova tabela única (substitui as 3 seções atuais)
- Componente `TabelaItensProjeto` com:
  - filtros (tipo, categoria, status de fornecedor, busca)
  - colunas: Item, Categoria, Qtd, Un, Fornecedor (selecionado), Valor unit, badges
  - linha clicável → expansão inline (colSpan) com todas as cotações do item: porte, preço, data, ★, mercado, botão "Selecionar".
  - botão "+ Adicionar item" → Command picker do catálogo (plantas + insumos), com "Cadastrar novo" caindo no mesmo motor do Mafe de cadastro.
- Backups: só "Selecionado" + alternativas listadas no expansor (sem Backup 1/Backup 2 separados). Histórico continua salvo.
- Mobile: expansão vira card full-width.
- Tokens de cor exclusivamente via variáveis CSS (terracota, nude, creme).
- Cálculo de custo preserva os mesmos somatórios que alimentam o mini-DRE da Etapa 6.

### Sub-fase 3C — Remoção das seções antigas e limpeza
- Apagar: bloco "Insumos de Plantio (calculados)", lista de checkboxes "Insumos Adicionais", cards de fornecedores por item antigo.
- Manter intactas: sub-aba "Atualizar Cotações", FAB Mafe, validação de saída da etapa, persistência.
- Conferir build e fluxo end-to-end (memorial → tabela → salvar → Etapa 6).

### Detalhes técnicos
- Arquivo principal: `src/pages/NovoOrcamento.tsx`
- Novo componente: `src/components/orcamento/TabelaItensProjeto.tsx`
- Coeficientes já existem em `coeficientes_insumos` (consumidos hoje na seção de Insumos de Plantio).
- Nada de hex hardcoded; usar `--terracota`, `--nude`, `--creme`, `--primary` etc.
- Sem mudanças em RLS ou migrations nesta fase.

### Critério de aceite por sub-fase
- 3A: `itensProjeto` derivado bate com o que aparece hoje (plantas + insumos base + extras do memorial), sem mudança visual.
- 3B: tela nova funciona em paralelo (feature visível); usuário aprova UX antes de remover a antiga.
- 3C: somatórios na Etapa 6 idênticos aos atuais para um orçamento de teste; nenhuma seção duplicada.

Começo pela **Sub-fase 3A** assim que aprovado.
