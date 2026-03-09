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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  type DiarioMidiaRow,
  type DiarioVisitaDetalhe,
  formatDate,
  formatPeriodo,
  getTrend,
  statusMeta,
} from "@/lib/diario-visitas";

interface DiarioVisitaCompactCardProps {
  visita: DiarioVisitaDetalhe;
  canViewInternalNotes?: boolean;
  hideInternalNotes?: boolean;
  footerLink?: string;
  footerLabel?: string;
}

export function DiarioVisitaCompactCard({
  visita,
  canViewInternalNotes = false,
  hideInternalNotes = false,
  footerLink,
  footerLabel = "Ver no diário →",
}: DiarioVisitaCompactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<DiarioMidiaRow | null>(null);

  const visitStatus = visita.statusResumo ? statusMeta[visita.statusResumo] : null;
  const hasMedia = visita.fotoCount > 0 || visita.videoCount > 0;

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <article className="card-botanical overflow-hidden h-full flex flex-col">
          {/* Header compacto */}
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base font-bold text-foreground truncate">
                {formatDate(visita.data_visita)}
              </span>
              {visitStatus && (
                <span className={cn("diario-status-badge text-[10px] px-2 py-0.5", visitStatus.className)}>
                  <span>{visitStatus.emoji}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatPeriodo(visita)}</p>
          </div>

          {/* Conteúdo principal */}
          <div className="p-3 flex-1 space-y-2">
            {/* Áreas */}
            {visita.areasResumo.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {visita.areasResumo.slice(0, 3).map((area) => (
                  <span key={area} className="diario-chip-area text-[10px] px-1.5 py-0.5">{area}</span>
                ))}
                {visita.areasResumo.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{visita.areasResumo.length - 3}</span>
                )}
              </div>
            )}

            {/* Serviços */}
            {visita.servicosResumo.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {visita.servicosResumo.slice(0, 4).map((servico) => (
                  <span key={servico} className="diario-chip-service text-[10px] px-1.5 py-0.5">{servico}</span>
                ))}
                {visita.servicosResumo.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{visita.servicosResumo.length - 4}</span>
                )}
              </div>
            )}

            {/* Equipe */}
            {visita.equipeResumo.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {visita.equipeResumo.slice(0, 3).map((colaborador) => (
                  <span key={colaborador} className="diario-chip-team text-[10px] px-1.5 py-0.5">{colaborador}</span>
                ))}
                {visita.equipeResumo.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{visita.equipeResumo.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Footer com contadores e ações */}
          <div className="px-3 py-2 bg-muted/30 border-t border-border/50 mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {hasMedia && (
                  <>
                    <span className="inline-flex items-center gap-0.5">
                      <Images className="w-3 h-3" />
                      {visita.fotoCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Video className="w-3 h-3" />
                      {visita.videoCount}
                    </span>
                  </>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? "Menos" : "Mais"}
                </button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Conteúdo expandido */}
          <CollapsibleContent>
            <div className="border-t border-border p-3 space-y-3 bg-muted/20">
              {visita.areas.map((area) => {
                const areaStatus = area.status_area ? statusMeta[area.status_area] : null;
                const trend = getTrend(area);

                return (
                  <section key={area.id} className="rounded-xl border border-border bg-background/80 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h5 className="font-display text-sm font-semibold text-foreground">{area.nome_area}</h5>
                      <div className="flex items-center gap-1">
                        {trend === "up" && <ArrowUp className="w-3 h-3 text-success" />}
                        {trend === "down" && <ArrowDown className="w-3 h-3 text-primary" />}
                        {areaStatus && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", areaStatus.className)}>
                            {areaStatus.emoji}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Relato/Descrição do serviço */}
                    {area.relato && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{area.relato}</p>
                    )}

                    {/* Serviços detalhados */}
                    {!!area.servicos?.length && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {area.servicos.map((servico) => (
                          <span key={servico} className="diario-chip-service text-[10px] px-1.5 py-0.5">{servico}</span>
                        ))}
                      </div>
                    )}

                    {/* Equipe */}
                    {!!area.equipe.length && (
                      <div className="space-y-1 mb-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                          <UserRound className="w-3 h-3 text-primary" />
                          Equipe
                        </p>
                        <div className="space-y-1">
                          {area.equipe.map((colaborador) => (
                            <div key={colaborador.id} className="rounded-lg bg-muted/70 p-2">
                              <p className="text-[10px] font-medium text-foreground">
                                {colaborador.colaborador_nome}
                                {colaborador.funcao ? ` · ${colaborador.funcao}` : ""}
                              </p>
                              {colaborador.descricao_atividade && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{colaborador.descricao_atividade}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Insumos */}
                    {!!area.insumos.length && (
                      <div className="space-y-1 mb-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                          <Package className="w-3 h-3 text-primary" />
                          Insumos
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {area.insumos.map((insumo) => (
                            <span key={insumo.id} className="tag-secondary text-[10px] px-1.5 py-0.5">
                              {insumo.insumo_nome}
                              {insumo.quantidade && ` (${insumo.quantidade}${insumo.unidade || ""})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Máquinas */}
                    {!!area.maquinas.length && (
                      <div className="space-y-1 mb-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                          <Wrench className="w-3 h-3 text-primary" />
                          Máquinas
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {area.maquinas.map((maquina) => (
                            <span key={maquina.id} className="tag-secondary text-[10px] px-1.5 py-0.5">{maquina.maquina_nome}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mídias */}
                    {!!area.midias.length && (
                      <div className="grid grid-cols-3 gap-1 mt-2">
                        {area.midias.slice(0, 6).map((midia) => (
                          <button
                            key={midia.id}
                            type="button"
                            className="diario-media-thumb text-left aspect-square"
                            onClick={() => setSelectedMedia(midia)}
                          >
                            {midia.tipo === "video" ? (
                              <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                                <Video className="w-4 h-4" />
                              </div>
                            ) : (
                              <img
                                src={midia.thumbnail_url || midia.url}
                                alt={midia.descricao || `Mídia da área ${area.nome_area}`}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Observações internas */}
              {!hideInternalNotes && canViewInternalNotes && visita.observacoes_internas && (
                <section className="rounded-xl border border-border bg-muted/50 p-3">
                  <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                    <Lock className="w-3 h-3 text-primary" />
                    Observações internas
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground line-clamp-4">
                    {visita.observacoes_internas}
                  </p>
                </section>
              )}

              {/* Link para diário */}
              {footerLink && (
                <Link
                  to={footerLink}
                  className="block text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {footerLabel}
                </Link>
              )}
            </div>
          </CollapsibleContent>
        </article>
      </Collapsible>

      {/* Modal de mídia */}
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
