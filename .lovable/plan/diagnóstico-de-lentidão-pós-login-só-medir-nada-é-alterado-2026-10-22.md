# Diagnóstico de lentidão pós-login (só medir, nada é alterado)

## Escopo
Medir, logado como admin, 6 telas: Meu Dia, Projetos (funil), página de projeto (Resumo e Diário), Clientes, Orçamento (etapa 1 e Resumo final), Equipe. Nenhuma alteração de código ou banco.

## Como vou medir
1. Abrir o app no navegador automatizado com a sessão do admin (nada é gravado; só leitura).
2. Para cada tela, com cache limpo e depois com cache quente:
   - tempo até utilizável: do clique até o último skeleton sumir e a rede ficar ociosa (ms)
   - todas as requisições ao backend: tabela, colunas pedidas (`select=*` ou lista), quantidade de linhas devolvidas (cabeçalho content-range e tamanho da resposta), se há paginação
   - N+1: mesma tabela chamada várias vezes com filtro por id diferente na mesma abertura
   - realtime: conexões websocket e canais abertos na tela
   - re-render: digitar 10 caracteres na busca e contar renders do componente da lista com o React Profiler
3. Cruzar com o código: `select("*")` em tabelas com mais de 15 colunas (ex.: projetos 33, orcamentos 36, orcamento_itens 32, colaboradores 38), laços com `await` de consulta, `staleTime: 0` / `refetchOnMount: "always"` (já visto em useInsumos), assinaturas de realtime.
4. Banco (só leitura): advisor de performance, consultas mais lentas, FKs sem índice, colunas usadas em filtro/ordenação sem índice, políticas RLS que chamam `has_role`/`has_any_role`/`can_access_*` sem `(select ...)`, com tamanho de cada tabela.

## Entrega
1. Tabela com as 6 telas e as medidas.
2. As 5 causas de maior impacto, cada uma com a evidência medida e a estimativa de ganho.
3. Separação: o que se corrige sem mudar comportamento (índice, paginação, colunas no select, lazy load, cache) e o que exigiria mudar comportamento.

## Observação
O ambiente de medição é o preview, com o mesmo banco do app publicado; os tempos de rede podem diferir um pouco da conexão do João. Vou relatar as duas medidas (cache frio e quente).
