import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useCrmCards, type CrmCard } from "@/hooks/useCRM";
import { CrmKanban } from "@/components/crm/CrmKanban";
import { CrmLista } from "@/components/crm/CrmLista";
import { CrmCardDetail } from "@/components/crm/CrmCardDetail";
import { CrmNovoCard } from "@/components/crm/CrmNovoCard";

const CRM_STATUSES = ["Lead", "Proposta Enviada", "Aprovado", "Em Execucao", "Concluido", "Pos-venda"] as const;

export default function CRM() {
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [selectedCard, setSelectedCard] = useState<CrmCard | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { data: cards = [], isLoading } = useCrmCards();

  const activeCards = cards.filter((c) => c.status !== "Nao Aprovado");
  const rejectedCards = cards.filter((c) => c.status === "Nao Aprovado");

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-serif font-semibold text-foreground">CRM</h1>
          <div className="flex items-center gap-2">
            <div className="flex bg-secondary rounded-lg p-0.5">
              <Button
                size="sm"
                variant={view === "kanban" ? "default" : "ghost"}
                onClick={() => setView("kanban")}
                className="gap-1.5"
              >
                <LayoutGrid className="w-4 h-4" /> Kanban
              </Button>
              <Button
                size="sm"
                variant={view === "lista" ? "default" : "ghost"}
                onClick={() => setView("lista")}
                className="gap-1.5"
              >
                <List className="w-4 h-4" /> Lista
              </Button>
            </div>
            <Button onClick={() => setShowNew(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Card
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === "kanban" ? (
          <CrmKanban
            cards={activeCards}
            rejectedCards={rejectedCards}
            statuses={CRM_STATUSES}
            onCardClick={setSelectedCard}
          />
        ) : (
          <CrmLista cards={cards} onCardClick={setSelectedCard} />
        )}
      </div>

      {selectedCard && (
        <CrmCardDetail
          card={selectedCard}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {showNew && (
        <CrmNovoCard open={showNew} onClose={() => setShowNew(false)} />
      )}
    </AppLayout>
  );
}
