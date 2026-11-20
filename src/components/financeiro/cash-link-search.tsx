import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchCashLinks,type LinkKind } from "@/services/caixa";

export function CashLinkSearch({ kind,value,onChange }: {kind:LinkKind;value:string;onChange:(id:string)=>void}){
  const [search,setSearch]=useState("");const [picked,setPicked]=useState("");
  const query=useQuery({queryKey:["cash-links",kind,search],queryFn:()=>searchCashLinks(kind,search),enabled:search.trim().length>=2,staleTime:60000});
  return <div className="space-y-1"><Input aria-label={`Buscar ${kind}`} placeholder={picked||"Buscar pelo nome"} value={search} onChange={(e)=>setSearch(e.target.value)}/>{value&&<Button type="button" variant="ghost" size="sm" onClick={()=>{onChange("");setPicked("");setSearch("");}}>Remover vínculo</Button>}{query.isFetching&&<p className="text-xs text-muted-foreground">Buscando...</p>}{query.error&&<p role="alert" className="text-xs text-destructive">Não foi possível buscar.</p>}{search.length>=2&&query.data?.map((row)=><Button type="button" key={row.id} variant="ghost" className="h-11 w-full justify-start truncate" onClick={()=>{onChange(row.id);setPicked(row.name);setSearch("");}}>{row.name}</Button>)}</div>;
}