# FIN-1: Caixa como único livro financeiro

## Entrega e limite

Evoluir `financeiro_movimentacoes`, sem outro livro-caixa, para entradas e saídas previstas ou realizadas, comprovantes, transferências, recorrência, importação e conversa. Meta solicitada: versão servida, testada e publicada até **terça, 24/11/2026**, antes do cancelamento do Conta Azul em 26/11. O prazo depende de resolver as decisões abaixo e passar nos testes; não publicar uma versão financeira incompleta.

A camada compartilhada de Mafe e conector já iniciada será preservada. FIN-1 usará essa base, sem ampliar assuntos administrativos da rodada anterior. Nesta etapa somente o plano será escrito; `roadmap.md` receberá FIN-1 quando a execução estiver autorizada, pois o modo atual não permite editar outros arquivos.

## Estado conferido nesta rodada

- `Movimentacoes.tsx` usa um hook com `select('*')`, carrega todas as movimentações e calcula totais no navegador; os fornecedores também são carregados como lista.
- Existem **0 movimentações e 0 parcelas** na consulta atual. As migrações continuarão preservando qualquer linha que exista quando forem aplicadas.
- Não foram encontradas `financeiro_contas` e `financeiro_categorias`. Movimentações ainda não têm os novos campos do Caixa; parcelas já têm pagamento, valor recebido e campos de NF.
- RLS de movimentações permite leitura/escrita a admin e administrativo. Parcelas permitem leitura também a `gestao_campo`. FIN-1 substituirá essas permissões pelas solicitadas.
- A entrada de compra no estoque gera movimentação financeira sem conta nem vencimento. Projetos podem gerar parcelas sem vencimento e com valor zero.
- A tela antiga usa `pago`, mas o trigger que conclui projetos testa `recebido`. Essa diferença precisa ser resolvida explicitamente, não traduzida silenciosamente.
- `painel_vencimentos` ainda consulta parcelas. A extração compartilhada e a Mafe não têm teste completo ou publicação confirmada nesta rodada.

## Decisões necessárias antes de executar os trechos dependentes

1. **Estoque sem alterar estoque:** o lançamento automático de compra não informa conta nem vencimento. Recomendo que o Caixa o receba como **previsto, a revisar**, mas falta decidir o vencimento: qual data usar? Sem essa decisão, exigir vencimento bloquearia a compra. Não atribuir uma conta nem declarar pagamento por suposição; não alterar a tela ou a função do estoque.
2. **Parcelas geradas sem vencimento ou com valor zero:** devem ficar apenas como plano, sem movimentação, até ter valor positivo e vencimento? Recomendo essa opção para preservar aprovação de projetos sem inventar datas. Quando prontas, criar/vincular exatamente uma movimentação prevista por parcela.
3. **Pagamento e valor diferente:** manter `financeiro_parcelas.valor` como valor planejado e `valor_recebido` como espelho somente de leitura atualizado por trigger, nunca como segunda baixa? Isso atende à sincronização pedida, mas é uma cópia derivada. Se “nenhum valor em dois lugares” for literal, a alternativa é leitura por vínculo/view, não armazenamento de `valor_recebido`. Confirmar também se pagar menos encerra a parcela ou deve deixar saldo em aberto; FIN-1 não presumirá pagamento parcial.
4. **Categoria desconhecida de entrada:** “A classificar” foi definido somente como saída. Recomendo entrada desconhecida em **Outras receitas**, com `revisar = true`; saída desconhecida em **A classificar**. Confirma? Alternativa: autorizar uma categoria adicional de entrada, contrariando o seed exato. Para legado, proponho `compra_insumo → Insumos e materiais`, `compra_planta → Plantas`, `salario → Salários`, `combustivel → Combustível e veículos`, `manutencao_maquina → Máquinas e equipamentos (compra e manutenção)`; `servico`, `recebimento_cliente` e `outros` ficam a revisar quando a descrição não determina a categoria, sem inferir o tipo de serviço.
5. **Status da parcela e projeto:** usar `pago` como espelho de movimentação realizada e ajustar a leitura do trigger de conclusão de projetos para esse mesmo status? Isso é uma alteração de comportamento existente; recomendo manter a finalidade original de concluir os projetos não recorrentes quando todas as parcelas estiverem pagas, sem modificar manutenção.
6. **Resumo por mês:** recomendo resultado por **competência**, apenas realizado, com `entra_no_resultado = true`; saldos por pagamento e previsão por vencimento. Confirma esses critérios? O saldo inicial será considerado somente a partir de `data_saldo_inicial`, contando movimentações dessa data em diante.

