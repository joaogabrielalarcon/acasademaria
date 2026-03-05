import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Images,
  List,
  Loader2,
  Lock,
  Package,
  Plus,
  Search,
  UserRound,
  Video,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarioDiario } from "@/components/CalendarioDiario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useHasAnyRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface DiarioProjetoTabProps {
  projetoId: string;
  clienteId: string;
}

type StatusArea = "otimo" | "bom" | "requer_atencao" | "critico";
type PeriodoVisita = "dia_inteiro" | "manha" | "tarde" | "horario_especifico";
type TipoMidia = "foto" | "video";

interface DiarioVisitaRow {
  id: string;
  projeto_id: string;
  cliente_id: string;
  data_visita: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  periodo: PeriodoVisita | null;
  status_geral: StatusArea | null;
  observacoes_internas: string | null;
  registrado_por_nome: string | null;
  created_at: string;
}

interface DiarioAreaRow {
  id: string;
  visita_id: string;
  projeto_id: string;
  nome_area: string;
  servicos: string[] | null;
  status_area: StatusArea | null;
  status_anterior: StatusArea | null;
  houve_melhora: boolean;
  relato: string | null;
  created_at: string;
}

interface DiarioEquipeRow {
  id: string;
  area_id: string;
  visita_id: string;
  colaborador_id: string | null;
  colaborador_nome: string;
  funcao: string | null;
  descricao_atividade: string | null;
}

interface DiarioInsumoRow {
  id: string;
  area_id: string;
  visita_id: string;
  insumo_id: string | null;
  insumo_nome: string;
  quantidade: string | null;
  unidade: string | null;
}

interface DiarioMaquinaRow {
  id: string;
  area_id: string;
  visita_id: string;
  maquina_id: string | null;
  maquina_nome: string;
}

interface DiarioMidiaRow {
  id: string;
  visita_id: string;
  area_id: string | null;
  tipo: TipoMidia | null;
  url: string;
  thumbnail_url: string | null;
  descricao: string | null;
}

interface DiarioAreaDetalhe extends DiarioAreaRow {
  equipe: DiarioEquipeRow[];
  insumos: DiarioInsumoRow[];
  maquinas: DiarioMaquinaRow[];
  midias: DiarioMidiaRow[];
}

interface DiarioVisitaDetalhe extends DiarioVisitaRow {
  areas: DiarioAreaDetalhe[];
  fotoCount: number;
  videoCount: number;
  areasResumo: string[];
  servicosResumo: string[];
  equipeResumo: string[];
  statusResumo: StatusArea | null;
}

const periodLabels: Record<PeriodoVisita, string> = {
  dia_inteiro: "Dia inteiro",
  manha: "Manhã",
  tarde: "Tarde",
  horario_especifico: "Horário específico",
};

const statusMeta: Record<StatusArea, { emoji: string; label: string; className: string }> = {
  otimo: { emoji: "🟢", label: "Ótimo", className: "diario-status-otimo" },
  bom: { emoji: "🟡", label: "Bom", className: "diario-status-bom" },
  requer_atencao: { emoji: "🟠", label: "Requer atenção", className: "diario-status-requer_atencao" },
  critico: { emoji: "🔴", label: "Crítico", className: "diario-status-critico" },
};

const statusRank: Record<StatusArea, number> = {
  critico: 0,
  requer_atencao: 1,
  bom: 2,
  otimo: 3,
};

