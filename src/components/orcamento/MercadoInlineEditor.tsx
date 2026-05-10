import { useMemo, useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// "flor" / "FLOR DE LARANJEIRA" -> "Flor De Laranjeira"
function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface Props {
  fornecedorId: string;
  fornecedorNome: string;
  valorAtual?: string | null;
  sugestoes: string[]; // mercados já cadastrados
  onSaved?: (novoValor: string) => void;
}

export function MercadoInlineEditor({
  fornecedorId,
  fornecedorNome,
  valorAtual,
  sugestoes,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(valorAtual || "");
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValor(valorAtual || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, valorAtual]);

  const sugestoesUnicas = useMemo(() => {
    const set = new Map<string, string>();
    for (const s of sugestoes) {
      const fmt = toTitleCase(s || "");
      if (fmt) set.set(fmt.toLowerCase(), fmt);
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [sugestoes]);

  const filtradas = useMemo(() => {
    const q = valor.trim().toLowerCase();
    if (!q) return sugestoesUnicas.slice(0, 8);
    return sugestoesUnicas.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [valor, sugestoesUnicas]);

  const salvar = async (raw?: string) => {
    const finalValor = toTitleCase(raw ?? valor);
    if (!finalValor) {
      toast({ title: "Informe o mercado", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const { error } = await (supabase as any)
        .from("fornecedores")
        .update({ mercado: finalValor })
        .eq("id", fornecedorId);
      if (error) throw error;
      toast({ title: "Mercado atualizado", description: `${fornecedorNome}: ${finalValor}` });
      onSaved?.(finalValor);
      // invalida caches relacionados
      qc.invalidateQueries({ queryKey: ["fornecedores-ativos-lista"] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      qc.invalidateQueries({ queryKey: ["historico-fornecedores"] });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const possuiValor = !!(valorAtual && valorAtual.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer",
            possuiValor
              ? "bg-secondary text-secondary-foreground border-transparent hover:border-primary/40"
              : "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/25",
          )}
          title={possuiValor ? "Editar mercado" : "Definir mercado"}
        >
          {possuiValor ? (
            <>
              <Store className="w-3 h-3" /> {valorAtual}
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" /> sem mercado
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Mercado / central de <strong className="text-foreground">{fornecedorNome}</strong>
          </div>
          <Input
            ref={inputRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex.: Ceasa, Holambra, Veiling…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                salvar();
              }
            }}
          />
          {filtradas.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {filtradas.map((s) => (
                <button
                  type="button"
                  key={s}
                  className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted flex items-center justify-between"
                  onClick={() => {
                    setValor(s);
                    salvar(s);
                  }}
                >
                  <span>{s}</span>
                  {toTitleCase(valor) === s && <Check className="w-3 h-3 text-primary" />}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-muted-foreground">
              Atualiza o cadastro do fornecedor
            </span>
            <Button size="sm" onClick={() => salvar()} disabled={salvando || !valor.trim()}>
              {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