Decisões abertas ficam bloqueadas, não são autorização para inventar. A aprovação do plano deve vir acompanhada das respostas aos itens 1 a 6.

## Ordem de execução

### 1. Proteções e inventário, antes de habilitar o Caixa

- Registrar contagens, regras, dependências, triggers e permissões antes de migrar; atualizar o roteiro FIN-1.
- Definir duas permissões compartilhadas: **operar financeiro** (admin, administrativo, gestor, diretor) e **ver consolidados** (admin, diretor). Papel novo nasce sem acesso.
- Aplicar ambas no banco, nas telas e nas ferramentas. Bloquear caminhos antigos que baixam parcelas diretamente e qualquer leitura financeira pelo campo.
- Sem alterar autenticação ou contas reais. Exclusão continua somente admin, com dependências listadas e confirmação.

### 2. Modelo, categorias, contas e compatibilidade

- Criar `financeiro_contas` com todos os campos pedidos e CHECK `PJ|PF`; criar `financeiro_categorias` com CHECK `entrada|saida` e unicidade por nome e tipo. RLS por papel e GRANTs explícitos.
- Cadastrar exatamente as quatro contas: **PJ Itaú**, **PJ Safra**, **PF Nubank**, **Conta PJ Conta Azul IP** (inativa), com banco/agência/número fornecidos, saldo 0 e data 01/01/2026. Empresa e dados não informados ficam vazios, não inventados.
- Cadastrar as **35 categorias** da lista, com nomes e grupos exatos. `Rendimentos e juros recebidos` entra no resultado; aportes, transferências e as quatro saídas de Sócios e financeiro não entram. Demais categorias entram.
- Adicionar os campos solicitados a movimentações e `movimentacao_id` a parcelas. Preservar `categoria` como legado e `estoque_movimentacao_id`. Migrar linhas antigas para realizado e copiar competência para pagamento, sem apagar. Se surgirem linhas sem conta identificável, parar para atribuição explícita antes de validar a regra.
- Índices pedidos e em todas as novas FKs; unicidade parcial `(origem, id_externo)` e vínculos parcela/movimentação coerentes. Sem cascata que apague histórico financeiro.
- Triggers de validação para realizado/pagamento/conta, previsto/vencimento, valor positivo, tipo compatível com categoria, vínculos consistentes e cancelamento com motivo. Registrar mudanças de status em auditoria imutável na mesma transação.
- Parcelas continuam como plano. Baixa ocorre somente na movimentação e sincroniza os espelhos autorizados, sem ciclos de triggers nem lançamento duplicado. Adaptar apenas os consumidores financeiros indispensáveis à regra-mãe.

### 3. Motor transacional e comprovantes

- Operações únicas compartilhadas para criar, editar, baixar individual/em lote, duplicar, cancelar, transferir e gerar/editar recorrência. Identidade e autoria derivadas do usuário autenticado; nenhum uso de service role pela Mafe.
- Transferência atômica: duas linhas do mesmo valor em contas distintas, mesmo identificador e categorias corretas; cancelar uma cancela ambas. Exclusão de teste/admin preserva a integridade do par e exige confirmação.
- Recorrência: gerar N parcelas mensais na mesma transação e com o mesmo identificador; meses curtos usam o último dia quando necessário. Edição oferece “Só esta” ou “Esta e as próximas”, sem modificar automaticamente as já realizadas.
- Criar bucket privado `financeiro-comprovantes`, imagens/PDF até 10 MB. RLS para os quatro papéis financeiros, validação de arquivo e links assinados curtos. Nunca URL pública; limpeza de upload órfão sem apagar comprovantes vinculados.
- Funções `financeiro_saldos(data)` e `financeiro_resumo(mes)` com verificação interna admin/diretor e privilégios de execução mínimos. Os papéis do app não são papéis SQL: a verificação do usuário ocorre dentro da função, além dos GRANTs. Negar acesso sem retornar totais.

### 4. Tela Caixa e exportação

