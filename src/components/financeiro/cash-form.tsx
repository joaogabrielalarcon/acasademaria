import { useEffect,useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { searchFinancialAccounts,searchFinancialCategories } from "@/services/financeiro-catalogos";
import { operateCash,cashToday,type CashRow,type LinkKind } from "@/services/caixa";
import { uploadFinancialReceipt } from "@/services/financeiro-comprovantes";
import { CashLinkSearch } from "./cash-link-search";
import { toast } from "sonner";

export function CashForm({ open,onClose,onSaved,row,mode="create" }: {open:boolean;onClose:()=>void;onSaved:()=>void;row?:CashRow;mode?:"create"|"edit"|"duplicate"|"transfer"}){
  const [form,setForm]=useState<Record<string,string>>({});const [paid,setPaid]=useState(false);const [type,setType]=useState<"entrada"|"saida">("saida");const [categorySearch,setCategorySearch]=useState("");const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [linkKind,setLinkKind]=useState<LinkKind>("projetos");
  useEffect(()=>{if(!open)return;setForm({valor:row?String(row.valor):"",descricao:row?.descricao??"",data_movimentacao:row?.data_movimentacao??cashToday(),data_vencimento:row?.data_vencimento??"",data_pagamento:row?.data_pagamento??cashToday(),conta_id:row?.conta_id??"",categoria_id:row?.categoria_id??"",forma_pagamento:row?.forma_pagamento??"",documento:row?.documento??"",observacoes:row?.observacoes??"",projeto_id:row?.projeto_id??"",cliente_id:row?.cliente_id??"",colaborador_id:row?.colaborador_id??"",fornecedor_id:row?.fornecedor_id??"",area_id:row?.area_id??"",meses:"",escopo:"esta"});setPaid(row?.status==="realizado"||mode==="transfer");setType(row?.tipo==="entrada"?"entrada":"saida");setFile(null);},[open,row,mode]);
  const accounts=useQuery({queryKey:["cash-accounts"],queryFn:()=>searchFinancialAccounts(""),enabled:open});
  const categories=useQuery({queryKey:["cash-categories",type,categorySearch],queryFn:()=>searchFinancialCategories(categorySearch,type),enabled:open});
  const set=(key:string,value:string)=>setForm((f)=>({...f,[key]:value}));
  const field=(key:string,title:string,inputType="text")=><div className="space-y-1"><Label htmlFor={`cash-${key}`}>{title}</Label><Input id={`cash-${key}`} type={inputType} value={form[key]??""} onChange={(e)=>set(key,e.target.value)}/></div>;
  const select=(key:string,title:string,options:Array<{id:string;nome:string}>)=><div className="space-y-1"><Label>{title}</Label><Select value={form[key]||undefined} onValueChange={(value)=>set(key,value)}><SelectTrigger aria-label={title}><SelectValue placeholder="Selecionar"/></SelectTrigger><SelectContent>{options.map((r)=><SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent></Select></div>;
  async function save(event:React.FormEvent){event.preventDefault();const amount=Number((form.valor??"").replace(",","."));if(!Number.isFinite(amount)||amount<=0){toast.error("Informe um valor positivo.");return;}if(!form.descricao?.trim()){toast.error("Informe uma descrição.");return;}if(paid&&(!form.data_pagamento||!form.conta_id)){toast.error("Informe pagamento e conta.");return;}if(!paid&&!form.data_vencimento){toast.error("Informe o vencimento.");return;}if(mode!=="transfer"&&!form.categoria_id){toast.error("Escolha a categoria.");return;}setBusy(true);try{
    const payload:Record<string,unknown>={tipo:type,valor:amount,descricao:form.descricao,status:paid?"realizado":"previsto",data_movimentacao:form.data_movimentacao,data_pagamento:paid?form.data_pagamento:null,data_vencimento:form.data_vencimento||null,conta_id:form.conta_id||null,categoria_id:form.categoria_id||null,origem:"manual"};
    for(const key of ["forma_pagamento","documento","observacoes","projeto_id","cliente_id","colaborador_id","fornecedor_id","area_id"])payload[key]=form[key]||null;
    if(file)payload.comprovante_path=await uploadFinancialReceipt(file);else if(mode==="edit")payload.comprovante_path=row?.comprovante_path??null;
    if(mode==="edit"&&row){payload.id=row.id;payload.escopo=form.escopo;}
    const action=mode==="transfer"?"transferencia":mode!=="edit"&&form.meses?"recorrencia":"salvar";
    if(action==="transferencia")payload.conta_destino_id=form.conta_destino_id;
    if(action==="recorrencia")payload.meses=Number(form.meses);
    await operateCash(action,payload);toast.success("Lançamento salvo.");onSaved();onClose();
  }catch(error){toast.error(error instanceof Error?error.message:"Não foi possível salvar.");}finally{setBusy(false);}}
  return <Dialog open={open} onOpenChange={(value)=>{if(!value&&!busy)onClose();}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{mode==="transfer"?"Transferir entre contas":mode==="edit"?"Editar lançamento":mode==="duplicate"?"Duplicar lançamento":"Novo lançamento"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={save}>
    {mode!=="transfer"&&<div className="flex gap-2"><Button type="button" variant={type==="entrada"?"default":"outline"} onClick={()=>{setType("entrada");set("categoria_id","");}}>Entrada</Button><Button type="button" variant={type==="saida"?"default":"outline"} onClick={()=>{setType("saida");set("categoria_id","");}}>Saída</Button></div>}
    {field("valor","Valor (R$)","number")}{field("descricao","Descrição")}
    <label className="flex min-h-11 items-center gap-3"><Checkbox checked={paid} onCheckedChange={(v)=>setPaid(v===true)}/>Já foi pago?</label>
    {paid?<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{field("data_pagamento","Data de pagamento","date")}{select("conta_id",mode==="transfer"?"Conta de origem":"Conta",accounts.data??[])}</div>:field("data_vencimento","Vencimento","date")}
    {!paid&&mode==="transfer"&&select("conta_id","Conta de origem",accounts.data??[])}
    {mode==="transfer"?select("conta_destino_id","Conta de destino",accounts.data??[]):<div className="space-y-2"><Label>Categoria</Label><Input aria-label="Buscar categoria" placeholder="Buscar categoria" value={categorySearch} onChange={(e)=>setCategorySearch(e.target.value)}/>{select("categoria_id","Categoria selecionada",categories.data??[])}</div>}
    <div className="space-y-2"><Label>Vínculo opcional</Label><Select value={linkKind} onValueChange={(v)=>setLinkKind(v as LinkKind)}><SelectTrigger aria-label="Tipo de vínculo"><SelectValue/></SelectTrigger><SelectContent>{["projetos","clientes","colaboradores","fornecedores"].map((kind)=><SelectItem value={kind} key={kind}>{kind.charAt(0).toUpperCase()+kind.slice(1)}</SelectItem>)}</SelectContent></Select><CashLinkSearch kind={linkKind} value={form[`${linkKind==="projetos"?"projeto":linkKind==="clientes"?"cliente":linkKind==="colaboradores"?"colaborador":"fornecedor"}_id`]??""} onChange={(id)=>set(`${linkKind==="projetos"?"projeto":linkKind==="clientes"?"cliente":linkKind==="colaboradores"?"colaborador":"fornecedor"}_id`,id)}/></div>
    <Label>Área</Label><CashLinkSearch kind="areas" value={form.area_id??""} onChange={(id)=>set("area_id",id)}/>
    {select("forma_pagamento","Forma de pagamento",["pix","boleto","transferencia","cartao","dinheiro","debito_automatico","outro"].map((id)=>({id,nome:{pix:"Pix",boleto:"Boleto",transferencia:"Transferência",cartao:"Cartão",dinheiro:"Dinheiro",debito_automatico:"Débito automático",outro:"Outro"}[id]??id})))}
    {field("documento","Documento")}{field("data_movimentacao","Competência","date")}
    <div className="space-y-1"><Label htmlFor="cash-receipt">Comprovante</Label><Input id="cash-receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e)=>setFile(e.target.files?.[0]??null)}/></div>
    {!paid&&mode!=="edit"&&mode!=="transfer"&&field("meses","Repetir todo mês por quantos meses?","number")}
    {row?.recorrencia_id&&mode==="edit"&&select("escopo","Aplicar alteração",[{id:"esta",nome:"Só esta"},{id:"proximas",nome:"Esta e as próximas"}])}
    <Label htmlFor="cash-notes">Observações</Label><Textarea id="cash-notes" value={form.observacoes??""} onChange={(e)=>set("observacoes",e.target.value)}/>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Voltar</Button><Button type="submit" disabled={busy}>{busy?"Salvando...":"Confirmar lançamento"}</Button></div>
  </form></DialogContent></Dialog>;
}