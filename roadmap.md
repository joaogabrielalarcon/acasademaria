# FIN-1: Caixa

- [x] Conferir estado atual e apresentar plano aprovado.
- [x] Criar contas/categorias e seed exato, mais A classificar entrada autorizado; teste autenticado confirmou.
- [ ] Bucket privado criado; completar testes por papel e comprovante.
- [ ] Migrações de movimentações, regras, parcela e auditoria aplicadas; completar verificação dos fluxos e compatibilidade.
- Decisão confirmada: compra sem vencimento permanece no estoque; aguarda prazo antes de gerar movimentação financeira.
- Decisão confirmada: parcela sem valor positivo ou vencimento permanece no plano, sem movimentação, até completar os dados.
- Decisão confirmada: valor recebido é espelho automático; pagamento parcial mantém a diferença prevista em aberto.
- Decisões confirmadas: adicionar A classificar de entrada; usar pago e preservar conclusão de projetos não recorrentes.
- Decisão confirmada: Resumo com critérios selecionáveis por competência, pagamento e vencimento.
- [ ] Motor transacional escrito; criação simples corrigida e conferida, demais fluxos aguardam teste completo.
- [ ] Caixa, filtros/paginação, exportação e importação escritos; testes completos ainda pendentes.
- [ ] Integrar ferramentas/Mafe e restringir consolidados.
- [ ] Testes por papel, limpeza confirmada, publicação e versão servida.
- [x] Limpeza autorizada concluída: movimento de teste 794f1c8b-efee-4861-a6aa-e66a51546c1f excluído após conferência de dependências; consulta confirmou zero movimentos e um registro de auditoria preservado.
- Antes de publicação: completar fluxo UI de baixa/importação e conexão Mafe, testar administrativo/campo, revisar operações de transferência prevista e permissões reais.

# Rodada de ferramentas compartilhadas

- [ ] Confirmar versão de desempenho no site publicado.
- [ ] Apresentar plano de extração, permissões e lacunas do schema.
- [ ] Unificar handlers e substituir operações de dados da Mafe após aprovação do plano.
- [ ] Ampliar sete tabelas, validar CHECKs e campos de admissão existentes.
- [ ] Implementar painel de vencimentos com corte financeiro.
- [ ] Testar frase equivalente, operações administrativas e restrições do campo.
- [ ] Listar dependências e remover somente contas e registros descartáveis autorizados.
- [ ] Extrair manifesto, publicar e verificar versão servida.

# Cadastro interno e primeiro acesso

## Prioridade: acesso da Tânia
- [x] Conferir conta, vínculo, validade e bloqueio sem gerar senha para Tânia.
- [x] Reproduzir cadastro e login com teste.login administrativo.
- [x] Corrigir confirmação do convite antigo e normalizar credenciais; testar novamente.
- [x] Conferir dependências e excluir conta descartável.
- [ ] Publicar correção do acesso e normalização.

- [x] Conferir implementação existente e corrigir lacunas do pedido.
- [x] Verificar convite da Tânia sem gerar senha.
- [x] Testar cadastro e proteções sem divulgar credenciais; conta de verificação desativada.
- [x] Regenerar conector com bloqueio de primeiro acesso e de conta inativa.
- [ ] Confirmar publicação.
- [ ] Testar conexão real no Claude: depende do fluxo de autorização do cliente externo.