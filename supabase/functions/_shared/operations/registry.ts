import { operation as create } from "./criar-registros.ts";
import { operation as update } from "./atualizar-registro.ts";
import { operation as read } from "./read-table.ts";
import { operation as projects } from "./list-projetos.ts";
import { operation as clients } from "./list-clientes.ts";
import { operation as client } from "./get-cliente.ts";
import { operation as dashboard } from "./painel-projetos.ts";
import { operation as schema } from "./describe-schema.ts";
import { operation as due } from "./painel-vencimentos.ts";
import type { OperationContext } from "./contracts.ts";

export const operations = [create, update, read, projects, clients, client, dashboard, schema, due];
export async function executeOperation(name: string, input: unknown, context: OperationContext) {
  const operation = operations.find((item) => item.name === name);
  if (!operation) throw new Error("Operação não disponível na camada compartilhada.");
  return operation.execute(input, context);
}
export const CONVERSATION_RULES = `A pessoa relata e você classifica. Mostre exatamente o que pretende gravar e aguarde confirmação humana antes de gravar. Nunca peça escolha de campo, tipo ou status. Faça no máximo duas perguntas por registro. Não invente vínculos, nomes, datas ou valores. Resolva referências consultando os registros visíveis; se houver ambiguidade, pergunte. Valores e financeiro são exclusivos de admin, administrativo, gestor e diretor, sem exceção para papel novo. Dinheiro e NF sempre precisam de confirmação humana explícita. Use as listas fechadas e campos reais das ferramentas, sem tradução silenciosa. Use modo acrescentar para completar relatos. Não gere senha, token ou convite. Não apague dados. Português do Brasil, sem travessão. Operações não cobertas devem ser informadas, nunca executadas por outro caminho.`;