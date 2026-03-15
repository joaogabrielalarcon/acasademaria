import type { CrmCard } from "@/hooks/useCRM";
import { CrmCardMini } from "./CrmCardMini";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  cards: CrmCard[];
  rejectedCards: CrmCard[];
  statuses: readonly string[];
  onCardClick: (card: CrmCard) => void;
}

const STATUS_LABELS: Record<string, string> = {
  Lead: "Lead",
  "Proposta Enviada": "Proposta Enviada",
  Aprovado: "Aprovado",
  "Em Execucao": "Em Execução",
  Concluido: "Concluído",
  "Pos-venda": "Pós-venda",
};

export function CrmKanban({ cards, rejectedCards, statuses, onCardClick }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {statuses.map((status) => {
            const colCards = cards.filter((c) => c.status === status);
            return (
              <div
                key={status}
                className="flex flex-col w-[260px] shrink-0 rounded-xl bg-secondary/50 border border-border"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {STATUS_LABELS[status] ?? status}
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                    {colCards.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-2 min-h-[120px]">
                  {colCards.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhum card</p>
                  ) : (
                    colCards.map((card) => (
                      <CrmCardMini key={card.id} card={card} onClick={() => onCardClick(card)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {rejectedCards.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Propostas Não Aprovadas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rejectedCards.map((card) => (
              <CrmCardMini key={card.id} card={card} onClick={() => onCardClick(card)} muted />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
