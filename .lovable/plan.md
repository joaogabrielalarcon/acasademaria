# MCP: registrar o diário de manutenção com segurança

Objetivo: deixar as duas tools de escrita do MCP (`criar_registros` e `atualizar_registro`) capazes de gravar a operação de campo (visita, feed, escala, insumos, máquinas e contratos) com validação, proteção contra gravação repetida, autoria e histórico de status.

Arquivos tocados: apenas `src/lib/mcp/tools/criar-registros.ts`, `src/lib/mcp/tools/atualizar-registro.ts` e um novo `src/lib/mcp/tools/_validacao.ts`. Nenhuma migration, nenhuma RLS, nenhuma tela, nenhuma outra tool.

## 1. Novo módulo compartilhado `_validacao.ts`

Concentra o que as duas tools usam, para não repetir:

- **Campos permitidos por tabela** (criação e atualização), com rejeição de campo fora da lista e mensagem em português dizendo quais valem.
- **Normalização de valor de lista**: minúsculo, sem acento, espaço vira underscore. "Concluído" vira `concluido`, "A Fazer" vira `a_fazer`.
- **Listas válidas**: tipo, status, prioridade, solicitante, area_funcional.
- **Coerência tipo x status** em `registros` (visita, tarefa, acompanhamento têm status próprios; demais tipos aceitam qualquer status da lista).
- **Campos de texto acumuláveis** (observacoes, observacoes_internas, descricao, assessores, funcionarios_casa, comentarios_jardim, ocorrencias) e o concatenador com `" | "`.
- **Gravação em `audit_status_changes`** com metadata de chaves fixas `{ motivo, quem_executou, observacao }`.

## 2. `criar_registros`

- Whitelist ganha: `projetos`, `registros`, `diarias`, `escala_alocacoes`, `registro_insumos`, `registro_maquinas` (as antigas continuam).
- Cada linha é filtrada pelos campos aceitos da tabela; obrigatórios ausentes e campos desconhecidos param só aquela linha, nunca o lote.
- Validação de valores em `registros` antes de gravar.
- Dedup por nome (match_catalogo / fornecedores) **não roda** para as seis novas.
- **Idempotência** (chave natural, consulta antes de inserir):
  - `diarias`: cliente_id + data_visita
  - `registros`: cliente_id + data_servico + tipo + descrição muito parecida (comparação normalizada)
  - `escala_alocacoes`: data + colaborador_id + local_id
  Quando encontra, devolve o id existente com aviso e o que mudaria, sem criar. `forcar: true` cria assim mesmo.
- **Autoria**: `created_by` e `updated_by` carimbados com o usuário do token em toda tabela que tenha essas colunas (`projetos`, `registros`, `diarias` têm; `escala_alocacoes`, `registro_insumos` e `registro_maquinas` não têm coluna de autoria, então ficam sem — está registrado abaixo em "pendências").

## 3. `atualizar_registro`

- Whitelist ganha as mesmas seis, com campos restritos por tabela conforme o pedido; em `registros`, `cliente_id`, `local_id` e `projeto_id` ficam bloqueados com mensagem explicando o motivo.
- `projetos` ganha os oito campos novos.
- Novo parâmetro `modo`: `"substituir"` (padrão) ou `"acrescentar"`, que concatena nos campos de texto listados.
- Novos parâmetros opcionais `motivo`, `quem_executou`, `observacao`.
- `updated_by` carimbado com o usuário do token.
- Quando o campo `status` muda, grava linha em `audit_status_changes` (entity_table, entity_id, status_anterior, status_novo, changed_by, changed_by_nome vindo do colaborador/perfil do usuário, metadata padronizado). Sem motivo, grava com motivo vazio.
- Retorna antes → depois como já faz hoje.

## 4. Por que `created_by` está vindo null

`criar_registros` só carimba `created_by` numa lista fixa de tabelas de cadastro; `diarias` nunca esteve nela, e as gravações vieram por outro caminho sem carimbo. A correção é carimbar por presença de coluna, e não por lista manual.

## Decisões respeitadas

- `diarias` é a visita canônica; `manutencao_visitas` fica de fora da whitelist e não é apagada.
- `escala_alocacoes` é a verdade sobre quem esteve na visita; `diarias.equipe_presente_ids` continua só atalho de leitura.
- Validação toda na edge function. Nenhum enum, nenhum CHECK.
- Escrita sempre com o token do usuário, RLS ativa.
- Mensagens de erro em português dizendo o que fazer.

## Pendências para você decidir (não vou fazer sem sua palavra)

1. `escala_alocacoes`, `registro_insumos` e `registro_maquinas` **não têm** colunas `created_by` / `updated_by`. Para carimbar autoria nelas seria preciso migration de schema, que está fora do escopo. Sigo sem autoria nessas três.
2. `audit_status_changes` precisa aceitar insert do usuário autenticado. Se a RLS de lá não permitir, o histórico falha em silêncio; nesse caso eu aviso no retorno da tool em vez de mexer em política.
