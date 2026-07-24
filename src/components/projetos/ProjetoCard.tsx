import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, User } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type ProjetoPipeline,
  tipoLabel,
  temperaturaLabel,
} from "@/hooks/useProjetosPipeline";

interface ProjetoCardProps {
  projeto: ProjetoPipeline;
  onOpen?: (id: string) => void;
  onMoverClick?: () => void;
  draggable?: boolean;
}

function tempClasses(t?: string | null) {
  if (t === "quente") return "bg-primary-soft text-primary";
  if (t === "morno") return "bg-warn-soft text-warn";
  if (t === "frio") return "bg-navy-soft text-accent";
  return "bg-muted text-muted-foreground";
}

function retornoAtrasado(proj: ProjetoPipeline): { atrasado: boolean; dias: number; rotulo: string } | null {
  const alvo = proj.data_retorno_prometida ?? proj.proximo_contato_em;
  if (!alvo) return null;
  const d = new Date(alvo);
  const hoje = new Date();
  d.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return null;
  return {
    atrasado: true,
    dias: diff,
    rotulo: proj.data_retorno_prometida ? `retorno atrasado ${diff}d` : `sem contato há ${diff}d`,
  };
}

export function ProjetoCard({ projeto, onOpen, onMoverClick, draggable }: ProjetoCardProps) {
  const navigate = useNavigate();
  const atraso = retornoAtrasado(projeto);
  const temp = temperaturaLabel(projeto.temperatura);
  const iniciais = (projeto.responsavel_nome ?? "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <motion.article
      layout
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => onOpen?.(projeto.id)}
      draggable={draggable}
      onDragStart={(e: any) => {
        e.dataTransfer?.setData("text/plain", projeto.id);
        e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
      }}
      className={cn(
        "group relative bg-card rounded-lg border border-border/60 shadow-e1 hover:shadow-e2 cursor-pointer overflow-hidden",
        "before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full",
        atraso ? "before:bg-primary" : "before:bg-accent/60",
      )}
    >
      <div className="p-3.5 pl-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-serif text-[15px] leading-snug font-semibold text-foreground line-clamp-2">
            {projeto.titulo}
          </h4>
          {temp && (
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", tempClasses(projeto.temperatura))}>
              {temp}
            </span>
          )}
        </div>

        <div className="text-[12.5px] text-muted-foreground flex items-center gap-1.5 min-w-0">
          {projeto.cliente_nome ? (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/clientes/${projeto.cliente_id}`);
                  }}
                  className="truncate hover:text-primary hover:underline underline-offset-2 max-w-full"
                >
                  {projeto.cliente_nome}
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="w-64">
                <div className="space-y-1">
                  <p className="font-serif font-semibold text-[14px]">{projeto.cliente_nome}</p>
                  <p className="text-[12px] text-muted-foreground">Abrir ficha do cliente</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ) : (
            <span className="text-muted-foreground/60">Sem cliente</span>
          )}
          {projeto.local_apelido && (
            <>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{projeto.local_apelido}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="secondary" className="bg-navy-soft text-accent border-0 font-medium text-[11px]">
            {tipoLabel(projeto.tipo)}
          </Badge>
          <div className="flex items-center gap-1.5">
            {projeto.substatus && (
              <span className="text-[11px] text-muted-foreground/80 truncate max-w-[110px]">{projeto.substatus}</span>
            )}
            {projeto.responsavel_nome ? (
              <div
                title={projeto.responsavel_nome}
                className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center overflow-hidden ring-1 ring-border"
              >
                {projeto.responsavel_foto ? (
                  <img src={projeto.responsavel_foto} alt="" className="w-full h-full object-cover" />
                ) : iniciais || <User className="w-3 h-3" />}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center" title="Sem responsável">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {atraso && (
          <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-primary bg-primary-soft rounded-md px-2 py-1 mt-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {atraso.rotulo}
          </div>
        )}

        {onMoverClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoverClick();
            }}
            className="w-full text-[11.5px] text-muted-foreground hover:text-primary transition-colors pt-1 md:hidden"
          >
            Mover para…
          </button>
        )}
      </div>
    </motion.article>
  );
}
