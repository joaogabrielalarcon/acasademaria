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
  Star,
  Users,
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
  type NotaQualidade,
  formatDate,
  formatPeriodo,
  getTrend,
  notaQualidadeMeta,
  statusToNota,
} from "@/lib/diario-visitas";

interface DiarioVisitaCardProps {
  visita: DiarioVisitaDetalhe;
  canViewInternalNotes?: boolean;
  hideInternalNotes?: boolean;
  footerLink?: string;
  footerLabel?: string;
  defaultExpanded?: boolean;
}

function NotaBadge({ nota }: { nota: NotaQualidade }) {
  const meta = notaQualidadeMeta[nota];
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        meta.className
      )} 
      title={`${nota}/5`}
    >
      <Star className="w-3 h-3 fill-current" />
      {meta.label}
    </span>
  );
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

  const visitNota = statusToNota(visita.statusResumo);
  const hasMedia = visita.fotoCount > 0 || visita.videoCount > 0;

  // Agrupa serviços por área para exibição estruturada
  const servicosPorArea = visita.areas.map((area) => ({
    nome: area.nome_area,
    servicos: area.servicos || [],
    nota: statusToNota(area.status_area),
  }));

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <article className="card-botanical overflow-hidden">
          {/* Header com data e nota */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-display text-lg font-bold text-foreground">
                  {formatDate(visita.data_visita)}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">{formatPeriodo(visita)}</p>
              </div>
              {visitNota && <NotaBadge nota={visitNota} />}
            </div>
          </div>

          {/* Conteúdo principal - Estrutura reorganizada */}
          <div className="p-4 space-y-4">
            {/* Equipe: título + contador + nomes lado a lado */}
            {visita.equipeResumo.length > 0 && (
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-foreground mb-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Equipe ({visita.equipeResumo.length})
                </p>
                <p className="text-sm font-medium text-foreground/80">
                  {visita.equipeResumo.join(" · ")}
                </p>
              </div>
            )}

            {/* Serviços por área: cada área numa linha */}
            {servicosPorArea.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Serviços</p>
                {servicosPorArea.map((item) => (
                  <div key={item.nome} className="border-l-2 border-primary/30 pl-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h6 className="font-display text-base font-bold text-foreground">
                        {item.nome}
                      </h6>
                      {item.nota && (
                        <span className={cn("diario-nota-badge text-[9px] px-1.5 py-0.5 rounded-full", notaQualidadeMeta[item.nota].className)}>
                          {notaQualidadeMeta[item.nota].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground/80">
                      {item.servicos.length > 0 
                        ? item.servicos.join(" • ") 
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer com contadores e ações */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {hasMedia && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Images className="w-3.5 h-3.5" />
                      {visita.fotoCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      {visita.videoCount}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {footerLink && (
                  <Link
                    to={footerLink}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {footerLabel}
                  </Link>
                )}
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? "Menos" : "Mais"}
                  </button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>

          {/* Conteúdo expandido */}
          <CollapsibleContent>
            <div className="border-t border-border p-4 space-y-5 bg-muted/20">
              {visita.areas.map((area) => {
                const areaNota = statusToNota(area.status_area);
                const trend = getTrend(area);

                return (
                  <section key={area.id} className="rounded-xl border border-border bg-background/80 overflow-hidden">
                    {/* Header da área - destaque forte */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border/50">
                      <h5 className="font-display text-base font-bold text-foreground uppercase tracking-wide">
                        {area.nome_area}
                      </h5>
                      <div className="flex items-center gap-2 shrink-0">
                        {trend === "up" && <ArrowUp className="w-4 h-4 text-primary/70" />}
                        {trend === "down" && <ArrowDown className="w-4 h-4 text-primary" />}
                        {areaNota && <NotaBadge nota={areaNota} />}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Relato */}
                      {area.relato && (
                        <p className="text-sm font-medium text-foreground/80 leading-relaxed">{area.relato}</p>
                      )}

                      {/* Serviços */}
                      {!!area.servicos?.length && (
                        <div>
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Serviços</p>
                          <p className="text-sm font-medium text-foreground/80">
                            {area.servicos.join(" · ")}
                          </p>
                        </div>
                      )}

                      {/* Equipe */}
                      {!!area.equipe.length && (
                        <div>
                          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">
                            <Users className="w-3 h-3 text-primary" />
                            Equipe ({area.equipe.length})
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {area.equipe.map((colaborador) => (
                              <div key={colaborador.id} className="text-sm font-medium text-foreground/80">
                                <span>{colaborador.colaborador_nome}</span>
                                {colaborador.funcao && <span> · {colaborador.funcao}</span>}
                                {colaborador.descricao_atividade && (
                                  <span className="text-xs font-medium text-foreground/70 block pl-0.5">{colaborador.descricao_atividade}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Insumos */}
                      {!!area.insumos.length && (
                        <div>
                          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                            <Package className="w-3 h-3 text-primary" />
                            Insumos
                          </p>
                          <p className="text-sm font-medium text-foreground/80">
                            {area.insumos.map((insumo) => 
                              `${insumo.insumo_nome}${insumo.quantidade ? ` (${insumo.quantidade}${insumo.unidade || ""})` : ""}`
                            ).join(" · ")}
                          </p>
                        </div>
                      )}

                      {/* Máquinas */}
                      {!!area.maquinas.length && (
                        <div>
                          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                            <Wrench className="w-3 h-3 text-primary" />
                            Máquinas
                          </p>
                          <p className="text-sm font-medium text-foreground/80">
                            {area.maquinas.map((m) => m.maquina_nome).join(" · ")}
                          </p>
                        </div>
                      )}

                      {/* Mídias */}
                      {!!area.midias.length && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {area.midias.slice(0, 6).map((midia) => (
                            <button
                              key={midia.id}
                              type="button"
                              className="diario-media-thumb text-left aspect-square"
                              onClick={() => setSelectedMedia(midia)}
                            >
                              {midia.tipo === "video" ? (
                                <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                                  <Video className="w-5 h-5" />
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
                    </div>
                  </section>
                );
              })}

              {/* Observações internas */}
              {!hideInternalNotes && canViewInternalNotes && visita.observacoes_internas && (
                <section className="rounded-xl border border-border bg-muted/50 p-4">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-foreground uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Observações internas
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground/80">
                    {visita.observacoes_internas}
                  </p>
                </section>
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
