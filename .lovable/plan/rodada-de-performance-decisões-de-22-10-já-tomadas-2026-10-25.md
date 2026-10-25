# Rodada de performance (decisões de 22/10 já tomadas)

Ordem pensada para poder parar no fim de qualquer etapa sem deixar nada quebrado. Cada etapa termina com build OK e a tela afetada aberta logado como admin.

## Etapa 0. Guardar a linha de base
- Copiar a tabela de 22/10 (tempo, buscas, volume por tela) para `docs/perf/2026-10-22-baseline.md`.
- Guardar o script de medição usado em 22/10 em `docs/perf/medir-telas.py`, para repetir exatamente igual no fim (mesmas 6 telas, mesmo projeto e mesmo orçamento, cache frio e quente).

## Etapa 1. Índices (item 5) e erro 400 do funil (item 7)
- Banco: 6 índices, com `IF NOT EXISTS`: `locais_cliente(cliente_id)`, `projetos(local_id)`, `registros(local_id)`, `historico_precos(fornecedor_id)`, `orcamento_itens(fornecedor_escolhido_id)`, `demandas(orcamento_id)`.
- Funil: reproduzir o 400 em `useProjetosPipeline` (busca de `locais_cliente` com `.in("id", ...)`), ler o erro devolvido e corrigir a causa confirmada (coluna pedida ou lista de ids). Não chuto a causa antes de ver a resposta.

## Etapa 2. Colunas explícitas (item 2) e Equipe sem insumos (item 8)
- Trocar `select('*')` por lista de colunas em projetos, clientes, cliente_feed_eventos, fornecedores, insumos e orcamento_* nas telas medidas. A lista sai do que cada tela realmente lê; tipos ajustados sem `any`.
- Equipe: remover a busca de insumos que a tela não usa.

## Etapa 3. Acesso uma vez por sessão (item 4)
- Uma única consulta de perfil, papel e troca obrigatória, guardada no React Query com chave por usuário.
- `useAuth`, `ProtectedRoute` e assistente leem desse cache; perfil deixa de ser buscado 2 vezes por tela.
- Invalidação no logout, na troca de senha (primeiro acesso) e na troca de usuário da sessão.
- As regras de acesso continuam as mesmas (`access-policy.ts` intocado); o conector continua conferindo no servidor a cada chamada.

## Etapa 4. Orçamento com busca única (item 3)
- Um hook por orçamento que busca as 9 tabelas uma vez e é compartilhado pelas 6 etapas e pelo Resumo final.
- As mutações atualizam esse cache (optimistic) em vez de rebuscar tudo.
- Markup das etapas 4 e 6 não muda.

## Etapa 5. Busca de plantas, fornecedores e insumos no servidor (item 1)
- Banco: função `buscar_plantas(p_query, p_limit default 30)` com pg_trgm em nome popular e científico, só ativas, devolvendo só as colunas do seletor; índices GIN trigram nas colunas de busca. Mesma ideia para fornecedores e insumos (`buscar_fornecedores`, `buscar_insumos`), respeitando as políticas atuais (função SECURITY INVOKER, então a RLS vale igual; nenhum valor novo exposto ao campo).
- Front: um seletor único (Command do shadcn) com digitar para buscar, espera curta entre teclas, skeleton, vazio que orienta e erro com tentar de novo. Usado em orçamento (NovoOrcamento), memorial (MemorialDescritivo), projeto (ProjetoDetalhe) e onde fornecedor/insumo é lista de escolha.
- Item já escolhido é mostrado buscando só aquele id.
- Nenhuma tela carrega o catálogo ao abrir. Fora do escopo: a página de catálogo Plantas, importação e cadastro (são o catálogo em si, não lista de escolha); Recebimento e Estoque eu listo e só troco se forem seletores.

## Etapa 6. RLS avaliada uma vez por consulta (item 6)
- Nas 9 tabelas grandes do diagnóstico, reescrever cada política trocando `has_role(auth.uid(), x)` por `(select public.has_role(auth.uid(), x))`, idem `has_any_role` e `can_*` que só dependem do usuário.
- `can_*` que recebem coluna da linha (ex.: `can_access_diario_project(auth.uid(), projeto_id)`) ficam como estão, porque não podem ser avaliadas uma vez; listo quais ficaram e por quê.
- Antes de aplicar: salvar o texto de cada política. Depois: comparar contagem de linhas visíveis por papel (admin, administrativo, gestor, operador_campo simulados com `set local role` e `request.jwt.claims`) antes e depois; tem que bater exatamente.
- Entrego a lista de cada política, antes e depois.

## Etapa 7. Dias desde a última visita (item 9)
- Banco: view `projetos_ultima_visita` (security_invoker) com, para cada projeto tipo manutenção, a data da última diária registrada e os dias desde ela.
- `painel_projetos` no conector: para manutenção devolve `dias_desde_ultima_visita` no lugar de `dias_no_status`; demais tipos inalterados. Ordenação aceita o novo campo. Regenerar o manifesto.
- Teste unitário: manutenção com visita há N dias devolve N; manutenção sem visita devolve vazio; obra continua com `dias_no_status`.

## Etapa 8. Medir de novo e publicar
- Repetir a medição da etapa 0, exatamente igual, e montar a tabela antes/depois.
- Se qualquer tela piorar, não publico e aviso.
- Se tudo melhorar ou empatar: publicar e confirmar a publicação.

## Não toco
Realtime, separação de valores do estoque, markup das etapas 4 e 6, escrita anon nas 110 tabelas, `get_user_id_by_username`, `can_manage_users`, entrada de estoque.

## Riscos que vou vigiar
- Etapa 3: alguém com papel trocado só vê a mudança no próximo login ou recarregar; o servidor continua barrando.
- Etapa 5: a lista pronta some; quem rolava a lista passa a digitar (decisão já tomada).
- Etapa 6: qualquer diferença de contagem por papel faz a política voltar ao texto anterior antes de seguir.
