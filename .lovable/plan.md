

# Planilha de Importação em Massa de Clientes

## Objetivo
Criar uma planilha Excel (.xlsx) com todas as colunas necessárias para cadastrar clientes no sistema, pronta para preenchimento. Depois, criar uma funcionalidade de importação que leia essa planilha e insira todos os clientes de uma vez.

## Estrutura da Planilha

A planilha terá **uma aba principal** com as seguintes colunas:

| Coluna | Exemplo | Obrigatório? |
|--------|---------|-------------|
| Nome | João da Silva | Sim |
| Status | ativo / inativo / prospecto | Sim (default: ativo) |
| Telefone | (11) 99999-9999 | Não |
| Email | joao@email.com | Não |
| CPF/CNPJ | 000.000.000-00 | Não |
| Inscrição Estadual | 123456789 | Não |
| Endereço | Rua das Flores, 123 | Não |
| Bairro | Jardim Europa | Não |
| Cidade | São Paulo | Não |
| Estado | SP | Não |
| CEP | 01234-567 | Não |
| Condomínio | Alphaville | Não |
| Particularidades | Portão lateral | Não |
| Notas | Cliente VIP | Não |
| Proprietário 1 - Nome | Maria Silva | Não |
| Proprietário 1 - Telefone | (11) 98888-8888 | Não |
| Proprietário 1 - Email | maria@email.com | Não |
| Proprietário 2 - Nome | | Não |
| Proprietário 2 - Telefone | | Não |
| Proprietário 2 - Email | | Não |
| Funcionário Casa 1 - Nome | José | Não |
| Funcionário Casa 1 - Função | Caseiro | Não |
| Funcionário Casa 1 - Telefone | (11) 97777-7777 | Não |
| Funcionário Casa 2 - Nome | | Não |
| Funcionário Casa 2 - Função | | Não |
| Funcionário Casa 2 - Telefone | | Não |
| Assessor 1 - Nome | Ana Paisagista | Não |
| Assessor 1 - Empresa | Studio Verde | Não |
| Assessor 1 - Telefone | (11) 96666-6666 | Não |
| Assessor 2 - Nome | | Não |
| Assessor 2 - Empresa | | Não |
| Assessor 2 - Telefone | | Não |
| Data Importante 1 - Data | 15/03 | Não |
| Data Importante 1 - Descrição | Aniversário | Não |
| Data Importante 2 - Data | | Não |
| Data Importante 2 - Descrição | | Não |

## Entregáveis

1. **Planilha Excel formatada** com:
   - Headers coloridos e organizados por seção (Identificação, Endereço, Proprietários, etc.)
   - Validação de dados no campo Status (dropdown: ativo/inativo/prospecto)
   - Uma linha de exemplo preenchida
   - Colunas com largura adequada

2. **Funcionalidade de importação** na página de Clientes:
   - Botão "Importar Clientes" que aceita arquivo .xlsx
   - Leitura da planilha no frontend usando biblioteca xlsx (SheetJS)
   - Preview dos dados antes de confirmar importação
   - Inserção em lote na tabela `clientes` com os campos JSON (proprietários, funcionários, assessores, datas) montados automaticamente
   - Feedback de sucesso/erro por linha

## Arquivos a criar/editar
- Gerar `/mnt/documents/template_clientes.xlsx` (template para download)
- `src/pages/Clientes.tsx` — adicionar botão de importação
- `src/components/ImportarClientesDialog.tsx` — modal com upload, preview e confirmação
- `package.json` — adicionar dependência `xlsx`

