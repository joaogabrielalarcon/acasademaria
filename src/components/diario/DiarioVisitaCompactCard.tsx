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

interface DiarioVisitaCompactCardProps {
  visita: DiarioVisitaDetalhe;
  canViewInternalNotes?: boolean;
  hideInternalNotes?: boolean;
  footerLink?: string;
  footerLabel?: string;
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

export function DiarioVisitaCompactCard({
  visita,
  canViewInternalNotes = false,
  hideInternalNotes = false,
  footerLink,
  footerLabel = "Ver no diário →",
}: DiarioVisitaCompactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
        <article className="card-botanical overflow-hidden h-full flex flex-col">
          {/* Header compacto */}
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base font-bold text-foreground truncate">
                {formatDate(visita.data_visita)}
              </span>
              {visitNota && <NotaBadge nota={visitNota} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatPeriodo(visita)}</p>
          </div>

          {/* Conteúdo principal - Estrutura reorganizada */}
          <div className="p-3 flex-1 space-y-3">
            {/* Equipe: título + contador + nomes lado a lado */}
            {visita.equipeResumo.length > 0 && (
              <div>
                <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-foreground mb-1">
                  <Users className="w-3 h-3 text-primary" />
                  Equipe ({visita.equipeResumo.length})
                </p>
                <p className="text-xs text-muted-foreground">
                  {visita.equipeResumo.join(" · ")}
                </p>
              </div>
            )}

            {/* Serviços por área: cada área numa linha */}
            {servicosPorArea.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Serviços</p>
                {servicosPorArea.map((item) => (
                  <div key={item.nome} className="border-l-2 border-primary/30 pl-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h6 className="font-display text-sm font-bold text-foreground">
                        {item.nome}
                      </h6>
                      {item.nota && (
                        <span className={cn("diario-nota-badge text-[9px] w-4 h-4", notaQualidadeMeta[item.nota].className)}>
                          {item.nota}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
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
                const areaNota = statusToNota(area.status_area);
                const trend = getTrend(area);

                return (
                  <section key={area.id} className="rounded-xl border border-border bg-background/80 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h5 className="font-display text-sm font-semibold text-foreground">{area.nome_area}</h5>
                      <div className="flex items-center gap-1.5">
                        {trend === "up" && <ArrowUp className="w-3 h-3 text-success" />}
                        {trend === "down" && <ArrowDown className="w-3 h-3 text-primary" />}
                        {areaNota && <NotaBadge nota={areaNota} />}
                      </div>
                    </div>

                    {/* Relato/Descrição do serviço */}
                    {area.relato && (
                      <p className="text-xs text-muted-foreground mb-2">{area.relato}</p>
                    )}

                    {/* Serviços detalhados */}
                    {!!area.servicos?.length && (
                      <div className="mb-2">
                        <p className="text-[10px] font-medium text-foreground mb-1">Serviços realizados:</p>
                        <p className="text-xs text-muted-foreground">
                          {area.servicos.join(" • ")}
                        </p>
                      </div>
                    )}

                    {/* Equipe da área */}
                    {!!area.equipe.length && (
                      <div className="mb-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground mb-1">
                          <Users className="w-3 h-3 text-primary" />
                          Equipe ({area.equipe.length})
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
                      <div className="mb-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground mb-1">
                          <Package className="w-3 h-3 text-primary" />
                          Insumos
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {area.insumos.map((insumo) => 
                            `${insumo.insumo_nome}${insumo.quantidade ? ` (${insumo.quantidade}${insumo.unidade || ""})` : ""}`
                          ).join(" • ")}
                        </p>
                      </div>
                    )}

                    {/* Máquinas */}
                    {!!area.maquinas.length && (
                      <div className="mb-2">
                        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground mb-1">
                          <Wrench className="w-3 h-3 text-primary" />
                          Máquinas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {area.maquinas.map((m) => m.maquina_nome).join(" • ")}
                        </p>
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
                  <p className="mt-1 text-[10px] text-muted-foreground">
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
