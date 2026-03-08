import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Images,
  Lock,
  Package,
  UserRound,
  Video,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type DiarioMidiaRow,
  type DiarioVisitaDetalhe,
  formatDate,
  formatPeriodo,
  getTrend,
  statusMeta,
} from "@/lib/diario-visitas";

interface DiarioVisitaCardProps {
  visita: DiarioVisitaDetalhe;
  canViewInternalNotes?: boolean;
  hideInternalNotes?: boolean;
  footerLink?: string;
  footerLabel?: string;
  defaultExpanded?: boolean;
}

export function DiarioVisitaCard({
  visita,
  canViewInternalNotes = false,
  hideInternalNotes = false,
  footerLink,
  footerLabel = "Ver no diário →",
  defaultExpanded = false,
}: DiarioVisitaCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedMedia, setSelectedMedia] = useState<DiarioMidiaRow | null>(null);

  const visitStatus = visita.statusResumo ? statusMeta[visita.statusResumo] : null;

  return (
    <>
      <article className="card-botanical overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-xl font-bold text-foreground tracking-tight">
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
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Images className="w-4 h-4" />
                  {visita.fotoCount} foto{visita.fotoCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Video className="w-4 h-4" />
                  {visita.videoCount} vídeo{visita.videoCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {footerLink && (
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <Link to={footerLink}>{footerLabel}</Link>
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setIsExpanded((current) => !current)}>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isExpanded ? "Recolher" : "Expandir"}
                </Button>
              </div>
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

              {!hideInternalNotes && canViewInternalNotes && visita.observacoes_internas && (
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
    </>
  );
}
