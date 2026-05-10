import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ItemContexto {
  item_id: string;
  item_tipo: "planta" | "insumo";
  nome_popular: string;
  nome_cientifico?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fornecedorId: string;
  fornecedorNome?: string;
  itens: ItemContexto[]; // contexto: itens que esperamos receber
  onAplicado?: () => void;
}

interface Extracted {
  nome: string;
  preco: number | null;
  porte?: string | null;
  unidade?: string | null;
  data?: string | null;
  match?: ItemContexto | null;
  selecionado: boolean;
}

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export function ImportarRespostaFornecedorDialog({
  open, onOpenChange, fornecedorId, fornecedorNome, itens, onAplicado,
}: Props) {
  const { toast } = useToast();
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Extracted[]>([]);

  const extrair = async () => {
    if (!texto.trim()) {
      toast({ title: "Cole a resposta do fornecedor", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-cotacao-resposta", {
        body: { texto, contexto_itens: itens.map((i) => ({ nome_popular: i.nome_popular, nome_cientifico: i.nome_cientifico })) },
      });
      if (error) throw error;
      const itensExtraidos: Array<any> = data?.itens || [];

      const matched: Extracted[] = itensExtraidos.map((e) => {
        const k = norm(e.nome || "");
        const match = itens.find((i) => norm(i.nome_popular) === k || norm(i.nome_cientifico || "") === k)
          || itens.find((i) => norm(i.nome_popular).includes(k) || k.includes(norm(i.nome_popular)));
        return {
          nome: e.nome || "",
          preco: e.preco != null ? Number(e.preco) : null,
          porte: e.porte || null,
          unidade: e.unidade || null,
          data: e.data || null,
          match: match || null,
          selecionado: !!match && !!e.preco,
        };
      });
      setResultados(matched);
    } catch (e: any) {
      toast({ title: "Erro ao extrair", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const aplicar = async () => {
    const aSalvar = resultados.filter((r) => r.selecionado && r.match && r.preco);
    if (aSalvar.length === 0) {
      toast({ title: "Selecione ao menos um item válido" });
      return;
    }
    setLoading(true);
    try {
      const { data: colab } = await (supabase as any).auth.getUser();
      const { data: colabRow } = await (supabase as any)
        .from("colaboradores").select("id").eq("user_id", colab?.user?.id).maybeSingle();

      const rows = aSalvar.map((r) => ({
        item_id: r.match!.item_id,
        item_tipo: r.match!.item_tipo,
        fornecedor_id: fornecedorId,
        preco: r.preco,
        data_orcamento: r.data ? new Date(r.data).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        porte: r.porte,
        unidade: r.unidade,
        registrado_por: colabRow?.id || null,
        observacoes: "Importado da resposta do fornecedor (IA)",
      }));

      const { error } = await (supabase as any).from("historico_precos").insert(rows);
      if (error) throw error;

      toast({ title: `${rows.length} preço(s) importado(s)` });
      onAplicado?.();
      onOpenChange(false);
      setTexto("");
      setResultados([]);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar resposta — {fornecedorNome || "Fornecedor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Cole abaixo a mensagem do fornecedor (WhatsApp, e-mail, etc.)</Label>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={6}
              placeholder="Ex.: Ipê amarelo 3m R$ 250,00; Pata-de-vaca 2,5m 180,00..."
            />
          </div>

          <Button onClick={extrair} disabled={loading} variant="outline" className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Extrair com IA
          </Button>

          {resultados.length > 0 && (
            <div className="border rounded-md divide-y">
              <div className="p-2 text-xs font-medium bg-muted/50">
                {resultados.length} item(ns) detectado(s)
              </div>
              {resultados.map((r, i) => (
                <div key={i} className="p-2 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.selecionado}
                    disabled={!r.match || !r.preco}
                    onChange={(e) => setResultados((prev) => prev.map((x, j) => j === i ? { ...x, selecionado: e.target.checked } : x))}
                    className="mt-1"
                  />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <p className="font-medium text-xs">{r.nome}</p>
                      {r.match ? (
                        <p className="text-[10px] text-primary flex items-center gap-1"><Check className="w-3 h-3" /> {r.match.nome_popular}</p>
                      ) : (
                        <p className="text-[10px] text-destructive flex items-center gap-1"><X className="w-3 h-3" /> sem match</p>
                      )}
                    </div>
                    <Input
                      type="number"
                      value={r.preco ?? ""}
                      onChange={(e) => setResultados((prev) => prev.map((x, j) => j === i ? { ...x, preco: Number(e.target.value) || null } : x))}
                      placeholder="Preço"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={r.porte || ""}
                      onChange={(e) => setResultados((prev) => prev.map((x, j) => j === i ? { ...x, porte: e.target.value } : x))}
                      placeholder="Porte"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={r.unidade || ""}
                      onChange={(e) => setResultados((prev) => prev.map((x, j) => j === i ? { ...x, unidade: e.target.value } : x))}
                      placeholder="Un"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="terracota" onClick={aplicar} disabled={loading || resultados.length === 0}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Aplicar e salvar histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
