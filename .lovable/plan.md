Refatoração estrutural do módulo de Orçamentos. Sete itens distintos, alguns com mudanças de banco. Vou organizar por dependência (banco primeiro, UI depois) e separar em PRs lógicos para evitar quebrar o fluxo existente.

## 1. Renomear "Cabeçalho" → "Informações Iniciais"

Em `src/pages/NovoOrcamento.tsx`:
- Array `ETAPAS[0]`: `"Cabeçalho"` → `"Informações Iniciais"`
- Título da seção da etapa 1 (`<h2>Cabeçalho</h2>`) → `"Informações Iniciais"`
- Comentários `// Etapa 1 - Cabeçalho` atualizados
- Buscar qualquer outra ocorrência do termo no fluxo (mensagens de validação, toasts)

## 2. Reestruturar 7 → 6 etapas

Nova ordem do array `ETAPAS`:
```
1. Informações Iniciais
2. Memorial Descritivo
3. Fornecedores       (agora cobre plantas E insumos)
4. Markup e Margens   (placeholder)
5. Mão de Obra, Fretes e Transporte
6. Resumo Final
```

Mudanças concretas:
- A antiga etapa 5 ("Insumos") **desaparece como etapa**. Toda a UI/lógica de seleção de fornecedores para insumos passa para a etapa 3 (Fornecedores), reaproveitando o mesmo padrão visual usado para plantas. Os cálculos automáticos de insumos (`insumosCalc`) e insumos adicionais (`insumosAdicionais`) continuam existindo internamente — apenas a aba dedicada some; eles aparecem dentro da etapa Fornecedores numa seção "Insumos" abaixo de "Plantas", com a mesma UI de cotação.
- A antiga etapa 4 ("Cotação") vira "Markup e Margens" e por enquanto renderiza apenas:
  ```
  <div className="text-center py-16 text-muted-foreground">
    Etapa em construção — será implementada em breve.
  </div>
  ```
  A lógica antiga de cotação (`cotacoes`, `markupsCategoria`, etc.) é preservada no estado para não quebrar o resumo, mas a UI da etapa fica oculta. A seleção de fornecedor por item migra para a etapa 3.
- Ajustar todos os checks `etapaAtual === N`: 5→3 (insumos), 7→6 (resumo), 6→5 (MO/Fretes), e os efeitos `useEffect` que dependem disso.
- `podeAvancar = etapaAtual < ETAPAS.length` continua válido.
- Orçamentos antigos: o estado é tudo em memória + tabela `orcamentos`/`orcamento_itens`; nenhum campo `etapa_atual` é persistido com semântica posicional crítica. Confirmar isso lendo os hooks de salvamento; se houver, fazer mapeamento defensivo.

## 3. Categoria "Condicionadores de Solo"

**Decisão de modelagem**: criar uma terceira tabela `condicionadores_solo` espelhando `insumos` seria mais limpo, mas multiplica trabalho em todo o app (hooks, RLS, históricos, estoque, fornecedor links, fusão). 

**Alternativa mais econômica e que atende o requisito**: tratar como uma **categoria especial dentro de `insumos`**, com flag `tipo_produto` (`'insumo' | 'condicionador_solo'`). Toda UI que filtra/lista insumos passa a separar em duas seções; o memorial ganha uma terceira seção; cadastro tem um seletor.

Vou propor a opção com flag por padrão (mais simples, menos migração de dados). Se preferir tabela separada, ajusto o plano.

Migração:
- `ALTER TABLE insumos ADD COLUMN tipo_produto text NOT NULL DEFAULT 'insumo' CHECK (tipo_produto IN ('insumo','condicionador_solo'))`
- Índice em `tipo_produto`

UI:
- `src/pages/Insumos.tsx`: filtro de aba/segmented control (Insumos | Condicionadores de Solo), seletor no cadastro
- `src/components/projeto/MemorialDescritivo.tsx`: terceira seção
- Orçamento (etapa Fornecedores): terceira sub-seção

## 4. Múltiplos atendentes por fornecedor + atendente padrão por operador

Migração:
```sql
CREATE TABLE fornecedor_atendentes (
  id uuid PK default gen_random_uuid(),
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  funcao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE operador_atendente_padrao (
  id uuid PK default gen_random_uuid(),
  operador_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES fornecedores(id) ON DELETE CASCADE,
  atendente_id uuid REFERENCES fornecedor_atendentes(id) ON DELETE CASCADE,
  UNIQUE (operador_id, fornecedor_id)
);
```
Com RLS: leitura para autenticados; escrita conforme regras existentes (admin/administrativo no fornecedor; cada operador na sua própria preferência).

UI em `src/pages/Fornecedores.tsx` (modal de edição):
- Nova seção "Atendentes" abaixo dos contatos: lista editável (adicionar/remover/editar/ativar)
- Para cada atendente, botão "Definir como meu padrão" (estrela)
- Os campos `telefone`/`whatsapp` legados continuam existindo; novos atendentes os substituem na prática

