import { useEffect, useMemo, useState } from "react";
import { CalendarDays, List, Loader2, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CalendarioDiario } from "@/components/CalendarioDiario";
import { DiarioVisitaCard } from "@/components/diario/DiarioVisitaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MafeDiarioChat } from "@/components/diario/MafeDiarioChat";
import { useAuth, useHasAnyRole } from "@/hooks/useAuth";
import { MAFE_DIARIO_RASCUNHO_EVENT, hasMafeDiarioRascunho } from "@/lib/mafe-diario";
import {
  type DiarioVisitaDetalhe,
  fetchDiarioVisitasDetalhes,
  formatDate,
  formatPeriodo,
  uniqueValues,
} from "@/lib/diario-visitas";

interface DiarioProjetoTabProps {
  projetoId: string;
  projetoNome: string;
  clienteNome: string;
  clienteId: string;
  isActive?: boolean;
}

export function DiarioProjetoTab({ projetoId, projetoNome, clienteNome, clienteId, isActive = false }: DiarioProjetoTabProps) {
  const { user } = useAuth();
  const canViewInternalNotes = useHasAnyRole(user?.id, ["admin", "administrativo", "gestao_campo"]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(() => hasMafeDiarioRascunho(projetoId));

  useEffect(() => {
    if (!isActive) return;
    setViewMode("list");
    setSearch("");
  }, [isActive, projetoId]);

  useEffect(() => {
    setHasSavedDraft(hasMafeDiarioRascunho(projetoId));

    const syncDraftBadge = () => setHasSavedDraft(hasMafeDiarioRascunho(projetoId));
    const handleDraftEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ projetoId?: string }>).detail;
      if (!detail?.projetoId || detail.projetoId === projetoId) syncDraftBadge();
    };

    window.addEventListener("storage", syncDraftBadge);
    window.addEventListener(MAFE_DIARIO_RASCUNHO_EVENT, handleDraftEvent as EventListener);

    return () => {
      window.removeEventListener("storage", syncDraftBadge);
      window.removeEventListener(MAFE_DIARIO_RASCUNHO_EVENT, handleDraftEvent as EventListener);
    };
  }, [projetoId]);

  const { data: visitas = [], isLoading } = useQuery<DiarioVisitaDetalhe[]>({
    queryKey: ["diario-visitas-projeto", projetoId],
    enabled: !!projetoId,
    queryFn: () => fetchDiarioVisitasDetalhes({ projetoId }),
  });

  const filteredVisitas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return visitas;

    return visitas.filter((visita) => {
      const searchableText = [
        formatDate(visita.data_visita),
        formatPeriodo(visita),
        visita.areasResumo.join(" "),
        visita.servicosResumo.join(" "),
        visita.equipeResumo.join(" "),
        visita.areas.map((area) => area.relato || "").join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [search, visitas]);

  const calendarioRegistros = useMemo(
    () =>
      visitas.map((visita) => ({
        id: visita.id,
        data: visita.data_visita,
        tipo: "manutencao",
        trecho: visita.areasResumo.join(" • ") || "Visita registrada",
        status: "realizado",
        proposta: null,
        equipePresente: visita.equipeResumo,
        executores: visita.equipeResumo,
        solicitante: visita.registrado_por_nome,
        descricao:
          uniqueValues(visita.areas.flatMap((area) => area.servicos || [])).join(", ") ||
          visita.areas.map((area) => area.relato || "").filter(Boolean).join(" ") ||
          "Registro de visita do projeto",
        insumos: visita.areas
          .flatMap((area) => area.insumos)
          .slice(0, 6)
          .map((insumo) => ({
            nome: insumo.insumo_nome,
            quantidade: Number.parseFloat(insumo.quantidade || "") || 1,
            unidade: insumo.unidade || "un",
          })),
        prioridade: null,
        statusSolicitacao: null,
      })),
    [visitas],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-botanical p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground tracking-tight">Diário do projeto</h3>
              <p className="text-sm text-muted-foreground">
                {visitas.length} registro{visitas.length === 1 ? "" : "s"} · Acompanhe visitas, áreas atendidas, equipe, insumos, máquinas e mídias.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
              <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/70 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "list" ? "terracota" : "ghost"}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                  Lista
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "calendar" ? "terracota" : "ghost"}
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarDays className="w-4 h-4" />
                  Calendário
                </Button>
              </div>

              <div className="relative inline-flex">
                <Button variant="terracota" onClick={() => setIsChatOpen(true)}>
                  <Plus className="w-4 h-4" />
                  + Registrar
                </Button>
                {hasSavedDraft ? (
                  <span className="pointer-events-none absolute -right-2 -top-2 rounded-full border border-primary/20 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm">
                    ● Rascunho salvo
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {viewMode === "list" && (
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por data, área, serviço ou colaborador"
                className="pl-9"
              />
            </div>
          )}
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarioDiario registros={calendarioRegistros} clienteId={clienteId} />
      ) : !visitas.length ? (
        <div className="empty-state card-botanical">
          <h4 className="font-display text-xl font-semibold text-foreground">Nenhum registro ainda.</h4>
          <p className="mt-2 text-sm text-muted-foreground">Clique em + Registrar para começar.</p>
        </div>
      ) : !filteredVisitas.length ? (
        <div className="empty-state card-botanical">
          <h4 className="font-display text-xl font-semibold text-foreground">Nenhum resultado encontrado</h4>
          <p className="mt-2 text-sm text-muted-foreground">Tente buscar por outra data, área, serviço ou colaborador.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisitas.map((visita) => (
            <DiarioVisitaCard
              key={visita.id}
              visita={visita}
              canViewInternalNotes={canViewInternalNotes}
            />
          ))}
        </div>
      )}

      <MafeDiarioChat
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        projetoId={projetoId}
        projetoNome={projetoNome}
        clienteNome={clienteNome}
        onSaved={() => {
          setIsChatOpen(false);
        }}
      />

    </div>
  );
}

