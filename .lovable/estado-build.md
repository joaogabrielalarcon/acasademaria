# Estado do Build — Orçamento / Etapa 3 + Catálogo

**Versão 1.0 · 25/06/2026**

Registro dos prompts (passos) rodados no Lovable e o que cada um entregou. Atualizar a cada passo. Fonte de verdade do "o que já foi construído".

## Visual da etapa 3 (Fornecedores)

- **Passo 1** — tokens marinho/rose no design system (`index.css` + Tailwind). ✅
- **Passo 2 (Fase 1A)** — recolor: terracota no aberto, marinho no fechado, números sóbrios, "Itens em aberto", botão menor. ✅
- **Passo 3 (Fase 1B)** — cotações em tabela comparativa. ✅
- **Passo 4** — filtro no cabeçalho da coluna (estilo Excel, popover sobreposto); "mesclar duplicados" discreto. ✅
- **Passo 5** — lista de itens em cartões (filete terracota/marinho) + resumo do topo unificado. ✅
- **Passo 6** — barra de contexto marinho (cliente · proposta · prazo). ✅

## Dados / catálogo (Fase 2)

- **Passo 7** — item editável e casado com o catálogo (`planta_id`/`insumo_id` já existiam); selo "Catálogo" marinho; trocar/desvincular/cadastrar. ✅
- **Passo 7.1** — cadastro rápido de insumos (estendeu `mafe-cadastro`). ✅
- **Passo 8** — variações por unidade: tabela `insumo_unidades` (+ `fator_para_padrao`, `is_padrao`, backfill sem quebra); `UnidadeCell`. ✅
- **Passo 9** — matching inteligente (funil): `pg_trgm`, `catalogo_apelidos` (aprendizado), `match_catalogo`/`sugerir_duplicados`; sugere + humano confirma + aprende. ✅

## Próximos (catálogo/cotação)

- Aba "Por fornecedor" — visão inversa, ordenada pelo fornecedor com mais itens (alavancagem de negociação); agora sobre dado limpo.
- Fase 2 restante: localização do fornecedor, foto, principal + reservas, link `wa.me`, aba "Pendência de retorno" (regra 15 dias), recebimento com foto → base + diário + portal, filtro por unidade, reconciliação `item.unidade` ↔ `cotação.unidade_ofertada`.
- Degrau semântico do matching (embeddings/pgvector) — só se o fuzzy não bastar.

## Grande frente seguinte

**Espinha (Gestor de Processos)** — o alicerce que destrava o painel pessoal, a secretária e os painéis de área. Plano em `plano-build-espinha.md` (fundação já existe no banco).

## Estado pro time (piloto)

O núcleo do orçamento roda de ponta a ponta (extrair memorial → corrigir/casar item → escolher fornecedor → resultado), com catálogo editável e aprendendo. Pronto pra soltar como piloto (registro de orçamento + base via Mafe), validando no uso real (MFM laboratório). O João decide o momento.

## Histórico

- **v1.0 (25/06/2026):** criação. Registrados os passos 1-9 da etapa 3 + catálogo, com o que cada um entregou, os próximos e o estado pro piloto.
