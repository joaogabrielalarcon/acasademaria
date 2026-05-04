# Mesclagem de Fornecedores Duplicados

## Objetivo
Permitir que Diretoria e Administrativo unifiquem fornecedores duplicados em um único registro, mantendo todas as plantas, insumos, históricos de preços e movimentações vinculados ao fornecedor escolhido como principal.

## Onde fica
Nova aba **"Duplicados"** dentro de `/compras?tab=fornecedores` (ou botão "Mesclar duplicados" no canto superior do tab atual). Mantém o padrão visual existente (cream + terracota, sem novo header).

## Fluxo do usuário

1. **Detecção automática**: ao abrir, o sistema mostra grupos sugeridos de duplicados (ordenados por confiança).
2. **Seleção manual**: caminho alternativo — botão "Mesclar manualmente" abre um buscador para escolher 2+ fornecedores arbitrários.
3. **Tela de comparação** do grupo selecionado:
   - Cards lado a lado de cada fornecedor com: nome, CNPJ, telefone, email, cidade, mercado, e contadores de uso (X plantas, Y insumos, Z movimentações, W cotações).
   - Radio para escolher o **principal** (sugerido: o que tem mais vínculos).
   - Preview do resultado: campos do principal, com vazios preenchidos pelos duplicados (regra "principal + preencher vazios").
4. **Confirmação** ("Mesclar X fornecedores em 1") com resumo dos impactos.
5. Toast de sucesso (3s) e a lista é recarregada.

## Regras de detecção de duplicados
Um grupo é sugerido quando ≥2 fornecedores compartilham qualquer uma destas chaves:
- **CNPJ idêntico** (após limpar pontuação) — confiança alta
- **Nome normalizado idêntico** (lowercase, sem acentos, sem espaços/símbolos extras) — confiança alta
- **Nome normalizado com similaridade ≥ 85%** (trigram) — confiança média
- **Email ou telefone idêntico** — confiança média

Cada grupo mostra um badge: Alta / Média.

## Comportamento da mesclagem
Para cada duplicado D mesclado no principal P:
1. Reaponta `fornecedor_id` em: `plantas`, `insumos`, `historico_precos`, `estoque_movimentacoes`, `financeiro_movimentacoes`, `orcamento_cotacoes`.
2. Atualiza P aplicando regra "principal + preencher vazios" para: `nome`, `cnpj`, `telefone`, `whatsapp`, `email`, `endereco`, `cidade`, `estado`, `categoria_fornecedor`, `mercado`, `nome_alternativo`, `observacoes`.
3. Registra histórico do merge em uma nova tabela `fornecedores_merge_log` (auditoria: quem, quando, qual D virou P, snapshot dos dados de D).
4. Apaga D.

Tudo dentro de uma transação Postgres — se algo falhar, nada é alterado.

## Permissão
- Diretoria: papel `admin`
- Administrativo: papel `administrativo`

Nenhum outro papel vê o botão nem consegue executar.

---

## Detalhes técnicos

### Migration
1. Habilitar extensão `pg_trgm` (para similaridade de nomes).
2. Criar tabela `fornecedores_merge_log` (id, principal_id, duplicado_id, dados_anteriores jsonb, executado_por, executado_em). RLS: leitura para admin/administrativo.
3. Criar função `public.merge_fornecedores(p_principal_id uuid, p_duplicado_ids uuid[])` SECURITY DEFINER:
   - Verifica papel via `has_any_role(auth.uid(), ARRAY['admin','administrativo'])`.
   - Loop em cada duplicado: UPDATE nas 6 tabelas relacionadas, registra log, atualiza principal com COALESCE para preencher vazios, DELETE do duplicado.
   - Tudo em uma única transação.
4. Criar função `public.detectar_fornecedores_duplicados()` retornando `setof jsonb` com grupos sugeridos (chave do grupo, confiança, array de fornecedores com contagens de uso).

### Frontend
- Hook `useFornecedoresDuplicados()` que chama a função de detecção via `supabase.rpc`.
- Componente `MesclagemFornecedoresDialog.tsx` com a tela de comparação.
- Componente `DuplicadosTab.tsx` em `src/pages/Compras.tsx`.
- Mutation `useMergeFornecedores()` chamando `rpc('merge_fornecedores', ...)` e invalidando queries de fornecedores, plantas, insumos.

### Não-objetivos (fora do escopo)
- Mesclagem de plantas duplicadas, insumos duplicados ou clientes duplicados (mesmo padrão pode ser aplicado depois).
- Desfazer mesclagem (o log permite reconstrução manual se necessário, mas sem botão "undo").