import { useState } from "react";
import { Phone, MessageCircle, Mail, MapPin, Copy, Info, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Props {
  fornecedorId: string;
  nome?: string;
}

export function FornecedorPopover({ fornecedorId, nome }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver dados do fornecedor">
          <Info className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2" side="top">
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
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
