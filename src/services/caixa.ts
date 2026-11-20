import { supabase } from "@/integrations/supabase/client";
import { CASH_COLUMNS } from "../../supabase/functions/_shared/operations/caixa";
import type { Tables, Json } from "@/integrations/supabase/types";
import { getFinancialReceiptUrl } from "./financeiro-comprovantes";

export type CashRow = Pick<Tables<"financeiro_movimentacoes">,"id"|"tipo"|"descricao"|"valor"|"status"|"data_movimentacao"|"data_vencimento"|"data_pagamento"|"conta_id"|"categoria_id"|"projeto_id"|"cliente_id"|"colaborador_id"|"fornecedor_id"|"area_id"|"parcela_id"|"forma_pagamento"|"documento"|"comprovante_path"|"transferencia_id"|"recorrencia_id"|"origem"|"id_externo"|"revisar"|"observacoes"> & {conta:{nome:string}|null;categoria_dados:{nome:string;grupo:string}|null;projeto:{titulo:string}|null;cliente:{nome:string}|null;colaborador:{nome:string}|null;fornecedor:{nome:string}|null;area:{nome:string}|null};
export type CashFilters = { month:string;account?:string;category?:string;area?:string;project?:string;status?:string;review?:boolean;search?:string;basis?:"competencia"|"pagamento"|"vencimento" };
export const cashToday = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo"}).format(new Date());
export function monthWindow(month:string){const [year,number]=month.split("-").map(Number);return {start:`${month}-01`,end:new Date(Date.UTC(year,number,1)).toISOString().slice(0,10)};}

export async function listCash(filters:CashFilters,tab:string,group:string,offset=0,limit=30) {
  let query=supabase.from("financeiro_movimentacoes").select(CASH_COLUMNS,{count:"exact"});
  if(filters.account)query=query.eq("conta_id",filters.account);
  if(filters.category)query=query.eq("categoria_id",filters.category);
  if(filters.area)query=query.eq("area_id",filters.area);
  if(filters.project)query=query.eq("projeto_id",filters.project);
  if(filters.review)query=query.eq("revisar",true);
  if(filters.search?.trim())query=query.ilike("descricao",`%${filters.search.trim()}%`);
  const today=cashToday(),next=new Date(`${today}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+7);const week=next.toISOString().slice(0,10);
  if(tab==="pagar"||tab==="receber"){
    query=query.eq("tipo",tab==="pagar"?"saida":"entrada").eq("status","previsto");
    if(group==="vencidos")query=query.lt("data_vencimento",today);
    if(group==="hoje")query=query.eq("data_vencimento",today);
    if(group==="semana")query=query.gt("data_vencimento",today).lte("data_vencimento",week);
    if(group==="depois")query=query.gt("data_vencimento",week);
  }else{
    const window=monthWindow(filters.month);const column=filters.basis==="competencia"?"data_movimentacao":filters.basis==="vencimento"?"data_vencimento":"data_pagamento";
    query=query.gte(column,window.start).lt(column,window.end).eq("status",filters.status||"realizado");
  }
  const {data,error,count}=await query.order(tab==="extrato"?"data_pagamento":"data_vencimento").order("created_at").order("id").range(offset,offset+limit-1);
  if(error)throw error;return {rows:data as unknown as CashRow[],count:count??0};
}

export async function operateCash(action:string,data:Record<string,unknown>,ids:string[]=[],reason?:string){
  const {data:result,error}=await supabase.rpc("financeiro_operar",{p_acao:action,p_dados:data as Json,p_ids:ids,p_motivo:reason??null,p_confirmado:true});if(error)throw error;return result;
}
export async function cashBalances(date:string){const {data,error}=await supabase.rpc("financeiro_saldos",{p_data:date});if(error)throw error;return data as unknown as Array<{id:string;nome:string;saldo_realizado:number;saldo_previsto:number}>;}
export async function cashRunningBalances(ids:string[]){const {data,error}=await supabase.rpc("financeiro_saldos_linhas",{p_ids:ids});if(error)throw error;return data as unknown as Array<{id:string;saldo:number}>;}
export async function cashSummary(filters:CashFilters){const {data,error}=await supabase.rpc("financeiro_resumo",{p_mes:`${filters.month}-01`,p_criterio:filters.basis??"competencia",p_status:filters.status||"realizado",p_conta:filters.account||null,p_categoria:filters.category||null,p_area:filters.area||null,p_projeto:filters.project||null});if(error)throw error;return data as unknown as {entradas:number;saidas:number;resultado:number;grupos:Array<{dimensao:string;nome:string;tipo:string;valor:number}>};}

export type LinkKind="clientes"|"fornecedores"|"colaboradores"|"projetos"|"areas";
export async function searchCashLinks(kind:LinkKind,search:string):Promise<Array<{id:string;name:string}>>{
  if(search.trim().length<2)return [];
  if(kind==="projetos"){const {data,error}=await supabase.from("projetos").select("id,titulo").ilike("titulo",`%${search.trim()}%`).order("titulo").limit(30);if(error)throw error;return data.map((r)=>({id:r.id,name:r.titulo}));}
  const {data,error}=await supabase.from(kind).select("id,nome").ilike("nome",`%${search.trim()}%`).order("nome").limit(30);if(error)throw error;return data.map((r)=>({id:r.id,name:r.nome}));
}

export async function exportCash(filters:CashFilters){
  const rows:CashRow[]=[];for(let offset=0;;offset+=100){const page=await listCash(filters,"extrato","",offset,100);rows.push(...page.rows);if(page.rows.length<100)break;}
  const xlsx=await import("xlsx");
  const links=await Promise.all(rows.map(async(row)=>row.comprovante_path?await getFinancialReceiptUrl(row.comprovante_path):""));
  const sheet=xlsx.utils.json_to_sheet(rows.map((r,i)=>({"Data de pagamento":r.data_pagamento,"Data de vencimento":r.data_vencimento,"Competência":r.data_movimentacao,"Tipo":r.tipo,"Descrição":r.descricao,"Categoria":r.categoria_dados?.nome,"Grupo":r.categoria_dados?.grupo,"Conta":r.conta?.nome,"Valor":r.valor,"Status":r.status,"Vínculo":[r.projeto?.titulo,r.cliente?.nome,r.colaborador?.nome,r.fornecedor?.nome].filter(Boolean).join(" · "),"Documento":r.documento,"Link do comprovante":links[i]})));
  const book=xlsx.utils.book_new();xlsx.utils.book_append_sheet(book,sheet,"Caixa");xlsx.writeFile(book,`caixa-${filters.month}.xlsx`);
}