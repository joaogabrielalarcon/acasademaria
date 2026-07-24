import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PIPELINE_STATUSES, statusLabel, useMoverProjetoStatus, useArquivarProjeto, type ProjetoPipeline } from "@/hooks/useProjetosPipeline";
import { ProjetoCard } from "./ProjetoCard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Archive } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  projetos: ProjetoPipeline[];
}

export function ProjetosKanban({ projetos }: Props) {
  const navigate = useNavigate();
  const mover = useMoverProjetoStatus();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [moverAlvo, setMoverAlvo] = useState<ProjetoPipeline | null>(null);

  const colunas = useMemo(() => {
    return PIPELINE_STATUSES.map((s) => ({
      ...s,
      itens: projetos.filter((p) => (p.status ?? "prospeccao") === s.value),
    }));
  }, [projetos]);

  const handleMove = async (proj: ProjetoPipeline, novoStatus: string) => {
    if (novoStatus === proj.status) return;
    try {
      await mover.mutateAsync({ id: proj.id, novo: novoStatus, anterior: proj.status, cliente_id: proj.cliente_id });
      toast({ title: "Projeto movido", description: `${proj.titulo} → ${statusLabel(novoStatus)}` });
    } catch (e: any) {
      toast({ title: "Não foi possível mover", description: e?.message ?? "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex gap-4 min-w-max">
        {colunas.map((col) => (
          <div
            key={col.value}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.value); }}
            onDragLeave={() => setDragOver((v) => (v === col.value ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              const proj = projetos.find((p) => p.id === id);
              if (proj) handleMove(proj, col.value);
            }}
            className={cn(
              "w-[280px] flex-shrink-0 rounded-lg transition-colors",
              dragOver === col.value && "bg-primary-soft/40 ring-1 ring-primary/30",
            )}
          >
            <div className="flex items-center justify-between px-1 py-2 mb-2 border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", col.dot)} />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground truncate">
                  {col.label}
                </h3>
              </div>
              <span className="text-[12px] tabular-nums text-muted-foreground">{col.itens.length}</span>
            </div>
            <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
              {col.itens.length === 0 ? (
                <div className="text-center py-8 px-3 text-[12.5px] text-muted-foreground/70 italic font-serif border border-dashed border-border/50 rounded-lg">
                  Nada aqui ainda
                </div>
              ) : (
                col.itens.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, delay: Math.min(i * 0.02, 0.2) }}
                  >
                    <ProjetoCard
                      projeto={p}
                      draggable
                      onOpen={(id) => navigate(`/projetos/${id}/painel`)}
                      onMoverClick={() => setMoverAlvo(p)}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <DropdownMenu open={!!moverAlvo} onOpenChange={(o) => !o && setMoverAlvo(null)}>
        <DropdownMenuTrigger className="sr-only" />
        <DropdownMenuContent align="center">
          <DropdownMenuLabel>Mover para</DropdownMenuLabel>
          {PIPELINE_STATUSES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              disabled={moverAlvo?.status === s.value}
              onSelect={() => {
                if (moverAlvo) handleMove(moverAlvo, s.value);
                setMoverAlvo(null);
              }}
            >
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
