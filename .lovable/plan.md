# FIN-1: Caixa como único livro financeiro

## Entrega e limite

Evoluir `financeiro_movimentacoes`, sem segundo livro-caixa. Meta: testado e publicado até **terça, 24/11/2026**, antes do cancelamento em 26/11. Não publicar uma versão financeira incompleta.

A camada compartilhada já iniciada será preservada e usada pelo FIN-1. Só o plano será escrito agora; `roadmap.md` será atualizado na execução autorizada.

## Estado conferido nesta rodada

- `Movimentacoes.tsx` usa um hook com `select('*')`, carrega todas as movimentações e calcula totais no navegador; os fornecedores também são carregados como lista.
- Existem **0 movimentações e 0 parcelas** agora; preservar também linhas criadas antes da migração.
- Não foram encontradas `financeiro_contas` e `financeiro_categorias`. Movimentações ainda não têm os novos campos do Caixa; parcelas já têm pagamento, valor recebido e campos de NF.
- RLS de movimentações permite leitura/escrita a admin e administrativo. Parcelas permitem leitura também a `gestao_campo`. FIN-1 substituirá essas permissões pelas solicitadas.
- A entrada de compra no estoque gera movimentação financeira sem conta nem vencimento. Projetos podem gerar parcelas sem vencimento e com valor zero.
- A tela antiga usa `pago`, mas o trigger que conclui projetos testa `recebido`. Essa diferença precisa ser resolvida explicitamente, não traduzida silenciosamente.
- `painel_vencimentos` ainda consulta parcelas. A extração compartilhada e a Mafe não têm teste completo ou publicação confirmada nesta rodada.

## Decisões necessárias antes de executar os trechos dependentes

1. **Compra automática do estoque:** recomendo receber como **previsto, a revisar**, sem presumir pagamento ou conta. Qual vencimento usar? Exigir vencimento sem resolver isso bloquearia compras. Não alterar tela/função de estoque.
2. **Parcela sem vencimento ou com valor zero:** pode permanecer só como plano até ter valor positivo e vencimento, criando então uma movimentação prevista? Recomendo isso para não bloquear aprovação de projetos nem inventar datas.
3. **Valor recebido:** confirmar `valor` da parcela como plano e `valor_recebido` como espelho somente de leitura por trigger. É cópia derivada, não outra baixa. Se a proibição de duplicação for literal, usar vínculo/view em vez de armazenar esse espelho. Pagar menos encerra a parcela ou deixa saldo em aberto? Não presumir pagamento parcial.
4. **Categorias:** “A classificar” é só saída. Entrada não reconhecida pode usar **Outras receitas**, a revisar? Para legado: insumo → Insumos e materiais; planta → Plantas; salario → Salários; combustivel → Combustível e veículos; manutencao_maquina → Máquinas e equipamentos (compra e manutenção). Confirmar `servico`, `recebimento_cliente` e `outros` nas categorias genéricas do seu tipo, a revisar, sem inferir serviço.
5. **Status:** confirmar `pago` como espelho de realizado e adequar o trigger que hoje testa `recebido`, preservando conclusão de projetos não recorrentes quando todas as parcelas forem pagas. É mudança de comportamento; manutenção não muda.
6. **Cálculo:** resultado mensal por **competência**, só realizado e categorias que entram no resultado; saldos por pagamento, previsto por vencimento. Confirmar saldo inicial contando apenas lançamentos desde `data_saldo_inicial`.

Decisões abertas ficam bloqueadas, não são autorização para inventar. A aprovação do plano deve vir acompanhada das respostas aos itens 1 a 6.

## Ordem de execução

### 1. Proteções e inventário, antes de habilitar o Caixa

- Registrar contagens e dependências. Duas permissões compartilhadas: **operar** (admin, administrativo, gestor, diretor) e **consolidados** (admin, diretor). Papel novo sem acesso.
- Aplicar no banco, telas e ferramentas; impedir baixa direta de parcela e leitura financeira pelo campo. Exclusão só admin, após dependências e confirmação.

### 2. Modelo, categorias, contas e compatibilidade

- Criar contas/categorias com todos os campos pedidos, CHECKs e unicidade por nome/tipo, RLS e GRANTs explícitos.
- Cadastrar exatamente as quatro contas: **PJ Itaú**, **PJ Safra**, **PF Nubank**, **Conta PJ Conta Azul IP** (inativa), com banco/agência/número fornecidos, saldo 0 e data 01/01/2026. Empresa e dados não informados ficam vazios, não inventados.
- Cadastrar as **35 categorias** da lista, com nomes e grupos exatos. `Rendimentos e juros recebidos` entra no resultado; aportes, transferências e as quatro saídas de Sócios e financeiro não entram. Demais categorias entram.
- Adicionar os campos solicitados a movimentações e `movimentacao_id` a parcelas. Preservar `categoria` como legado e `estoque_movimentacao_id`. Migrar linhas antigas para realizado e copiar competência para pagamento, sem apagar. Se surgirem linhas sem conta identificável, parar para atribuição explícita antes de validar a regra.
- Índices pedidos e nas novas FKs; unicidade parcial `(origem, id_externo)` e vínculos coerentes, sem cascata destrutiva.
- Validar no banco pagamento/conta, vencimento, valor positivo, categoria/tipo e motivo de cancelamento. Auditoria de status na mesma transação.
- Baixa só na movimentação, espelhos conforme decisão, sem ciclo ou duplicação; adaptar consumidores financeiros indispensáveis.

