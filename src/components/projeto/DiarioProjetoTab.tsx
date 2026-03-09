import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LayoutGrid, List, Loader2, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { CalendarioDiario } from "@/components/CalendarioDiario";
import { DiarioVisitaCompactCard } from "@/components/diario/DiarioVisitaCompactCard";
import { DiarioFilters, defaultFilters, type DiarioFiltersState } from "@/components/diario/DiarioFilters";
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
  statusToNota,
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
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<DiarioFiltersState>(defaultFilters);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(() => hasMafeDiarioRascunho(projetoId));

  useEffect(() => {
    if (!isActive) return;
    setViewMode("grid");
    setSearch("");
    setFilters(defaultFilters);
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

  // Extrair opções únicas para filtros
  const filterOptions = useMemo(() => {
    const allAreas = uniqueValues(visitas.flatMap((v) => v.areasResumo));
    const allColaboradores = uniqueValues(visitas.flatMap((v) => v.equipeResumo));
    return { areas: allAreas, colaboradores: allColaboradores };
  }, [visitas]);

  // Aplicar filtros avançados
  const filteredVisitas = useMemo(() => {
    let result = visitas;

    // Filtro de período
    if (filters.periodo !== "all") {
      const days = filters.periodo === "7dias" ? 7 : filters.periodo === "30dias" ? 30 : 90;
      const cutoff = subDays(new Date(), days);
      result = result.filter((v) => new Date(v.data_visita) >= cutoff);
    }

    // Filtro de status
    if (filters.status !== "all") {
      result = result.filter((v) => v.statusResumo === filters.status);
    }

    // Filtro de área
    if (filters.area !== "all") {
      result = result.filter((v) => v.areasResumo.includes(filters.area));
    }

    // Filtro de colaborador
    if (filters.colaborador !== "all") {
      result = result.filter((v) => v.equipeResumo.includes(filters.colaborador));
    }

    // Busca textual
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      result = result.filter((visita) => {
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
    }

    return result;
  }, [search, visitas, filters]);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="card-botanical p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground tracking-tight">Diário do projeto</h3>
              <p className="text-sm text-muted-foreground">
                {visitas.length} registro{visitas.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Toggle de visualização */}
              <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/70 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "grid" ? "terracota" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="h-7 px-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "list" ? "terracota" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="h-7 px-2"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "calendar" ? "terracota" : "ghost"}
                  onClick={() => setViewMode("calendar")}
                  className="h-7 px-2"
                >
                  <CalendarDays className="w-4 h-4" />
                </Button>
              </div>

              {/* Botão registrar */}
              <div className="relative inline-flex">
                <Button variant="terracota" size="sm" onClick={() => setIsChatOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Registrar
                </Button>
                {hasSavedDraft ? (
                  <span className="pointer-events-none absolute -right-2 -top-2 rounded-full border border-primary/20 bg-background px-1.5 py-0.5 text-[9px] font-semibold text-primary shadow-sm">
                    Rascunho
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Filtros e busca */}
          {viewMode !== "calendar" && (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <DiarioFilters
                filters={filters}
                onChange={setFilters}
                areas={filterOptions.areas}
                colaboradores={filterOptions.colaboradores}
              />
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar..."
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {viewMode === "calendar" ? (
        <CalendarioDiario registros={calendarioRegistros} clienteId={clienteId} />
      ) : !visitas.length ? (
        <div className="empty-state card-botanical">
          <h4 className="font-display text-xl font-semibold text-foreground">Nenhum registro ainda.</h4>
          <p className="mt-2 text-sm text-muted-foreground">Clique em Registrar para começar.</p>
        </div>
      ) : !filteredVisitas.length ? (
        <div className="empty-state card-botanical">
          <h4 className="font-display text-xl font-semibold text-foreground">Nenhum resultado encontrado</h4>
          <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou busque por outro termo.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Layout em grid - estilo post-it */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredVisitas.map((visita) => (
            <DiarioVisitaCompactCard
              key={visita.id}
              visita={visita}
              canViewInternalNotes={canViewInternalNotes}
            />
          ))}
        </div>
      ) : (
        /* Layout em lista - mais espaçado mas ainda compacto */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredVisitas.map((visita) => (
            <DiarioVisitaCompactCard
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