Onde gerar mensagem para fornecedor (provavelmente `ResumoFornecedoresDialog`): pré-selecionar o atendente padrão do operador atual.

## 5. Fusão de duplicatas — Fornecedores

Já existe `merge_fornecedores` RPC e UI `MesclagemFornecedoresDialog` / `MesclarManualDialog`. Preciso:
- Adicionar status `'fundido'` ao filtro padrão de listagem (esconder)
- Atualizar `merge_fornecedores`: em vez de DELETE, marcar `status='fundido'`; concatenar nome no `nome_alternativo` com `;`; migrar atendentes com dedup por `(nome,telefone)`
- Garantir botão "Fundir fornecedores" visível na tela de listagem (já existe via `MesclarManualDialog`?). Confirmar e expor explicitamente no header.

## 6. Fusão de duplicatas — Plantas/Insumos/Condicionadores

RPCs novas: `merge_plantas(p_canonico uuid, p_duplicados uuid[])` e `merge_insumos(...)` (que cobre condicionadores via mesma tabela).

Comportamento:
- Migrar `historico_precos` dos duplicados para o canônico
- O preço mais recente (entre canônico e duplicados) vira `preco_unitario` do canônico
- Migrar referências em `orcamento_itens`, `estoque_movimentacoes`, `diario_insumos_area`, `orcamento_insumos`
- Marcar duplicados com `ativo=false` e adicionar coluna `fundido_em uuid REFERENCES ...` para auditoria
- Modal de validação visual antes de confirmar (checa nome popular/científico + porte + fornecedor)

UI: botões "Fundir" nas listagens `Plantas.tsx` e `Insumos.tsx`, modal comparativo similar ao de fornecedores.

## 7. Padronização de porte em metros

Definir helper utilitário `parsePorteMetros(input: string): number | null` e `formatPorteMetros(m: number): string`:
- Aceita apenas dígitos e vírgula/ponto, máximo 2 decimais
- Converte ponto para vírgula na exibição
- Rejeita "P14", "DAP", "Pt" etc. com mensagem clara
- 0 exibido como "—"

Aplicar em:
- `src/pages/NovaPlanta.tsx` e qualquer formulário de planta
- Importações (planilhas): rotina de normalização — se valor for `< 5` assumir já em metros, se for `> 5` e não tiver vírgula, alertar; se vier com "cm", dividir por 100
- Tabela de plantas: exibição usa `formatPorteMetros`
- Memorial e orçamento: idem

Schema: campos `altura_m`, `altura_min_m`, `altura_max_m`, `dap_cm` já existem. Manter `dap_cm` (DAP é diâmetro do tronco em cm, padrão da silvicultura — não converter para metros). Forçar `altura_m` como fonte única para porte de exibição.

## Plano de execução por mensagens

Esta refatoração é grande demais para uma única resposta sem virar um monstro instável. Proposta de fatiamento (vou executar tudo se você aprovar, mas em ordem):

**PR 1 (esta resposta)** — Itens 1, 2 e 3:
- Renomear etapas
- Reestruturar para 6 etapas (mover insumos para dentro de Fornecedores; placeholder Markup)
- Migration: adicionar `tipo_produto` em insumos + UI básica de filtro

**PR 2** — Itens 4 e 5:
- Migrations de `fornecedor_atendentes` e `operador_atendente_padrao`
- UI no cadastro de fornecedor
- Atualizar `merge_fornecedores` (status fundido + atendentes)

**PR 3** — Item 6:
- RPCs `merge_plantas` e `merge_insumos`
- Modais de fusão em Plantas e Insumos

**PR 4** — Item 7:
- Helpers de porte
- Validação em formulários e importações
- Migração de dados existentes (script de normalização opcional)

## Detalhes técnicos

- Banco: Supabase via `supabase--migration` para schemas; `supabase--insert` para dados.
- RLS: todas as novas tabelas com policies espelhando as de `fornecedores` (admin/administrativo escrevem; autenticados leem).
- Tipos: após cada migration, `src/integrations/supabase/types.ts` regenera automaticamente.
- Identidade visual: zero alterações em paleta/tipografia/componentes — só renomear e reorganizar.

## Risco principal

Mover insumos da etapa 5 para dentro da etapa 3 toca em muitos `useEffect` e estado em `NovoOrcamento.tsx` (4000+ linhas). Vou fazer com cuidado, preservando o estado (`insumosCalc`, `insumosAdicionais`) e movendo apenas o JSX/handlers de UI. Os cálculos automáticos disparados por `etapaAtual === 5` viram `etapaAtual === 3` (ou removo a guarda e disparo quando os pré-requisitos estiverem prontos).

Confirmação que preciso de você antes de começar:

1. **Item 3 — modelagem de Condicionadores de Solo**: posso usar a flag `tipo_produto` na tabela `insumos` (mais simples) ou prefere tabela separada `condicionadores_solo`?
2. **Ordem de execução**: posso seguir os 4 PRs em sequência nesta mesma conversa, ou prefere que eu pause após cada PR para você validar?
