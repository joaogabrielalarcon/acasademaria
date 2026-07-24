import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PIPELINE_STATUSES, statusLabel, useMoverProjetoStatus, type ProjetoPipeline } from "@/hooks/useProjetosPipeline";
import { ProjetoCard } from "./ProjetoCard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
      <div className="flex gap-3 min-w-max">
        {colunas.map((col) => (
          <div
            key={col.value}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.value);
            }}
            onDragLeave={() => setDragOver((v) => (v === col.value ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              const proj = projetos.find((p) => p.id === id);
              if (proj) handleMove(proj, col.value);
            }}
            className={cn(
              "w-[290px] flex-shrink-0 rounded-lg border border-border/50 bg-muted/40 transition-colors",
              dragOver === col.value && "bg-primary-soft/60 border-primary/40",
            )}
          >
            <div className="flex items-baseline justify-between px-3 py-2.5 border-b border-border/40">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {col.label}
              </h3>
              <span className="text-[12px] tabular-nums text-muted-foreground/80">{col.itens.length}</span>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
              {col.itens.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-muted-foreground/70 italic font-serif">
                  Nenhum projeto aqui
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
