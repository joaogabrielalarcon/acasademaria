import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface ResumoItem {
  fornecedor_id: string;
  nome_popular: string;
  nome_cientifico?: string | null;
  porte?: string;
  unidade?: string;
  quantidade?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itens: ResumoItem[];
}

const MENSAGEM_PADRAO =
  "Olá! Por favor, poderia atualizar os valores das plantas/itens abaixo? Precisamos para fechar um orçamento. Obrigado! — MFM Paisagismo";

function montaTabela(itens: ResumoItem[]) {
  const header = "Nome popular | Nome científico | Porte | Qtd | Unid";
  const sep = "---|---|---|---|---";
  const linhas = itens.map(
    (i) =>
      `${i.nome_popular || "-"} | ${i.nome_cientifico || "-"} | ${i.porte || "-"} | ${i.quantidade ?? "-"} | ${i.unidade || "-"}`,
  );
  return [header, sep, ...linhas].join("\n");
}

export function ResumoFornecedoresDialog({ open, onOpenChange, itens }: Props) {
  const { toast } = useToast();
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [copiados, setCopiados] = useState<Record<string, boolean>>({});

  const fornecedorIds = useMemo(
    () => Array.from(new Set(itens.map((i) => i.fornecedor_id).filter(Boolean))),
    [itens],
  );

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-resumo", fornecedorIds],
    enabled: open && fornecedorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fornecedores")
        .select("id, nome, telefone, whatsapp")
        .in("id", fornecedorIds);
      if (error) throw error;
      return data || [];
    },
  });

  const grupos = useMemo(() => {
    const map: Record<string, ResumoItem[]> = {};
    itens.forEach((i) => {
      if (!map[i.fornecedor_id]) map[i.fornecedor_id] = [];
      map[i.fornecedor_id].push(i);
    });
    return map;
  }, [itens]);

  const copiar = (fid: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiados((p) => ({ ...p, [fid]: true }));
    setTimeout(() => setCopiados((p) => ({ ...p, [fid]: false })), 2000);
    toast({ title: "Copiado para a área de transferência" });
  };

  const abrirWhats = (fid: string, texto: string) => {
    const f: any = fornecedores.find((x: any) => x.id === fid);
    const tel = (f?.whatsapp || f?.telefone || "").replace(/\D/g, "");
    const url = tel
      ? `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo para fornecedores</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Mensagem padrão (editável)</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          {Object.keys(grupos).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum fornecedor selecionado ainda. Volte e selecione fornecedores na Etapa 3.
            </p>
          )}

          {Object.entries(grupos).map(([fid, lista]) => {
            const f: any = fornecedores.find((x: any) => x.id === fid);
            const tabela = montaTabela(lista);
            const textoCompleto = `${mensagem}\n\n${tabela}`;
            return (
              <Card key={fid} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{f?.nome || "Fornecedor"}</p>
                  <span className="text-xs text-muted-foreground">{lista.length} {lista.length === 1 ? "item" : "itens"}</span>
                </div>

                <pre className="text-[11px] bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre">{tabela}</pre>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copiar(fid, textoCompleto)}>
                    {copiados[fid] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar mensagem + tabela
                  </Button>
                  <Button size="sm" variant="terracota" onClick={() => abrirWhats(fid, textoCompleto)}>
                    <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
