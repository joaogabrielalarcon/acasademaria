# Uma camada de ferramentas para Mafe e conector

## Conferência inicial

O site publicado está respondendo e serve os arquivos da rodada de desempenho: busca de plantas, fornecedores e insumos no servidor com limite de 30, correção de `locais_cliente.nome` no funil e Equipe sem a antiga importação do catálogo de insumos. Não é necessário publicar novamente essa rodada antes de começar. Essa conferência verifica a versão servida pelo site, não uma conexão autenticada pelo Claude.

Nesta preparação, nenhum código de aplicação ou banco foi alterado. Foram registrados apenas o plano, a lista de tarefas e as regras permanentes do pedido.

## Lacunas que precisam de decisão

O banco atual não contém vários campos solicitados. Não criar campos nem traduzir nomes silenciosamente.

| Tabela | Campos ausentes | Campos existentes relacionados |
|---|---|---|
| `calendario_eventos` | `colaborador_id`, `cliente_id`, `projeto_id`, `responsavel_id`, `concluido`, `observacoes` | `titulo`, `descricao`, `data`, `tipo`, `recorrente` |
| `entregas_colaborador` | `item`, `tamanho`, `data`, `observacoes` | `insumo_id` obrigatório, `data_entrega`, `observacao`, `quantidade`, `colaborador_id` |
| `condominios` | `regras` | `regras_internas`, `contatos`, `responsaveis_areas`, horários de entrada/saída, `observacoes`, `ativo`, `nome` |
| `financeiro_parcelas` | `data_pagamento`, `valor_recebido`, `numero_nf`, `data_nf`, `forma_pagamento` | `status`, `observacoes`, `valor`, `data_vencimento`, projeto/cliente, número e tipo da parcela |
| `colaboradores` | `tamanho_bota`, `tamanho_camisa`, `cnh`, `categoria_cnh`, `meio_locomocao` | `tamanho_calcado`, `tamanho_camiseta`, `possui_cnh`, `tipo_cnh`, `possui_conducao`, `tipo_conducao` |

`tamanho_calca`, `data_admissao` e `data_nascimento` já existem e serão aceitos com esses nomes.

**Proposta para aprovação:** adicionar somente os seis campos pedidos do calendário e os cinco campos pedidos das parcelas, necessários para vínculos, conclusão, pagamento e NF. Usar os nomes reais já existentes para EPI, condomínio e admissão, informando-os no catálogo de ferramentas. Não criar nenhuma coluna de colaborador. O tamanho individual do EPI permanece pendente, pois não há coluna própria na entrega; não escondê-lo dentro de observação.

As novas referências devem apontar para os cadastros corretos após verificar as chaves existentes. Responsável será colaborador, se essa for a referência usada pelas telas atuais. Documentar isso antes da migração.

## Ordem de execução

### 1. Extrair sem mudar as regras existentes

- Tornar `supabase/functions/_shared/operations/` a implementação única dos oito handlers pedidos, mais `painel_vencimentos`.
- Compartilhar contratos de entrada, validação, whitelists, deduplicação, autoria, corte por papel, auditoria e modo acrescentar.
- Manter os arquivos em `src/lib/mcp/tools` como adaptadores finos. Os handlers não dependem de MCP, Gemini, HTTP ou interface.
- Preservar OAuth e a exigência de `client_id` no conector. A Mafe valida o token da sessão separadamente e usa o mesmo controle de conta ativa e troca obrigatória.
- Testes de caracterização antes de substituir os adaptadores. Não prometer idempotência concorrente que o código atual não oferece.

### 2. Preparar as tabelas administrativas

- Aplicar apenas a migração aprovada acima, com índices nas novas referências e permissões que preservem os papéis existentes.
- Ampliar criação nas sete tabelas solicitadas; ampliar atualização apenas nas cinco solicitadas. Entregas e movimentações permanecem criação somente.
- Aceitar os campos existentes da ficha de admissão e listar expressamente os nomes ausentes.
- Impedir leitura e escrita de `financeiro_*` para qualquer papel fora de `admin`, `administrativo`, `gestor`, `diretor`.
- Evento duplicado: tipo + data + vínculo da pessoa/cliente; definir explicitamente a regra para evento sem vínculo. Não permitir `forcar` contornar validação ou permissão.
- Auditar mudança de status financeiro com motivo obrigatório. Verificar também os efeitos dos triggers existentes antes de testar uma parcela paga.

### 3. Implementar painel de vencimentos

