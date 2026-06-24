import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcularDePara, type SnapshotMinimo } from "./versaoDiff";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orcamentoId: string;
  codigo: string;
}

interface VersaoRow {
  id: string;
  created_at: string;
  versao_sufixo: string | null;
  comentario_final: string | null;
  comentario_humano: string | null;
  de_para: any;
  totais: any;
  snapshot_id: string | null;
}

const fmtBRL = (v: any) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function VersoesDialog({ open, onOpenChange, orcamentoId, codigo }: Props) {
  const [loading, setLoading] = useState(false);
  const [versoes, setVersoes] = useState<VersaoRow[]>([]);
  const [snapshotsById, setSnapshotsById] = useState<Record<string, SnapshotMinimo>>({});
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !orcamentoId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: vs } = await (supabase as any)
          .from("orcamento_versoes")
          .select("id, created_at, versao_sufixo, comentario_final, comentario_humano, de_para, totais, snapshot_id")
          .eq("orcamento_id", orcamentoId)
          .order("created_at", { ascending: true });
        const list = (vs || []) as VersaoRow[];
        setVersoes(list);

        const ids = list.map((v) => v.snapshot_id).filter(Boolean) as string[];
        if (ids.length > 0) {
          const { data: snaps } = await (supabase as any)
            .from("orcamento_snapshots")
            .select("id, snapshot")
            .in("id", ids);
          const map: Record<string, SnapshotMinimo> = {};
          (snaps || []).forEach((s: any) => (map[s.id] = s.snapshot));
          setSnapshotsById(map);
        } else {
          setSnapshotsById({});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orcamentoId]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return versoes;
    return versoes.filter(
      (v) =>
        (v.versao_sufixo || "").toLowerCase().includes(q) ||
        (v.comentario_final || "").toLowerCase().includes(q) ||
        (v.comentario_humano || "").toLowerCase().includes(q) ||
        fmtData(v.created_at).toLowerCase().includes(q),
    );
  }, [versoes, busca]);

  const versaoAtiva = useMemo(
    () => versoes.find((v) => v.id === selecionada) || null,
    [versoes, selecionada],
  );
  // Diff vs versão imediatamente anterior (recalculado se snapshots estiverem disponíveis)
  const diff = useMemo(() => {
    if (!versaoAtiva) return null;
    const idxA = versoes.findIndex((v) => v.id === versaoAtiva.id);
    const ant = idxA > 0 ? versoes[idxA - 1] : null;
    const snapAtu = versaoAtiva.snapshot_id ? snapshotsById[versaoAtiva.snapshot_id] : null;
    const snapAnt = ant?.snapshot_id ? snapshotsById[ant.snapshot_id] : null;
    if (snapAtu) return calcularDePara(snapAnt || null, snapAtu);
    // fallback: usa o de_para já gravado
    return versaoAtiva.de_para || null;
  }, [versaoAtiva, versoes, snapshotsById]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" /> Histórico de versões — {codigo}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por sufixo, comentário ou data..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 overflow-hidden flex-1">
            {/* Lista */}
            <div className="border rounded-md divide-y overflow-y-auto max-h-[60vh]">
              {filtradas.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Nenhuma versão registrada.</div>
              ) : (
                filtradas.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelecionada(v.id)}
                    className={`w-full text-left p-2 hover:bg-muted/40 ${
                      selecionada === v.id ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="font-semibold text-sm">
                      {codigo}
                      <span className="text-primary">{v.versao_sufixo || ""}</span>
                      {!v.versao_sufixo && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(1ª versão)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{fmtData(v.created_at)}</div>
                    {v.comentario_final && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {v.comentario_final}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Detalhe */}
            <div className="border rounded-md p-3 overflow-y-auto max-h-[60vh]">
              {!versaoAtiva ? (
                <div className="text-sm text-muted-foreground">
                  Selecione uma versão para ver o comparativo com a versão anterior.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Versão</div>
                    <div className="text-lg font-display">
                      {codigo}
                      <span className="text-primary">{versaoAtiva.versao_sufixo || ""}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{fmtData(versaoAtiva.created_at)}</div>
                  </div>

                  {versaoAtiva.comentario_final && (
                    <div>
                      <div className="text-xs font-semibold text-foreground">Comentário</div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {versaoAtiva.comentario_final}
                      </p>
                    </div>
                  )}

                  {diff && (
                    <>
                      {Array.isArray(diff.financeiro) && diff.financeiro.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-foreground mb-1">
                            Financeiro por categoria
                          </div>
                          <table className="w-full text-xs">
                            <thead className="text-muted-foreground">
                              <tr>
                                <th className="text-left py-1">Categoria</th>
                                <th className="text-right py-1">Anterior</th>
                                <th className="text-right py-1">Atual</th>
                                <th className="text-right py-1">Δ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {diff.financeiro.map((l: any) => (
                                <tr key={l.categoria} className="border-t border-border/50">
                                  <td className="py-1">{l.categoria}</td>
                                  <td className="text-right">{fmtBRL(l.anterior)}</td>
                                  <td className="text-right">{fmtBRL(l.atual)}</td>
                                  <td
                                    className={`text-right ${
                                      l.diff >= 0 ? "text-primary" : "text-destructive"
                                    }`}
                                  >
                                    {l.diff >= 0 ? "+" : ""}
                                    {fmtBRL(l.diff)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {Array.isArray(diff.itens_entraram) && diff.itens_entraram.length > 0 && (
                          <div className="border rounded p-2">
                            <div className="font-semibold mb-1">Entraram</div>
                            <ul className="space-y-0.5">
                              {diff.itens_entraram.map((i: any, idx: number) => (
                                <li key={idx}>
                                  +{i.quantidade} {i.unidade || ""} {i.nome_popular}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(diff.itens_sairam) && diff.itens_sairam.length > 0 && (
                          <div className="border rounded p-2">
                            <div className="font-semibold mb-1">Saíram</div>
                            <ul className="space-y-0.5">
                              {diff.itens_sairam.map((i: any, idx: number) => (
                                <li key={idx}>
                                  -{i.quantidade} {i.unidade || ""} {i.nome_popular}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(diff.itens_quantidade_mudou) &&
                          diff.itens_quantidade_mudou.length > 0 && (
                            <div className="border rounded p-2">
                              <div className="font-semibold mb-1">Quantidade alterada</div>
                              <ul className="space-y-0.5">
                                {diff.itens_quantidade_mudou.map((i: any, idx: number) => (
                                  <li key={idx}>
                                    {i.nome_popular}: {i.qtd_anterior} → {i.qtd_nova} {i.unidade || ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
