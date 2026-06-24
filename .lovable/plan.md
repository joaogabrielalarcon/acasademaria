# Salvamento automático de rascunhos

A pessoa começa a preencher, fecha o navegador, vai pra outro dispositivo, abre de novo e volta exatamente onde parou. Vale para qualquer formulário longo da app.

## Como vai funcionar pra quem usa

- Conforme a pessoa digita, o sistema salva sozinho a cada poucos segundos. Não tem botão de "salvar rascunho".
- Quando ela volta naquela tela, aparece um aviso discreto no topo: "Você tem um rascunho salvo de [data/hora]. Retomar ou começar do zero?" Se ela escolhe retomar, todos os campos voltam preenchidos, na mesma etapa em que ela parou.
- Quando ela conclui de verdade (salvar/enviar), o rascunho é apagado sozinho.
- Funciona mesmo offline: o navegador guarda local na hora e sincroniza pro servidor quando volta a conexão. Se ela trocar de dispositivo, o servidor manda o rascunho mais recente.

## Cobertura

Começa pelo **Novo Orçamento** (6 etapas, é onde dá mais prejuízo perder). No mesmo PR, liga em todos os outros formulários longos do sistema:

- Novo Projeto, Novo Cliente, Nova Planta, Novo Fornecedor, Nova Proposta, Novo Registro/Recebimento, Nova Solicitação de Compras
- Diário (Nova Visita, Manutenção)
- CRM Novo Card
- Chats da Mafe (cadastro, diário, orçamento) — preserva a conversa em andamento

Telas curtas (login, filtros, modais de confirmação) ficam fora — não fazem sentido.

## O que não entra no rascunho

- Arquivos/fotos em upload (o navegador não consegue guardar arquivos selecionados de forma confiável). A pessoa precisa reanexar ao retomar — fica avisado no banner.
- Telas de edição de registro já existente. Rascunho é só pra novo cadastro/lançamento; em edição, o próprio registro já é o "save".

## Parte técnica

**Tabela `form_drafts`** (nova): `user_id`, `form_key` (ex.: `novo-orcamento`, `nova-visita`), `scope_key` (opcional, pra diferenciar rascunhos por contexto, ex.: orçamento por `cliente_id`), `data jsonb`, `updated_at`. PK composta `(user_id, form_key, scope_key)`. RLS: usuário só lê/escreve os próprios rascunhos.

**Hook `useAutosaveDraft(formKey, state, setState, opts)`**:
- Na montagem: lê localStorage na hora (instantâneo) + busca do banco em paralelo; usa o mais recente por `updated_at`. Mostra banner "Retomar rascunho" antes de aplicar.
- Em cada mudança: debounce de ~1,5s, grava em localStorage imediatamente e faz upsert no banco.
- Serialização defensiva: ignora campos `File`, `FileList`, refs e funções. Só JSON puro.
- Versão do schema do form (`schemaVersion`) embutida; se mudar, rascunho antigo é descartado com aviso.
- `clearDraft()` chamado no submit bem-sucedido e no botão "começar do zero".

**Componente `DraftResumeBanner`** reutilizável: aparece quando há rascunho, mostra hora + dispositivo, botões Retomar / Descartar.

**Integração no Novo Orçamento**: o hook serializa todo o `formData` + `etapaAtual` + arrays (itens, insumos, MO, fretes, markup). Retomar coloca a pessoa de volta na etapa exata. Em modo edição (id na URL), o autosave fica desligado.

**Integração nas outras telas**: cada página passa a chamar `useAutosaveDraft("nome-do-form", state, setState)`. O hook cuida do resto.

**Limpeza**: rascunho com mais de 30 dias é apagado automaticamente por um job de limpeza simples (trigger no select, ou cron leve). Tamanho máximo por rascunho: 500 KB (corta antes de gravar com aviso no console).

## Ordem de entrega

1. Tabela `form_drafts` + RLS + grants.
2. Hook `useAutosaveDraft` + `DraftResumeBanner`.
3. Ligar no Novo Orçamento (validar de ponta a ponta).
4. Ligar em todos os outros formulários longos listados acima.
5. Limpeza de rascunhos antigos.
