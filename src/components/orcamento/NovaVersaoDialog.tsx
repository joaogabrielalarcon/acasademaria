import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calcularDePara, proximoSufixoVersao, type SnapshotMinimo, type DeParaResultado } from "./versaoDiff";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orcamentoId: string;
  codigo: string;
  snapshotAtual: SnapshotMinimo;
  onSalvo?: (sufixoCriado: string) => void;
}

const fmtBRL = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function NovaVersaoDialog({ open, onOpenChange, orcamentoId, codigo, snapshotAtual, onSalvo }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refinando, setRefinando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [comentarioHumano, setComentarioHumano] = useState("");
  const [comentarioFinal, setComentarioFinal] = useState("");
  const [snapshotAnterior, setSnapshotAnterior] = useState<SnapshotMinimo | null>(null);
  const [sufixosExistentes, setSufixosExistentes] = useState<string[]>([]);
  const proximoSufixo = useMemo(() => proximoSufixoVersao(sufixosExistentes), [sufixosExistentes]);
  const dePara: DeParaResultado = useMemo(
    () => calcularDePara(snapshotAnterior, snapshotAtual),
    [snapshotAnterior, snapshotAtual],
  );

  useEffect(() => {
    if (!open || !orcamentoId) return;
    setComentarioHumano("");
    setComentarioFinal("");
    (async () => {
      setLoading(true);
      try {
        const { data: versoes } = await (supabase as any)
          .from("orcamento_versoes")
          .select("versao_sufixo")
          .eq("orcamento_id", orcamentoId);
        setSufixosExistentes((versoes || []).map((v: any) => v.versao_sufixo ?? ""));

        const { data: snaps } = await (supabase as any)
          .from("orcamento_snapshots")
          .select("snapshot, created_at, versao_sufixo")
          .eq("orcamento_id", orcamentoId)
          .order("created_at", { ascending: false })
          .limit(1);
        setSnapshotAnterior(snaps?.[0]?.snapshot || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orcamentoId]);

  const refinarComIA = async () => {
    if (!comentarioHumano.trim()) {
      toast({ title: "Escreva o porquê da mudança", variant: "destructive" });
      return;
    }
    setRefinando(true);
    try {
      const { data, error } = await supabase.functions.invoke("refinar-comentario-versao", {
        body: {
          comentario_humano: comentarioHumano,
          de_para: dePara,
          codigo,
          versao_sufixo: proximoSufixo,
        },
      });
      if (error) throw error;
      const final = (data as any)?.comentario_final?.toString() || comentarioHumano;
      setComentarioFinal(final);
    } catch (e: any) {
      toast({
        title: "Não consegui aperfeiçoar o comentário",
        description: e?.message || "Falha na IA. Você pode salvar o texto original.",
        variant: "destructive",
      });
      setComentarioFinal(comentarioHumano);
    } finally {
      setRefinando(false);
    }
  };

  const salvar = async () => {
    if (!comentarioFinal.trim()) {
      toast({ title: "Valide o comentário final antes de salvar", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;

      const { data: snapIns, error: snapErr } = await (supabase as any)
        .from("orcamento_snapshots")
        .insert({
          orcamento_id: orcamentoId,
          tipo: "versao",
          snapshot: snapshotAtual,
          versao_sufixo: proximoSufixo,
          created_by: uid,
        })
        .select("id")
        .single();
      if (snapErr) throw snapErr;

      const { error: verErr } = await (supabase as any)
        .from("orcamento_versoes")
        .insert({
          orcamento_id: orcamentoId,
          versao_sufixo: proximoSufixo,
          comentario_humano: comentarioHumano,
          comentario_final: comentarioFinal,
          de_para: dePara as any,
          totais: snapshotAtual.totais || null,
          snapshot_id: snapIns?.id || null,
          usuario_id: uid,
        });
      if (verErr) throw verErr;

      // Atualiza o sufixo corrente do orçamento
      await (supabase as any)
        .from("orcamentos")
        .update({ versao_sufixo: proximoSufixo || null })
        .eq("id", orcamentoId);

      toast({ title: `Versão ${codigo}${proximoSufixo} salva` });
      onSalvo?.(proximoSufixo);
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Erro ao salvar versão",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nova versão: {codigo}
            <span className="text-primary font-semibold ml-1">{proximoSufixo || "(primeira versão)"}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* De-para automático */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">O que mudou (de-para automático)</h3>
              {dePara.vazio ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-3">
                  <AlertCircle className="w-4 h-4" />
                  Não detectei mudanças em itens nem em financeiro desde a última versão.
                </div>
              ) : (
                <div className="text-sm border rounded-md p-3 bg-muted/30 space-y-2">
                  {dePara.itens_entraram.length > 0 && (
                    <div>
                      <div className="font-medium text-foreground">Entraram:</div>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {dePara.itens_entraram.map((i, idx) => (
                          <li key={idx}>
                            +{i.quantidade} {i.unidade || ""} de {i.nome_popular}
                            {i.porte ? ` (porte ${i.porte})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dePara.itens_sairam.length > 0 && (
                    <div>
                      <div className="font-medium text-foreground">Saíram:</div>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {dePara.itens_sairam.map((i, idx) => (
                          <li key={idx}>
                            -{i.quantidade} {i.unidade || ""} de {i.nome_popular}
                            {i.porte ? ` (porte ${i.porte})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dePara.itens_quantidade_mudou.length > 0 && (
                    <div>
                      <div className="font-medium text-foreground">Quantidade alterada:</div>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {dePara.itens_quantidade_mudou.map((i, idx) => (
                          <li key={idx}>
                            {i.nome_popular}
                            {i.porte ? ` (porte ${i.porte})` : ""}: {i.qtd_anterior} → {i.qtd_nova} {i.unidade || ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dePara.financeiro.length > 0 && (
                    <div>
                      <div className="font-medium text-foreground">Financeiro por categoria:</div>
                      <table className="w-full text-xs mt-1">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="text-left py-1">Categoria</th>
                            <th className="text-right py-1">Anterior</th>
                            <th className="text-right py-1">Atual</th>
                            <th className="text-right py-1">Δ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dePara.financeiro.map((l) => (
                            <tr key={l.categoria} className="border-t border-border/50">
                              <td className="py-1">{l.categoria}</td>
                              <td className="text-right">{fmtBRL(l.anterior)}</td>
                              <td className="text-right">{fmtBRL(l.atual)}</td>
                              <td className={`text-right ${l.diff >= 0 ? "text-primary" : "text-destructive"}`}>
                                {l.diff >= 0 ? "+" : ""}
                                {fmtBRL(l.diff)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Humano escreve */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Por que mudou? (você escreve)</h3>
              <Textarea
                rows={3}
                value={comentarioHumano}
                onChange={(e) => setComentarioHumano(e.target.value)}
                placeholder="Ex.: cliente pediu para reforçar a entrada com mais palmeiras e tirar o gramado da área de pedras."
              />
              <Button variant="outline" onClick={refinarComIA} disabled={refinando || !comentarioHumano.trim()}>
                {refinando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Aperfeiçoar com IA
              </Button>
            </section>

            {/* IA devolve, humano valida */}
            {comentarioFinal && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Comentário final (você valida / ajusta)</h3>
                <Textarea
                  rows={4}
                  value={comentarioFinal}
                  onChange={(e) => setComentarioFinal(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  A IA padronizou o texto usando o de-para como contexto. Ajuste o que quiser antes de salvar.
                </p>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="terracota" onClick={salvar} disabled={salvando || !comentarioFinal.trim()}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar versão {codigo}
            {proximoSufixo}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
