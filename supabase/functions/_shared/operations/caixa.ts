import { z } from "npm:zod@4.4.3";
import { defineOperation, requireAuth, failure, jsonValue, type OperationContext } from "./contracts.ts";

export const CASH_COLUMNS = "id,tipo,descricao,valor,status,data_movimentacao,data_vencimento,data_pagamento,conta_id,categoria_id,projeto_id,cliente_id,colaborador_id,fornecedor_id,area_id,parcela_id,forma_pagamento,documento,comprovante_path,transferencia_id,recorrencia_id,origem,id_externo,revisar,observacoes,conta:financeiro_contas(nome),categoria_dados:financeiro_categorias(nome,grupo),projeto:projetos(titulo),cliente:clientes(nome),colaborador:colaboradores(nome),fornecedor:fornecedores(nome),area:areas(nome)";
export const CASH_FIELDS = ["tipo","categoria","descricao","valor","status","data_movimentacao","data_vencimento","data_pagamento","conta_id","categoria_id","projeto_id","cliente_id","colaborador_id","area_id","parcela_id","fornecedor_id","estoque_movimentacao_id","forma_pagamento","documento","comprovante_path","transferencia_id","recorrencia_id","origem","id_externo","revisar","observacoes","conta_destino_id","meses","escopo"];

export async function runCash(context: OperationContext, action: string, input: Record<string, unknown>, ids: string[] = [], reason?: string, confirmed = false) {
  const denial = await requireAuth(context); if (denial) return denial;
  if (!context.confirmed && !confirmed) return failure("Revise os dados e obtenha confirmação humana explícita antes de gravar dinheiro.");
  const response = await context.db.rpc("financeiro_operar", { p_acao: action, p_dados: input, p_ids: ids, p_motivo: reason ?? null, p_confirmado: true });
  if (response.error) return failure(response.error.message);
  const result = { registros: jsonValue(response.data) };
  return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
}

export const writeOperation = defineOperation({
  name: "operar_caixa", title: "Operar Caixa",
  description: "Cria, edita, baixa (inclusive parcial), cancela, transfere entre contas ou gera recorrência. Dinheiro exige prévia e confirmação explícita da pessoa; nunca confirme pelo usuário. Só os quatro papéis financeiros. Para baixas use ids e dados com conta_id,data_pagamento,valor opcional; transferência usa conta_id,conta_destino_id,valor e datas.",
  inputSchema: { acao: z.enum(["salvar","baixar","cancelar","transferencia","recorrencia"]), dados: z.record(z.string(),z.unknown()), ids: z.array(z.string().uuid()).optional(), motivo: z.string().optional(), confirmado: z.boolean().optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: ({ acao,dados,ids,motivo,confirmado },context) => runCash(context,acao,dados,ids,motivo,confirmado),
});

export const panelOperation = defineOperation({
  name: "painel_caixa", title: "Painel do Caixa",
  description: "Lista previstos a pagar e receber vencidos, hoje, próximos N dias e a revisar. Nunca retorna saldos ou somas para administrativo/gestor; totais são exclusivos de admin/diretor. Paginação por seção.",
  inputSchema: { dias: z.number().int().min(1).max(366).optional(), limite: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() },
  annotations: { readOnlyHint: true,idempotentHint: true,openWorldHint: false },
  handler: async ({ dias,limite,offset },context) => {
    const denial=await requireAuth(context); if(denial)return denial;
    const access=await context.db.rpc("fin1_authorized",{p_totals:false}); if(access.error||!access.data)return failure("Sem acesso ao financeiro.");
    const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo"}).format(new Date());
    const end=new Date(`${today}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+(dias??30)); const horizon=end.toISOString().slice(0,10);
    const from=offset??0, size=limite??30;
    const requests=[
      context.db.from("financeiro_movimentacoes").select(CASH_COLUMNS).eq("status","previsto").lt("data_vencimento",today).order("data_vencimento").order("id").range(from,from+size-1),
      context.db.from("financeiro_movimentacoes").select(CASH_COLUMNS).eq("status","previsto").eq("data_vencimento",today).order("id").range(from,from+size-1),
      context.db.from("financeiro_movimentacoes").select(CASH_COLUMNS).eq("status","previsto").gt("data_vencimento",today).lte("data_vencimento",horizon).order("data_vencimento").order("id").range(from,from+size-1),
      context.db.from("financeiro_movimentacoes").select(CASH_COLUMNS).eq("revisar",true).neq("status","cancelado").order("created_at").order("id").range(from,from+size-1),
    ];
    const responses=await Promise.all(requests);const error=responses.find((r)=>r.error)?.error;if(error)return failure(error.message);
    const output:Record<string,unknown>={vencidos:responses[0]?.data,hoje:responses[1]?.data,proximos:responses[2]?.data,a_revisar:responses[3]?.data,offset:from,limite:size};
    const totals=await context.db.rpc("fin1_authorized",{p_totals:true});
    if(totals.data){const balances=await context.db.rpc("financeiro_saldos",{p_data:horizon});if(balances.error)return failure(balances.error.message);output.saldos=balances.data;}
    const result=jsonValue(output);return {content:[{type:"text" as const,text:JSON.stringify(result)}],structuredContent:output};
  },
});