### 3. Motor transacional e comprovantes

- Motor compartilhado para criar/editar/baixar/duplicar/cancelar, transferência e recorrência, com autoria autenticada e sem service role pela Mafe.
- Transferência atômica: duas linhas do mesmo valor em contas distintas, mesmo identificador e categorias corretas; cancelar uma cancela ambas. Exclusão de teste/admin preserva a integridade do par e exige confirmação.
- Recorrência: gerar N parcelas mensais na mesma transação e com o mesmo identificador; meses curtos usam o último dia quando necessário. Edição oferece “Só esta” ou “Esta e as próximas”, sem modificar automaticamente as já realizadas.
- Bucket privado `financeiro-comprovantes`, imagem/PDF até 10 MB, RLS dos quatro papéis e links curtos; tratar uploads órfãos.
- `financeiro_saldos(data)` e `financeiro_resumo(mes)`: GRANTs mínimos e checagem interna admin/diretor, pois papéis do app não são papéis SQL. Negar sem retornar totais.

### 4. Tela Caixa e exportação

- Evoluir a página atual para `/financeiro/caixa`; redirecionar a rota de Movimentações e unificar a entrada antiga de A receber ao Caixa, preservando o plano financeiro dentro do projeto.
- Abas A pagar, A receber, Extrato e Resumo; Resumo só admin/diretor. Previsto separado em Vencidos, Hoje, Próximos 7 dias e Depois, com paginação no servidor por grupo para não omitir vencidos.
- Formulário na ordem pedida e todas as ações, com baixa individual/em lote em diálogo único e comprovante opcional.
- Filtros pedidos no servidor, colunas explícitas, paginação e busca digitada; sem cargas integrais. Vencidos não somem pelo filtro de mês.
- Extrato com saldo corrido apenas admin/diretor, calculado considerando saldo anterior ao período/página; administrativo/gestor não recebem nem calculam saldos ou somas.
- XLSX do filtro completo em lotes e colunas pedidas; links de comprovantes temporários, com prazo informado.
- Tokens existentes, títulos serifados, números sans, tabela/cartões, alvos de toque, skeleton, vazio e erro recuperável.

### 5. Importação, apenas admin

- CSV/XLSX em memória; validar datas, valores BR, enums, obrigatórios e identificadores repetidos.
- Resolver nomes por igualdade normalizada sem acento/maiúsculas e apelidos; correspondência ambígua não escolhe um cadastro ao acaso. Vínculos não resolvidos ficam nulos e a revisar. Conta ausente em realizado é **erro bloqueante**, não exceção à regra do banco.
- Prévia com erros e somas por mês/conta; confirmação humana, origem importacao, upsert por identificador e relatório. Segunda importação não duplica.

### 6. Mafe e conector

- Ampliar os contratos compartilhados de criar/atualizar movimentações, com mesmas validações e operações transacionais. Permitir leitura de contas e categorias aos papéis financeiros.
- `painel_caixa`: vencidos, hoje, próximos N dias, a pagar/receber e a revisar; saldos e totais exclusivamente admin/diretor.
- `painel_vencimentos` mantém eventos e troca somente a origem financeira para movimentações previstas, sem duplicar parcelas.
- Conversa/comprovante gera proposta; confirmação humana vinculada ao usuário e dados antes de gravar. Acesso validado no servidor, segredos nunca expostos.
- Revisar também outros leitores financeiros existentes para impedir consolidados a administrativo/gestor. Essa restrição impede totais fornecidos pelo sistema, mas quem recebe todas as linhas pode somá-las fora dele; não prometer impossibilidade matemática de inferência.

### 7. Testes, limpeza e publicação

- Testes de regras e fluxos reais com contas descartáveis admin, administrativo e operador_campo.
- Saída prevista → baixa com comprovante → leitura no Extrato e parcela; transferência e cancelamento dos dois lados; recorrência de 3 meses; CSV com 5 linhas importado duas vezes, permanecendo 5 identificadores únicos.
- Testar validações, importação não casada, comprovantes e confirmação de conversa.
- Administrativo lança/baixa e vê listas, mas Resumo, saldo, funções consolidadas e totais do conector são recusados; campo recusado em todas as cinco tabelas e comprovantes. Incluir gestor/diretor em testes automatizados de autorização.
- Listar dependências de contas e dados descartáveis e aguardar confirmação antes de apagar, conforme regra fixa. Auditoria imutável não será apagada; informar eventuais marcas de teste preservadas.
- Verificar paginação, celular/computador e regressões; extrair manifesto MCP, publicar após testes e confirmar versão servida, não apenas início da publicação.

## Não tocar e prestação de contas

Não alterar tela/função de Conciliação, orçamento/markup, estoque, autenticação, contas reais nem permissões anônimas das demais tabelas. Nenhuma movimentação existente será apagada.

Ao concluir: devolver o checklist FIN-1 item a item, evidências dos testes por papel, contagens antes/depois da importação e migração, dependências/limpeza de testes, pendências e confirmação da versão publicada. Não afirmar sucesso de teste ou publicação sem evidência.