- Eventos não concluídos entre hoje e N dias, padrão 30, filtros por tipo e responsável, ordenados por data.
- Retornar tipo, data, dias para vencer e nomes vinculados, respeitando as permissões de leitura existentes.
- Para os quatro papéis autorizados, acrescentar parcelas não pagas dentro da janela e todas as vencidas não pagas, com marca de atraso.
- Para operador de campo, não consultar parcelas nem retornar chaves financeiras. O calendário atual não libera leitura ao operador de campo; não ampliar essa permissão sem pedido. Eventos podem ficar vazios por RLS, sem tratar isso como leitura financeira autorizada.
- Usar a data de São Paulo e limitar/paginar o trabalho sem omitir silenciosamente resultados.

### 4. Migrar a Mafe

- Substituir as operações diretas da assistente principal pelos handlers compartilhados, usando exclusivamente o token da pessoa logada para dados.
- O código principal encontrado hoje usa Anthropic, não Gemini. Ajustar a assistente principal ao Gemini pelo gateway, conforme o pedido, preservando a conversa e sua resposta na tela.
- Compartilhar as regras de conversa: relato livre, classificação pela assistente, prévia e confirmação antes de gravar, no máximo duas perguntas, sem pedir campo/status, sem valores para quem não pode vê-los.
- Garantir confirmação humana explícita antes de dinheiro e NF; não aceitar uma decisão do modelo como confirmação humana.
- Migrar também os caminhos de cadastro e diário que gravam pela tela, para não deixar uma segunda implementação escondida.

**Operações ainda não cobertas pelos handlers pedidos:** desligamento com histórico, gravação de preços de fornecedor, histórico/retornos/tarefas do antigo fluxo comercial, aprendizado de correções e diário agregado `diario_visitas` com áreas/equipe/insumos/máquinas. Essas operações não serão mantidas como acesso direto da Mafe. Onde possível, consultar via `read_table`; gravações não cobertas serão listadas e ficarão indisponíveis para a assistente, sem apagar dados nem retirar os fluxos manuais das telas. Não trocar o diário agregado por `diarias`, pois são estruturas diferentes.

### 5. Testar com pessoas e dados descartáveis

- Criar `teste.adm` pela tela administrativa, completar primeiro acesso e testar evento de aniversário, entrega de EPI, parcela paga e painel. Nunca divulgar ou registrar credenciais.
- Testar operador de campo com conta descartável identificada, verificando recusa de leitura/criação/atualização financeira e painel sem finanças.
- Comparar a frase da Marina nos dois caminhos com os mesmos vínculos resolvidos e data. Mostrar propostas e campos lado a lado, confirmar e verificar o resultado gravado; não duplicar registros reais nem inventar quem é Zinho.
- Testar listas fechadas, campos desconhecidos, datas, duplicidade, anexação de texto, auditoria com motivo, corte de valores e confirmação financeira.
- Listar dependências dos dados descartáveis antes da remoção e usar a autorização deste pedido apenas para esses dados e contas. Logs de auditoria permanecem imutáveis.

### 6. Publicar e verificar

- Executar testes relevantes e lint dos arquivos alterados, verificar erros da aplicação e gerar o manifesto após a última mudança MCP.
- Conferir a varredura de segurança sem alterar os alertas antigos fora do escopo. Se a publicação bloquear, informar o impedimento, sem ignorar alertas automaticamente.
- Solicitar publicação e verificar a revisão servida. Uma solicitação agendada não será apresentada como publicação concluída.
- Entregar checklist preenchido, CHECKs encontrados, campos ausentes, acessos não cobertos e comparação Mafe/conector.

## CHECKs encontrados no banco

- `colaborador_liberacoes.status`: `ativa | vencida | em_renovacao | cancelada`.
- `colaboradores.tipo_cnh`: `A | B | AB | C | D | E`.
- `colaboradores.tipo_conducao`: `Carro | Moto | Ambos`.
- `colaboradores.tipo_vinculo`: `interno | terceiro`.
- `financeiro_movimentacoes.tipo`: `entrada | saida`; `valor > 0`.
- `solicitacoes_compras.status`: `pendente | aprovada | recusada | comprada`.
- `solicitacoes_compras.urgencia`: `baixa | media | alta | urgente`.
- Nenhum CHECK nas tabelas consultadas `calendario_eventos`, `entregas_colaborador`, `condominios` ou `financeiro_parcelas`. Não inventar enum de status: conferir o vocabulário financeiro das telas e triggers antes da implementação.

## Limites preservados

Sem mudar realtime, estoque, markup das etapas 4 e 6, permissões anônimas das outras tabelas, `get_user_id_by_username`, `can_manage_users`, convites ou contas reais. Sem service role para operações de dados da Mafe. Sem edição manual da função MCP gerada ou dos arquivos de autenticação gerados.