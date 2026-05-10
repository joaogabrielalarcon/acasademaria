import { useState } from "react";
import { Phone, MessageCircle, Mail, MapPin, Copy, Info, Loader2, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  fornecedorId: string;
  nome?: string;
  itemId?: string;
  itemTipo?: "planta" | "insumo";
  onAvaliacaoSalva?: () => void;
}

export function FornecedorPopover({ fornecedorId, nome, itemId, itemTipo, onAvaliacaoSalva }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["fornecedor-detalhe", fornecedorId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fornecedores")
        .select("id, nome, telefone, whatsapp, email, cidade, estado, mercado, categoria_fornecedor, observacoes")
        .eq("id", fornecedorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const copiar = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} copiado` });
  };

  const cleanPhone = (p?: string | null) => (p || "").replace(/\D/g, "");
  const wa = cleanPhone(data?.whatsapp || data?.telefone);

  const salvarAvaliacao = async () => {
    if (!nota || !itemId || !itemTipo) return;
    setSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("fornecedor_avaliacoes").insert({
        fornecedor_id: fornecedorId,
        item_id: itemId,
        item_tipo: itemTipo,
        nota,
        comentario: comentario || null,
        criado_por: auth?.user?.id || null,
      });
      if (error) throw error;
      toast({ title: "Avaliação registrada" });
      setNota(0);
      setComentario("");
      onAvaliacaoSalva?.();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver dados do fornecedor">
          <Info className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2 max-h-[80vh] overflow-y-auto" side="top">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : !data ? (
          <p className="text-xs text-muted-foreground">Fornecedor não encontrado</p>
        ) : (
          <>
            <div>
              <p className="font-semibold text-sm">{data.nome}</p>
              {(data.mercado || data.categoria_fornecedor) && (
                <p className="text-[11px] text-muted-foreground">
                  {[data.mercado, data.categoria_fornecedor].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {data.telefone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1">{data.telefone}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copiar(data.telefone, "Telefone")}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}

            {data.whatsapp && data.whatsapp !== data.telefone && (
              <div className="flex items-center gap-2 text-xs">
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1">{data.whatsapp}</span>
              </div>
            )}

            {data.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{data.email}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copiar(data.email, "Email")}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}

            {(data.cidade || data.estado) && (
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{[data.cidade, data.estado].filter(Boolean).join(" / ")}</span>
              </div>
            )}

            {data.observacoes && (
              <p className="text-[11px] text-muted-foreground border-t pt-2 whitespace-pre-wrap">{data.observacoes}</p>
            )}

            {wa && (
              <Button
                variant="terracota"
                size="sm"
                className="w-full mt-1"
                onClick={() => window.open(`https://wa.me/55${wa}`, "_blank")}
              >
                <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
              </Button>
            )}

            {itemId && itemTipo && (
              <div className="border-t pt-2 mt-1 space-y-2">
                <p className="text-[11px] font-medium text-foreground">Avaliar fornecedor para este item</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNota(n === nota ? 0 : n)}
                      className="p-0.5"
                      title={`${n} estrela${n > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={cn(
                          "w-5 h-5 transition-colors",
                          n <= nota ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40",
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Comentário (opcional)"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="text-xs min-h-[50px]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!nota || salvando}
                  onClick={salvarAvaliacao}
                >
                  {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar avaliação"}
                </Button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
