import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, ArrowRight, X, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Lembrete = { id: string; texto: string; feito?: boolean };

const KEY = "lembretes:v1";

function load(): Lembrete[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Lembrete[]) : [];
  } catch {
    return [];
  }
}
function save(list: Lembrete[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function LembretesPostits() {
  const [itens, setItens] = useState<Lembrete[]>([]);
  const [novo, setNovo] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => setItens(load()), []);

  const add = () => {
    const t = novo.trim();
    if (!t) return;
    const next = [{ id: crypto.randomUUID(), texto: t }, ...itens];
    setItens(next);
    save(next);
    setNovo("");
    setCriando(false);
  };

  const toggle = (id: string) => {
    const next = itens.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i));
    setItens(next);
    save(next);
  };

  const remove = (id: string) => {
    const next = itens.filter((i) => i.id !== id);
    setItens(next);
    save(next);
  };

  const promover = (l: Lembrete) => {
    toast.success("Vamos transformar em Tarefa", {
      description: "Em breve: abrir o formulário de Tarefa com este texto.",
    });
    remove(l.id);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      <span className="type-label mr-1 shrink-0 inline-flex items-center gap-1.5">
        <StickyNote className="w-3.5 h-3.5" />
        Lembretes
      </span>

      <AnimatePresence initial={false}>
        {itens.map((l) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "group shrink-0 relative rounded-md px-3 py-2 max-w-[220px]",
              "bg-warn-soft text-foreground shadow-e1 border border-warn/20",
              l.feito && "opacity-60",
            )}
          >
            <p
              className={cn(
                "text-[12.5px] leading-tight pr-1",
                l.feito && "line-through",
              )}
            >
              {l.texto}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <button
                type="button"
                onClick={() => toggle(l.id)}
                className="h-5 w-5 rounded-full bg-card/70 hover:bg-card flex items-center justify-center text-muted-foreground hover:text-ok transition-colors"
                title={l.feito ? "Reabrir" : "Marcar como feito"}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => promover(l)}
                className="h-5 w-5 rounded-full bg-card/70 hover:bg-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                title="Promover a Tarefa"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => remove(l.id)}
                className="h-5 w-5 rounded-full bg-card/70 hover:bg-card flex items-center justify-center text-muted-foreground hover:text-danger transition-colors ml-auto"
                title="Remover"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {criando ? (
        <div className="shrink-0 flex items-center gap-1">
          <input
            autoFocus
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") {
                setCriando(false);
                setNovo("");
              }
            }}
            onBlur={() => (novo.trim() ? add() : setCriando(false))}
            placeholder="Escreva um lembrete…"
            className="h-8 px-2 rounded-md bg-card border border-border/60 text-[12.5px] w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-dashed border-border/70 text-[12px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo lembrete
        </button>
      )}

      {!itens.length && !criando && (
        <span className="shrink-0 text-[12px] text-muted-foreground/80 italic">
          Nada por aqui ainda. Anote uma ideia rápida.
        </span>
      )}
    </div>
  );
}