- Evoluir a página atual para `/financeiro/caixa`; redirecionar a rota de Movimentações e unificar a entrada antiga de A receber ao Caixa, preservando o plano financeiro dentro do projeto.
- Abas A pagar, A receber, Extrato e Resumo; Resumo só admin/diretor. Previsto separado em Vencidos, Hoje, Próximos 7 dias e Depois, com paginação no servidor por grupo para não omitir vencidos.
- Formulário na ordem solicitada, baixa em diálogo único individual/em lote, edição, duplicação, cancelamento com motivo, transferência e recorrência. Comprovante opcional na baixa.
- Mês atual por padrão, filtros completos no servidor e busca textual. Colunas explícitas, paginação real e seletores por busca digitada, sem catálogos completos. Vencidos não somem por causa do mês padrão.
- Extrato com saldo corrido apenas admin/diretor, calculado considerando saldo anterior ao período/página; administrativo/gestor não recebem nem calculam saldos ou somas.
- XLSX de todo o período filtrado, lido em lotes, com as colunas solicitadas. Links de comprovantes assinados e temporários, com prazo claramente informado; não exportar acesso público permanente.
- Visual editorial com tokens existentes, títulos serifados e números sans; tabela no computador e cartões no celular, alvos de toque adequados, skeleton, vazio, erro recuperável e retorno das ações.

### 5. Importação, apenas admin

- CSV/XLSX processado em memória, sem persistir o arquivo original. Validar datas, valores brasileiros, enums, campos obrigatórios e duplicidade de `id_externo` dentro do arquivo.
- Resolver nomes por igualdade normalizada sem acento/maiúsculas e apelidos; correspondência ambígua não escolhe um cadastro ao acaso. Vínculos não resolvidos ficam nulos e a revisar. Conta ausente em realizado é **erro bloqueante**, não exceção à regra do banco.
- Prévia com linhas, erros e somas de entradas/saídas por mês/conta. Só gravar após confirmação humana, com origem importacao e upsert atômico por identificador. Exibir inseridos, atualizados, inalterados e erros; segunda importação não duplica.

### 6. Mafe e conector

- Ampliar os contratos compartilhados de criar/atualizar movimentações, com mesmas validações e operações transacionais. Permitir leitura de contas e categorias aos papéis financeiros.
- `painel_caixa`: vencidos, hoje, próximos N dias, a pagar/receber e a revisar; saldos e totais exclusivamente admin/diretor.
- `painel_vencimentos` mantém eventos e troca somente a origem financeira para movimentações previstas, sem duplicar parcelas.
- Conversa e comprovante produzem proposta revisável; gravação depende de confirmação humana explícita vinculada aos dados e ao usuário. Token/segredo nunca em chat, log ou resposta visível. Conferir acesso em cada operação, não confiar no papel enviado pela tela.
- Revisar também outros leitores financeiros existentes para impedir consolidados a administrativo/gestor. Essa restrição impede totais fornecidos pelo sistema, mas quem recebe todas as linhas pode somá-las fora dele; não prometer impossibilidade matemática de inferência.

### 7. Testes, limpeza e publicação

- Testes pequenos por regra de negócio e testes reais com contas descartáveis admin, administrativo e operador_campo, sem tocar nas contas reais.
- Saída prevista → baixa com comprovante → leitura no Extrato e parcela; transferência e cancelamento dos dois lados; recorrência de 3 meses; CSV com 5 linhas importado duas vezes, permanecendo 5 identificadores únicos.
- Testar datas obrigatórias, valor positivo, cancelamento sem motivo, conta/categoria incoerente, importação não casada, acesso aos arquivos e confirmação de conversa.
- Administrativo lança/baixa e vê listas, mas Resumo, saldo, funções consolidadas e totais do conector são recusados; campo recusado em todas as cinco tabelas e comprovantes. Incluir gestor/diretor em testes automatizados de autorização.
- Listar dependências de contas e dados descartáveis e aguardar confirmação antes de apagar, conforme regra fixa. Auditoria imutável não será apagada; informar eventuais marcas de teste preservadas.
- Verificar ausência de cargas integrais, fluxos no celular e computador e regressões dos vínculos existentes. Extrair manifesto MCP separadamente, publicar apenas após testes e conferir a versão efetivamente servida. Publicação iniciada não será apresentada como concluída.

## Não tocar e prestação de contas

Não alterar tela/função de Conciliação, orçamento/markup, estoque, autenticação, contas reais nem permissões anônimas das demais tabelas. Nenhuma movimentação existente será apagada.

Ao concluir: devolver o checklist FIN-1 item a item, evidências dos testes por papel, contagens antes/depois da importação e migração, dependências/limpeza de testes, pendências e confirmação da versão publicada. Não afirmar sucesso de teste ou publicação sem evidência.