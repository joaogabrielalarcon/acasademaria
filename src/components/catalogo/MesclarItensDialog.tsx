import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Crown, AlertTriangle, GitMerge } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPorteMetros } from "@/lib/porte";

export type ItemFusivel = {
  id: string;
  // identificadores principais
  nome: string;
  nome_secundario?: string | null; // científico (planta) ou descrição
  porte_label?: string | null; // texto formatado de porte (planta)
  altura_m?: number | null;
  fornecedor_id: string | null;
  fornecedor_nome?: string | null;
  preco_unitario?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tipo: "planta" | "insumo";
  principal: ItemFusivel;
  // todos os itens disponíveis (já carregados pela página) para selecionar duplicados
  candidatos: ItemFusivel[];
  onMerged?: () => void;
}

export function MesclarItensDialog({ open, onOpenChange, tipo, principal, candidatos, onMerged }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [confirmar, setConfirmar] = useState(false);

  const merge = useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const fn = tipo === "planta" ? "merge_plantas" : "merge_insumos";
      const { data, error } = await supabase.rpc(fn as any, {
        p_principal_id: principal.id,
        p_duplicado_ids: ids,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [tipo === "planta" ? "plantas" : "insumos"] });
      qc.invalidateQueries({ queryKey: ["historico-precos"] });
      toast.success(`${data?.mesclados ?? 0} ${tipo === "planta" ? "planta(s)" : "insumo(s)"} mesclado(s)!`);
      setSelecionados({});
      setSearch("");
      setConfirmar(false);
      onOpenChange(false);
      onMerged?.();
    },
    onError: (e: any) => toast.error("Erro ao mesclar: " + (e?.message ?? "")),
  });

  const lista = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidatos
      .filter((c) => c.id !== principal.id)
      .filter((c) => {
        if (!term) return true;
        return (
          c.nome.toLowerCase().includes(term) ||
          (c.nome_secundario?.toLowerCase().includes(term) ?? false) ||
          (c.fornecedor_nome?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 100);
  }, [candidatos, search, principal.id]);

  const idsSelecionados = Object.keys(selecionados).filter((k) => selecionados[k]);
  const selecionadosObjs = useMemo(
    () => candidatos.filter((c) => idsSelecionados.includes(c.id)),
    [idsSelecionados, candidatos]
  );

  // Validação visual: alerta divergências
  const alertas = useMemo(() => {
    const out: string[] = [];
    for (const s of selecionadosObjs) {
      if (s.fornecedor_id && principal.fornecedor_id && s.fornecedor_id !== principal.fornecedor_id) {
        out.push(`"${s.nome}" tem fornecedor diferente (${s.fornecedor_nome ?? "?"}).`);
      }
      if (tipo === "planta" && s.altura_m != null && principal.altura_m != null) {
        if (Math.abs(Number(s.altura_m) - Number(principal.altura_m)) > 0.01) {
          out.push(`"${s.nome}" tem porte diferente (${formatPorteMetros(s.altura_m)} vs ${formatPorteMetros(principal.altura_m)}).`);
        }
      }
    }
    return out;
  }, [selecionadosObjs, principal, tipo]);

  const tituloEntidade = tipo === "planta" ? "plantas" : "insumos";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelecionados({}); setSearch(""); } onOpenChange(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5" /> Mesclar {tituloEntidade} em "{principal.nome}"
            </DialogTitle>
            <DialogDescription>
              Selecione os {tituloEntidade} duplicados que devem ser unificados em <strong>{principal.nome}</strong>.
              Todas as referências (orçamentos, memorial, estoque, recebimentos, diário) serão reapontadas.
              Os preços anteriores entram no histórico e o mais recente vira o atual. Nada é descartado.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
            <Crown className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>{principal.nome}</strong>
              {principal.nome_secundario && <span className="italic text-muted-foreground"> · {principal.nome_secundario}</span>}
              <div className="text-xs text-muted-foreground mt-0.5">
                {[
                  principal.fornecedor_nome,
                  tipo === "planta" ? formatPorteMetros(principal.altura_m) : null,
                  principal.preco_unitario != null ? `R$ ${Number(principal.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null,
                ].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, científico ou fornecedor..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10" autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y">
            {lista.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum item encontrado</div>
            ) : (
              lista.map((c) => {
                const checked = !!selecionados[c.id];
                const fornecedorDiff = c.fornecedor_id && principal.fornecedor_id && c.fornecedor_id !== principal.fornecedor_id;
                const porteDiff = tipo === "planta" && c.altura_m != null && principal.altura_m != null
                  && Math.abs(Number(c.altura_m) - Number(principal.altura_m)) > 0.01;
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 transition ${checked ? "bg-primary/5" : ""}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => setSelecionados((p) => ({ ...p, [c.id]: !!v }))}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.nome}</span>
                        {c.nome_secundario && <span className="italic text-xs text-muted-foreground">{c.nome_secundario}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                        {c.fornecedor_nome && (
                          <span className={fornecedorDiff ? "text-amber-700 font-medium" : ""}>
                            {fornecedorDiff && "⚠ "}{c.fornecedor_nome}
                          </span>
                        )}
                        {tipo === "planta" && (
                          <span className={porteDiff ? "text-amber-700 font-medium" : ""}>
                            {porteDiff && "⚠ "}{formatPorteMetros(c.altura_m)}
                          </span>
                        )}
                        {c.preco_unitario != null && (
                          <span>R$ {Number(c.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {alertas.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 p-3 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Atenção
              </div>
              {alertas.map((a, i) => <div key={i}>· {a}</div>)}
              <div className="pt-1">Confirme manualmente que os itens são realmente o mesmo.</div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="text-sm text-muted-foreground mr-auto">
              {idsSelecionados.length > 0
                ? `${idsSelecionados.length} item(ns) selecionado(s)`
                : "Nenhum selecionado"}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => setConfirmar(true)} disabled={idsSelecionados.length === 0 || merge.isPending}>
              Mesclar {idsSelecionados.length > 0 ? `${idsSelecionados.length} em 1` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Confirmar mesclagem?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {idsSelecionados.length} {tituloEntidade} serão unificados em <strong>{principal.nome}</strong>.
              Os preços viram histórico (o mais recente passa a ser o atual) e todas as referências serão
              reapontadas. Os duplicados ficam inativos e arquivados — não são excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merge.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => merge.mutate({ ids: idsSelecionados })} disabled={merge.isPending}>
              {merge.isPending ? "Mesclando..." : "Confirmar mesclagem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
