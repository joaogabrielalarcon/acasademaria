import type { CrmCard } from "@/hooks/useCRM";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPO_COLORS: Record<string, string> = {
  Obra: "bg-[#1E4D3A] text-white",
  Proposta: "bg-primary text-primary-foreground",
  Manutencao: "bg-[#6A9A7A] text-white",
  Tarefa: "bg-[#C8856A] text-white",
};

const TIPO_LABELS: Record<string, string> = {
  Obra: "Obra",
  Proposta: "Proposta",
  Manutencao: "Manutenção",
  Tarefa: "Tarefa",
};

interface Props {
  card: CrmCard;
  onClick: () => void;
  muted?: boolean;
}

export function CrmCardMini({ card, onClick, muted }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all hover:shadow-md",
        muted
          ? "bg-muted/50 border-border/50 opacity-70"
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
          {card.titulo}
        </p>
        <Badge className={cn("shrink-0 text-[10px] px-1.5 py-0", TIPO_COLORS[card.tipo])}>
          {TIPO_LABELS[card.tipo] ?? card.tipo}
        </Badge>
      </div>

      {card.cliente_nome && (
        <p className="text-xs text-muted-foreground mb-1.5 truncate">
          {card.cliente_nome}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {card.prazo && (
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {new Date(card.prazo + "T12:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
        {card.responsavel_nome && (
          <span className="flex items-center gap-1 truncate">
            <User className="w-3 h-3" />
            {card.responsavel_nome}
          </span>
        )}
      </div>
    </button>
  );
}
