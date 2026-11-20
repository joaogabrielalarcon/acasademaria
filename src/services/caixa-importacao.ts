import {supabase} from "@/integrations/supabase/client";
import type {Json} from "@/integrations/supabase/types";
import {financialImportAmount,financialImportDate} from "@/lib/caixa-importacao";

export type CashImportPreview={rows:Record<string,unknown>[];errors:Array<{line:number;message:string}>;review:number;summary:Array<{month:string;account:string;income:number;expense:number}>;total:number};
export async function previewCashImport(file:File):Promise<CashImportPreview>{
  const xlsx=await import("xlsx");const workbook=xlsx.read(await file.arrayBuffer(),{type:"array",cellDates:true});const sheetName=workbook.SheetNames[0];if(!sheetName)throw new Error("Arquivo vazio.");const source=xlsx.utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets[sheetName],{defval:null});
  if(source.length>5000)throw new Error("Importe até 5000 linhas por arquivo.");
  const rows:Record<string,unknown>[]=[];const errors:Array<{line:number;message:string}>=[];const ids=new Set<string>();const sums=new Map<string,{month:string;account:string;income:number;expense:number}>();const resolved=new Map<string,string|null>();let review=0;
  async function resolve(kind:string,name:unknown,type?:string){const text=String(name??"").trim();if(!text)return null;const cache=`${kind}:${type??""}:${text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}`;if(resolved.has(cache))return resolved.get(cache)??null;const {data,error}=await supabase.rpc("financeiro_resolver_nome",{p_tipo:kind,p_nome:text,p_mov_tipo:type??null});if(error)throw error;const result=data as {id?:string|null};const id=result.id??null;resolved.set(cache,id);return id;}
  for(const [index,row] of source.entries()){
    try{
      const id=String(row.id_externo??"").trim();if(!id)throw new Error("id_externo obrigatório.");if(ids.has(id))throw new Error("id_externo repetido no arquivo.");ids.add(id);
      const type=String(row.tipo??"").trim();if(!["entrada","saida"].includes(type))throw new Error("Tipo deve ser entrada ou saida.");const status=String(row.status??"").trim();if(!["previsto","realizado","cancelado"].includes(status))throw new Error("Status inválido.");
      const amount=financialImportAmount(row.valor);if(!Number.isFinite(amount)||amount<=0)throw new Error("Valor deve ser positivo.");const description=String(row.descricao??"").trim();if(!description)throw new Error("Descrição obrigatória.");
      const competence=financialImportDate(row.data_competencia);const due=financialImportDate(row.data_vencimento);const paid=financialImportDate(row.data_pagamento);if(!competence)throw new Error("Competência obrigatória.");if(status==="previsto"&&!due)throw new Error("Previsto exige vencimento.");if(status==="realizado"&&!paid)throw new Error("Realizado exige pagamento.");
      const account=await resolve("conta",row.conta_nome);if(status==="realizado"&&!account)throw new Error("Conta não encontrada para o realizado.");
      let category=await resolve("categoria",row.categoria_nome,type);let needsReview=!category||Boolean(row.conta_nome&&!account);if(!category)category=await resolve("categoria","A classificar",type);
      const payload:Record<string,unknown>={id_externo:id,origem:"importacao",tipo:type,status,descricao:description,valor:amount,data_movimentacao:competence,data_vencimento:due,data_pagamento:paid,conta_id:account,categoria_id:category};
      for(const [column,kind,target] of [["cliente_nome","cliente","cliente_id"],["fornecedor_nome","fornecedor","fornecedor_id"],["colaborador_nome","colaborador","colaborador_id"],["projeto_titulo","projeto","projeto_id"]]){const link=await resolve(kind,row[column]);payload[target]=link;if(row[column]&&!link)needsReview=true;}
      const payment=String(row.forma_pagamento??"").trim();if(payment&&!["pix","boleto","transferencia","cartao","dinheiro","debito_automatico","outro"].includes(payment))throw new Error("Forma de pagamento inválida.");payload.forma_pagamento=payment||null;payload.documento=row.documento||null;payload.observacoes=row.observacoes||null;payload.revisar=needsReview;if(needsReview)review++;
      if(status==="cancelado"&&!String(row.observacoes??"").trim())throw new Error("Cancelado exige motivo nas observações.");
      rows.push(payload);const month=(status==="realizado"?paid:due)?.slice(0,7)??competence.slice(0,7),name=String(row.conta_nome??"Sem conta");const key=`${month}:${name}`;const sum=sums.get(key)??{month,account:name,income:0,expense:0};if(status!=="cancelado"){if(type==="entrada")sum.income+=amount;else sum.expense+=amount;}sums.set(key,sum);
    }catch(error){errors.push({line:index+2,message:error instanceof Error?error.message:"Linha inválida."});}
  }
  return {rows,errors,review,summary:[...sums.values()],total:source.length};
}
export async function commitCashImport(preview:CashImportPreview){if(preview.errors.length)throw new Error("Corrija os erros antes de importar.");const {data,error}=await supabase.rpc("financeiro_importar",{p_linhas:preview.rows as Json,p_confirmado:true});if(error)throw error;return data;}