function formatDate(value: string) {
  return format(new Date(`${value}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
}

function formatHour(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

function formatPeriodo(visita: Pick<DiarioVisitaRow, "periodo" | "hora_inicio" | "hora_fim">) {
  const periodoLabel = visita.periodo ? periodLabels[visita.periodo] : null;
  const hourRange = [formatHour(visita.hora_inicio), formatHour(visita.hora_fim)].filter(Boolean).join("–");

  if (periodoLabel && hourRange) return `${periodoLabel} ${hourRange}`;
  if (periodoLabel) return periodoLabel;
  if (hourRange) return hourRange;
  return "Horário não informado";
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function getTrend(area: DiarioAreaRow) {
  if (area.status_area && area.status_anterior) {
    const current = statusRank[area.status_area];
    const previous = statusRank[area.status_anterior];
    if (current > previous) return "up" as const;
    if (current < previous) return "down" as const;
  }

  if (area.houve_melhora) return "up" as const;
  return null;
}

function getVisitStatus(visita: DiarioVisitaRow, areas: DiarioAreaRow[]) {
  if (visita.status_geral) return visita.status_geral;
  const statuses = areas.map((area) => area.status_area).filter(Boolean) as StatusArea[];
  if (!statuses.length) return null;
  return statuses.sort((a, b) => statusRank[a] - statusRank[b])[0];
}

export function DiarioProjetoTab({ projetoId, clienteId }: DiarioProjetoTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canViewInternalNotes = useHasAnyRole(user?.id, ["admin", "administrativo", "gestao_campo"]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<DiarioMidiaRow | null>(null);

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ["diario-visitas-projeto", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data: visitasData, error: visitasError } = await supabase
        .from("diario_visitas" as never)
        .select("*")
        .eq("projeto_id", projetoId)
        .order("data_visita", { ascending: false });

      if (visitasError) throw visitasError;

      const visitasRows = ((visitasData as unknown as DiarioVisitaRow[]) ?? []);
      if (!visitasRows.length) return [] as DiarioVisitaDetalhe[];

      const visitaIds = visitasRows.map((visita) => visita.id);

      const [areasResult, equipeResult, insumosResult, maquinasResult, midiasResult] = await Promise.all([
        supabase
          .from("diario_areas" as never)
          .select("*")
          .in("visita_id", visitaIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("diario_equipe_area" as never)
          .select("*")
          .in("visita_id", visitaIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("diario_insumos_area" as never)
          .select("*")
          .in("visita_id", visitaIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("diario_maquinas_area" as never)
          .select("*")
          .in("visita_id", visitaIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("diario_midia" as never)
          .select("*")
          .in("visita_id", visitaIds)
          .order("created_at", { ascending: true }),
      ]);

      if (areasResult.error) throw areasResult.error;
      if (equipeResult.error) throw equipeResult.error;
      if (insumosResult.error) throw insumosResult.error;
      if (maquinasResult.error) throw maquinasResult.error;
      if (midiasResult.error) throw midiasResult.error;

      const areasRows = ((areasResult.data as unknown as DiarioAreaRow[]) ?? []);
      const equipeRows = ((equipeResult.data as unknown as DiarioEquipeRow[]) ?? []);
      const insumoRows = ((insumosResult.data as unknown as DiarioInsumoRow[]) ?? []);
      const maquinaRows = ((maquinasResult.data as unknown as DiarioMaquinaRow[]) ?? []);
      const midiaRows = ((midiasResult.data as unknown as DiarioMidiaRow[]) ?? []);

      return visitasRows.map((visita) => {
        const areas = areasRows
          .filter((area) => area.visita_id === visita.id)
          .map((area) => ({
            ...area,
            equipe: equipeRows.filter((item) => item.area_id === area.id),
            insumos: insumoRows.filter((item) => item.area_id === area.id),
            maquinas: maquinaRows.filter((item) => item.area_id === area.id),
            midias: midiaRows.filter((item) => item.area_id === area.id),
          }));

        const visitMidias = midiaRows.filter((item) => item.visita_id === visita.id);
        return {
          ...visita,
          areas,
          fotoCount: visitMidias.filter((item) => item.tipo === "foto").length,
          videoCount: visitMidias.filter((item) => item.tipo === "video").length,
          areasResumo: uniqueValues(areas.map((area) => area.nome_area)),
          servicosResumo: uniqueValues(areas.flatMap((area) => area.servicos || [])),
          equipeResumo: uniqueValues(areas.flatMap((area) => area.equipe.map((item) => item.colaborador_nome))),
          statusResumo: getVisitStatus(visita, areas),
        } satisfies DiarioVisitaDetalhe;
      });
    },
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
              <h3 className="font-display text-lg font-semibold text-foreground">Diário do projeto</h3>
              <p className="text-sm text-muted-foreground">Acompanhe visitas, áreas atendidas, equipe, insumos, máquinas e mídias.</p>
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

              <Button
                variant="terracota"
                onClick={() => toast({ title: "Em breve" })}
              >
                <Plus className="w-4 h-4" />
                + Registrar
              </Button>
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
          {filteredVisitas.map((visita) => {
            const isExpanded = expandedVisitId === visita.id;
            const visitStatus = visita.statusResumo ? statusMeta[visita.statusResumo] : null;

            return (
              <article key={visita.id} className="card-botanical overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-lg font-semibold text-foreground">
                          {formatDate(visita.data_visita)} · {formatPeriodo(visita)}
                        </h4>
                        {visitStatus && (
                          <span className={cn("diario-status-badge", visitStatus.className)}>
                            <span>{visitStatus.emoji}</span>
                            <span>{visitStatus.label}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {visita.areasResumo.map((area) => (
                          <span key={area} className="diario-chip-area">{area}</span>
                        ))}
                        {visita.servicosResumo.map((servico) => (
                          <span key={servico} className="diario-chip-service">{servico}</span>
                        ))}
                        {visita.equipeResumo.map((colaborador) => (
                          <span key={colaborador} className="diario-chip-team">{colaborador}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Images className="w-4 h-4" />
                          {visita.fotoCount} foto{visita.fotoCount === 1 ? "" : "s"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Video className="w-4 h-4" />
                          {visita.videoCount} vídeo{visita.videoCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedVisitId(isExpanded ? null : visita.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? "Recolher" : "Expandir"}
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-5 sm:px-5">
                    <div className="space-y-5">
                      {visita.areas.map((area) => {
                        const areaStatus = area.status_area ? statusMeta[area.status_area] : null;
                        const trend = getTrend(area);

                        return (
                          <section key={area.id} className="rounded-2xl border border-border bg-background/60 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <h5 className="font-display text-lg font-semibold text-foreground">{area.nome_area}</h5>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {areaStatus && (
                                    <span className={cn("diario-status-badge", areaStatus.className)}>
                                      <span>{areaStatus.emoji}</span>
                                      <span>{areaStatus.label}</span>
                                    </span>
                                  )}

                                  {trend === "up" && (
                                    <span className="inline-flex items-center gap-1 text-sm font-medium diario-trend-up">
                                      <ArrowUp className="w-4 h-4" />
                                      Melhorou
                                    </span>
                                  )}

                                  {trend === "down" && (
                                    <span className="inline-flex items-center gap-1 text-sm font-medium diario-trend-down">
                                      <ArrowDown className="w-4 h-4" />
                                      Piorou
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!!area.servicos?.length && (
                              <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-foreground">Serviços realizados</p>
                                <div className="flex flex-wrap gap-2">
                                  {area.servicos.map((servico) => (
                                    <span key={servico} className="diario-chip-service">{servico}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!!area.equipe.length && (
                              <div className="mt-4 space-y-2">
                                <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                  <UserRound className="w-4 h-4 text-primary" />
                                  Equipe
                                </p>
                                <div className="space-y-2">
                                  {area.equipe.map((colaborador) => (
                                    <div key={colaborador.id} className="rounded-xl bg-muted/70 p-3">
                                      <p className="text-sm font-medium text-foreground">
                                        {colaborador.colaborador_nome}
                                        {colaborador.funcao ? ` · ${colaborador.funcao}` : ""}
                                      </p>
                                      {colaborador.descricao_atividade && (
                                        <p className="mt-1 text-sm text-muted-foreground">{colaborador.descricao_atividade}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!!area.insumos.length && (
                              <div className="mt-4 space-y-2">
                                <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Package className="w-4 h-4 text-primary" />
                                  Insumos usados
                                </p>
                                <div className="space-y-2">
                                  {area.insumos.map((insumo) => (
                                    <div key={insumo.id} className="rounded-xl bg-muted/70 p-3 text-sm text-foreground">
                                      <span className="font-medium">{insumo.insumo_nome}</span>
                                      {(insumo.quantidade || insumo.unidade) && (
                                        <span className="text-muted-foreground">
                                          {` · ${[insumo.quantidade, insumo.unidade].filter(Boolean).join(" ")}`}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!!area.maquinas.length && (
                              <div className="mt-4 space-y-2">
                                <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Wrench className="w-4 h-4 text-primary" />
                                  Máquinas usadas
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {area.maquinas.map((maquina) => (
                                    <span key={maquina.id} className="tag-secondary">{maquina.maquina_nome}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {area.relato && (
                              <div className="mt-4 rounded-xl bg-muted/70 p-3">
                                <p className="text-sm font-medium text-foreground">Relato</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{area.relato}</p>
                              </div>
                            )}

                            {!!area.midias.length && (
                              <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-foreground">Fotos e vídeos</p>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                  {area.midias.map((midia) => (
                                    <button
                                      key={midia.id}
                                      type="button"
                                      className="diario-media-thumb text-left"
                                      onClick={() => setSelectedMedia(midia)}
                                    >
                                      {midia.tipo === "video" ? (
                                        <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground">
                                          <Video className="w-6 h-6" />
                                        </div>
                                      ) : (
                                        <img
                                          src={midia.thumbnail_url || midia.url}
                                          alt={midia.descricao || `Mídia da área ${area.nome_area}`}
                                          className="aspect-[4/3] w-full object-cover"
                                          loading="lazy"
                                        />
                                      )}
                                      <div className="p-2">
                                        <p className="line-clamp-1 text-xs font-medium text-foreground">
                                          {midia.descricao || (midia.tipo === "video" ? "Vídeo da visita" : "Foto da visita")}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </section>
                        );
                      })}

                      {canViewInternalNotes && visita.observacoes_internas && (
                        <section className="rounded-2xl border border-border bg-muted/50 p-4">
                          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                            <Lock className="w-4 h-4 text-primary" />
                            Observações internas
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                            {visita.observacoes_internas}
                          </p>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl bg-card">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.descricao || "Visualização de mídia"}</DialogTitle>
          </DialogHeader>

          {selectedMedia?.tipo === "video" ? (
            <video src={selectedMedia.url} controls className="max-h-[75vh] w-full rounded-xl bg-muted" />
          ) : selectedMedia ? (
            <img
              src={selectedMedia.url}
              alt={selectedMedia.descricao || "Mídia da visita"}
              className="max-h-[75vh] w-full rounded-xl object-contain"
              loading="lazy"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

