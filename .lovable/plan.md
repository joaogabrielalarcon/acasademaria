## Etapa 3 — finalização do redesenho

A consolidação pedida toca ~1000 linhas para remover (cards antigos + bloco "Insumos de Plantio" + checkboxes), e adiciona comportamentos novos (ordenação/filtros/período dentro da expansão, selecionar como principal, insumos base/memorial passando pela mesma seleção de fornecedor, "+ Adicionar item" do catálogo) sem mexer no save que alimenta as etapas 4–6. Pra entregar com segurança e sem quebrar cálculo, divido em 3 slices, cada um verificável.

### Slice 1 — Tabela única vira a etapa 3 (sem duplicação) + seleção de planta

Foco: matar a UI duplicada e tornar a `TabelaItensProjeto` a única tela do "Comparativo".

- Remove o bloco "preview 3B" no topo (cabeçalho + chip).
- Remove o `renderCard` antigo e tudo ligado a ele (linhas ~4053–4884): cards por item, filtros por item (`filtrosTab3`), seletor de fornecedor por item, sub-popovers de cotação por linha.
- Remove o bloco "Insumos de Plantio" (linhas ~5404–~5650): tabela de calculados, lista de adicionais e command picker antigo.
- Mantém: barra sticky com contadores (sem fornecedor / risco / OK), `Tabs` (Comparativo / Atualizar), painel `AtualizarCotacoesPanel`, FAB Mafe, diálogos auxiliares (`EditarMercadoDialog`, `IndisponibilidadeDialog`, `NovoFornecedorDialog`, `ResumoFornecedoresDialog`), botão WhatsApp.
- `TabelaItensProjeto` recebe:
  - `onSelecionarFornecedor(item, fid)` para plantas → equivalente a marcar `fornecedoresSelecionados[idx] = [fid]` + `cotacoes[idx][fid].status_selecao = "principal"` (limpa principal dos outros) + colapsa a linha.
  - Dentro da expansão: ordenação (Mais recentes ▾ Menor preço, Melhor nota, Mercado, Porte) e filtros (Mercado multi, Porte, Período: 3m/6m/1a/tudo) — default Mais recentes + 3m.
- Cabeçalho da tabela ganha botão "+ Adicionar item" (placeholder que abre o Command picker — Slice 2 entrega a busca + cadastrar novo).
- Save inalterado: continua usando `fornecedoresSelecionados`/`cotacoes`/`insumosAdicionais` exatamente como hoje.

Verificação: typecheck, fluxo manual no preview — abrir orçamento, ver tabela única, expandir uma linha de planta, ordenar/filtrar, selecionar fornecedor, conferir contadores e avançar pra Etapa 4 sem perder cálculo.

### Slice 2 — "+ Adicionar item" + linhas manuais

- Command picker no header da tabela com aba Plantas / Insumos do catálogo, busca e fallback "Cadastrar novo" via `openQuickAdd` (reaproveita `mafe-cadastro`).
- Linha manual de planta entra em `itensMaterial`; linha manual de insumo entra em `insumosAdicionais` — save já cobre os dois.
- Para insumo escolhido no picker: pré-preenche unidade e valor unitário do catálogo, abre a expansão automaticamente pra escolher fornecedor.

### Slice 3 — Insumos (base + memorial + manuais) com seleção de fornecedor real

- Estende `historicoPorItem` pra incluir insumos (já temos `nomesItens` mas hoje só plantas usam): query por nome de insumo (`is_base` e memorial) → mesma estrutura de alternativas.
- `TabelaItensProjeto.getAlternativas` passa a resolver para linhas de insumo também.
- Selecionar fornecedor em linha de insumo cria/atualiza uma entrada em `insumosAdicionais` (insumo_id, quantidade, valor, fornecedor_id) — assim o save existente persiste sem mudança.
- Quantidade editável para insumos não-calculados; Terra/Munck/Corda permanecem calculadas via coeficientes mas exibidas como editáveis com badge "calculado".
- Mobile: expansão vira card full-width usando o mesmo componente (sem nova lógica).

### Riscos e mitigações

- Save das etapas 4–6 lê de `orcamento_itens`, `orcamento_insumos`, `orcamento_cotacoes`. Como mantemos os mesmos estados de origem (`itensMaterial`, `insumosAdicionais`, `cotacoes`, `fornecedoresSelecionados`), o pipeline atual continua intacto. Slice 3 só amplia `insumosAdicionais`.
- Backups: hoje há "Backup 1/2/3" no card antigo. Slice 1 já reduz pra "Selecionado + alternativas" como combinado.
- `pendenciasEtapa3` (bloqueia avanço se não tem principal) continua válido — passa a refletir as seleções feitas pela nova tabela.

### Pergunta antes de começar

Posso começar pelo Slice 1 já (remoção do antigo + tabela única + seleção de planta com ordenar/filtrar/período), reportar e seguir pro 2 e 3? Ou prefere que eu tente os três numa só leva (risco maior de regressão no cálculo)?
