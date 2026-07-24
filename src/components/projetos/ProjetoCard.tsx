import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, MoreHorizontal, User } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  type ProjetoPipeline,
  tipoLabel,
  temperaturaLabel,
  statusColor,
} from "@/hooks/useProjetosPipeline";

interface ProjetoCardProps {
  projeto: ProjetoPipeline;
  onOpen?: (id: string) => void;
  onMoverClick?: () => void;
  draggable?: boolean;
}

function tempDot(t?: string | null) {
  if (t === "quente") return "bg-primary";
  if (t === "morno") return "bg-warn";
  if (t === "frio") return "bg-accent";
  return "bg-muted-foreground/40";
}

type Retorno =
  | { kind: "atrasado"; texto: string }
  | { kind: "hoje"; texto: string }
  | { kind: "futuro"; texto: string }
  | { kind: "vazio" };

function retornoInfo(p: ProjetoPipeline): Retorno {
  const alvo = p.data_retorno_prometida ?? p.proximo_contato_em;
  if (!alvo) return { kind: "vazio" };
  const d = new Date(alvo); d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - d.getTime()) / 86400000);
  if (diff > 0) return { kind: "atrasado", texto: `retorno atrasado ${diff}d` };
  if (diff === 0) return { kind: "hoje", texto: "retorno hoje" };
  return { kind: "futuro", texto: `retorno em ${-diff}d` };
}

export function ProjetoCard({ projeto, onOpen, onMoverClick, draggable }: ProjetoCardProps) {
  const navigate = useNavigate();
  const ret = retornoInfo(projeto);
  const temp = temperaturaLabel(projeto.temperatura);
  const iniciais = (projeto.responsavel_nome ?? "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <motion.article
      layout
      whileHover={{ y: -2, boxShadow: "var(--shadow-e3)" }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => onOpen?.(projeto.id)}
      draggable={draggable}
      onDragStart={(e: any) => {
        e.dataTransfer?.setData("text/plain", projeto.id);
        e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
      }}
      className="group relative bg-card rounded-lg shadow-e1 hover:shadow-e2 cursor-pointer overflow-hidden p-4 pl-[18px] space-y-2.5"
    >
      {/* Filete lateral com a cor do status */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ background: statusColor(projeto.status) }} />
      {/* Header: nome do cliente + menu */}
      <div className="flex items-start justify-between gap-2">
        {projeto.cliente_nome ? (
          <HoverCard openDelay={220}>
            <HoverCardTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${projeto.cliente_id}`); }}
                className="font-serif text-[19px] leading-tight text-foreground hover:text-primary text-left line-clamp-2"
              >
                {projeto.cliente_nome}
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-64">
              <p className="font-serif font-semibold text-[15px]">{projeto.cliente_nome}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Abrir ficha do cliente</p>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <span className="font-serif text-[19px] text-muted-foreground/60">Sem cliente</span>
        )}
        {onMoverClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoverClick(); }}
            aria-label="Mover para outra etapa"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 -mr-1 md:opacity-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tipo pill */}
      <div>
        <span className="inline-flex items-center rounded-full bg-primary-soft text-primary text-[11.5px] font-medium px-2 py-0.5">
          {tipoLabel(projeto.tipo)}
        </span>
      </div>

      {/* Título do projeto */}
      <p className="text-[13.5px] font-semibold text-foreground leading-snug line-clamp-2">
        {projeto.titulo}
      </p>

      {/* Descrição (local / substatus) */}
      {(projeto.local_apelido || projeto.substatus) && (
        <p className="text-[12.5px] text-muted-foreground leading-snug line-clamp-2">
          {[projeto.local_apelido, projeto.substatus].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Rodapé: temperatura + avatar */}
      <div className="flex items-center justify-between pt-1">
        {temp ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
            <span className={cn("w-2 h-2 rounded-full", tempDot(projeto.temperatura))} />
            {temp.toLowerCase()}
          </span>
        ) : <span />}
        {projeto.responsavel_nome ? (
          <div
            title={projeto.responsavel_nome}
            className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10.5px] font-semibold flex items-center justify-center overflow-hidden ring-1 ring-border"
          >
            {projeto.responsavel_foto ? (
              <img src={projeto.responsavel_foto} alt="" className="w-full h-full object-cover" />
            ) : iniciais || <User className="w-3 h-3" />}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center" title="Sem responsável">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Retorno pill full-width */}
      {ret.kind !== "vazio" && (
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium",
            ret.kind === "atrasado" && "bg-primary text-primary-foreground",
            ret.kind === "hoje" && "bg-primary-soft text-primary",
            ret.kind === "futuro" && "border border-border/70 text-muted-foreground bg-transparent",
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          {ret.texto}
        </div>
      )}
    </motion.article>
  );
}
