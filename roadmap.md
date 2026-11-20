# FIN-1: Caixa

- [x] Conferir estado atual e apresentar plano aprovado.
- [ ] Criar contas/categorias e seed exato, com acesso financeiro restrito.
- [ ] Criar bucket privado e validar acesso por papel.
- [ ] Migrar movimentações, regras, parcela e auditoria (aguarda decisões de estoque, parcela e pagamento).
- Decisão confirmada: compra sem vencimento permanece no estoque; aguarda prazo antes de gerar movimentação financeira.
- Decisão confirmada: parcela sem valor positivo ou vencimento permanece no plano, sem movimentação, até completar os dados.
- Decisão confirmada: valor recebido é espelho automático; pagamento parcial mantém a diferença prevista em aberto.
- Decisões confirmadas: adicionar A classificar de entrada; usar pago e preservar conclusão de projetos não recorrentes.
- Decisão confirmada: Resumo com critérios selecionáveis por competência, pagamento e vencimento.
- [ ] Motor transacional, transferência e recorrência.
- [ ] Caixa, filtros/paginação, exportação e importação.
- [ ] Integrar ferramentas/Mafe e restringir consolidados.
- [ ] Testes por papel, limpeza confirmada, publicação e versão servida.

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