import { useMemo, useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Check, Loader2, Store, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function parseMercados(raw?: string | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|]/)
    .map((s) => toTitleCase(s))
    .filter((s) => !!s);
}

function joinMercados(arr: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr.map((x) => toTitleCase(x))) {
    const key = v.toLowerCase();
    if (v && !seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out.join(", ");
}

interface Props {
  fornecedorId: string;
  fornecedorNome: string;
  valorAtual?: string | null;
  sugestoes: string[]; // mercados já cadastrados (cada item pode ser "A, B")
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
  const [selecionados, setSelecionados] = useState<string[]>(parseMercados(valorAtual));
  const [draft, setDraft] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Estado local imediato para refletir mudança antes do refetch
  const [valorLocal, setValorLocal] = useState<string | null>(valorAtual ?? null);
  const [confirmarNovo, setConfirmarNovo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValorLocal(valorAtual ?? null);
  }, [valorAtual]);

  useEffect(() => {
    if (open) {
      setSelecionados(parseMercados(valorLocal));
      setDraft("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, valorLocal]);

  const sugestoesUnicas = useMemo(() => {
    const set = new Map<string, string>();
    for (const raw of sugestoes) {
      for (const v of parseMercados(raw)) {
        set.set(v.toLowerCase(), v);
      }
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [sugestoes]);

  const filtradas = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const selSet = new Set(selecionados.map((s) => s.toLowerCase()));
    const base = sugestoesUnicas.filter((s) => !selSet.has(s.toLowerCase()));
    if (!q) return base.slice(0, 8);
    return base.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [draft, sugestoesUnicas, selecionados]);

  const adicionarDireto = (raw: string) => {
    const v = toTitleCase(raw);
    if (!v) return;
    setSelecionados((prev) => (prev.some((p) => p.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
    setDraft("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const adicionar = (raw: string) => {
    const v = toTitleCase(raw);
    if (!v) return;
    const existe = sugestoesUnicas.some((s) => s.toLowerCase() === v.toLowerCase());
    if (!existe) {
      setConfirmarNovo(v);
      return;
    }
    adicionarDireto(v);
  };

  const remover = (v: string) => {
    setSelecionados((prev) => prev.filter((p) => p.toLowerCase() !== v.toLowerCase()));
  };

  const salvar = async () => {
    const finalStr = joinMercados(selecionados);
    setSalvando(true);
    try {
      const { error } = await (supabase as any).rpc("set_fornecedor_mercado", {
        p_fornecedor_id: fornecedorId,
        p_mercado: finalStr || null,
      });
      if (error) throw error;
      // atualização imediata local
      setValorLocal(finalStr || null);
      onSaved?.(finalStr);
      toast({ title: "Mercado atualizado", description: `${fornecedorNome}: ${finalStr || "(sem mercado)"}` });
      // invalida caches relacionados
      qc.invalidateQueries({ queryKey: ["fornecedores-ativos-lista"] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      qc.invalidateQueries({ queryKey: ["fornecedores-todos"] });
      qc.invalidateQueries({ queryKey: ["historico-fornecedores"] });
      qc.invalidateQueries({ queryKey: ["historico-fornecedores-orc"] });
      qc.invalidateQueries({ queryKey: ["orcamento-hidratacao"] });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const mercadosAtuais = parseMercados(valorLocal);
  const possuiValor = mercadosAtuais.length > 0;

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 flex-wrap text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer max-w-full",
            possuiValor
              ? "bg-secondary text-secondary-foreground border-transparent hover:border-primary/40"
              : "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/25",
          )}
          title={possuiValor ? "Editar mercados" : "Definir mercado"}
        >
          {possuiValor ? (
            <>
              <Store className="w-3 h-3 shrink-0" />
              <span className="truncate">{mercadosAtuais.join(", ")}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" /> sem mercado
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Mercados de <strong className="text-foreground">{fornecedorNome}</strong>
            <span className="block text-[10px] mt-0.5">Pode pertencer a mais de um.</span>
          </div>

          {selecionados.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selecionados.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/30"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => remover(s)}
                    className="hover:text-destructive"
                    aria-label={`Remover ${s}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex.: Ceasa, Holambra…"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draft.trim()) adicionar(draft);
                  else salvar();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={() => draft.trim() && adicionar(draft)}
              disabled={!draft.trim()}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {filtradas.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {filtradas.map((s) => (
                <button
                  type="button"
                  key={s}
                  className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted flex items-center justify-between"
                  onClick={() => adicionar(s)}
                >
                  <span>{s}</span>
                  <Check className="w-3 h-3 text-muted-foreground opacity-0" />
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-1 gap-2">
            <span className="text-[10px] text-muted-foreground">
              Atualiza o cadastro do fornecedor
            </span>
            <Button size="sm" onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <AlertDialog open={!!confirmarNovo} onOpenChange={(o) => !o && setConfirmarNovo(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Criar novo mercado?</AlertDialogTitle>
          <AlertDialogDescription>
            O mercado <strong>"{confirmarNovo}"</strong> ainda não existe na base. Deseja criá-lo agora? Ele ficará disponível para todos os fornecedores a partir de então.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirmarNovo) adicionarDireto(confirmarNovo);
              setConfirmarNovo(null);
            }}
          >
            Sim, criar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
