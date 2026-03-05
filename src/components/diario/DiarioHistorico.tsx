import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, Image as ImageIcon, Lock, Pencil, Trash2, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useHighestRole } from "@/hooks/useAuth";
import { MAINTENANCE_PAGE_SIZE, MaintenanceRecord, useDeleteMaintenanceRecord, useMaintenanceHistory, useMaintenanceProjects } from "@/hooks/useDiarioManutencao";
import { cn } from "@/lib/utils";

interface DiarioHistoricoProps {
  scopeProjectId?: string;
  onEdit: (record: MaintenanceRecord) => void;
}

const moodLabels: Record<string, string> = {
  otimo: "😊 Ótimo",
  bom: "🙂 Bom",
  atencao: "😐 Requer atenção",
  critico: "😟 Crítico",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  finalizado: "Finalizado",
};

export function DiarioHistorico({ scopeProjectId, onEdit }: DiarioHistoricoProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const highestRole = useHighestRole(user?.id);
  const canViewInternalNotes = highestRole !== "operador_campo" && highestRole !== "arquitetura";
  const canDelete = highestRole === "admin";
  const canEditAll = highestRole === "admin" || highestRole === "gestao_campo";

  const [filters, setFilters] = useState({
    projectId: scopeProjectId || "todos",
    status: "todos",
    startDate: "",
    endDate: "",
    page: 1,
  });
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [photoZoom, setPhotoZoom] = useState<{ url: string; title: string } | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);

  const { data: projects = [] } = useMaintenanceProjects(scopeProjectId);
  const deleteMutation = useDeleteMaintenanceRecord();
  const historyQuery = useMaintenanceHistory({
    projectId: filters.projectId === "todos" ? undefined : filters.projectId,
    status: filters.status,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    page: filters.page,
  });

  const records = historyQuery.data?.records || [];
  const totalPages = historyQuery.data?.totalPages || 1;
  const total = historyQuery.data?.total || 0;

  const visibleRecords = useMemo(
    () => records.map((record) => ({ ...record, canEdit: canEditAll || record.created_by === user?.id })),
    [records, canEditAll, user?.id]
  );

  return (
    <div className="space-y-6">
      <div className="card-botanical p-4 sm:p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {!scopeProjectId && (
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={filters.projectId} onValueChange={(value) => setFilters((current) => ({ ...current, projectId: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>De</Label>
            <Input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value, page: 1 }))} />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value, page: 1 }))} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{total} registro(s) encontrados</span>
          <span>{MAINTENANCE_PAGE_SIZE} por página</span>
        </div>
      </div>

      <div className="space-y-3">
        {historyQuery.isLoading && <div className="card-botanical p-6 text-sm text-muted-foreground">Carregando histórico...</div>}

        {!historyQuery.isLoading && visibleRecords.length === 0 && (
          <div className="card-botanical p-8 text-center">
            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h3 className="font-display text-lg font-semibold">Nenhum registro encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie a primeira visita.</p>
          </div>
        )}

        {visibleRecords.map((record) => (
          <button
            key={record.id}
            type="button"
            onClick={() => setSelectedRecord(record)}
            className="card-botanical w-full p-4 text-left transition-all hover:-translate-y-0.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{format(parseISO(record.data_servico), "dd/MM/yyyy", { locale: ptBR })}</span>
                  {record.hora_servico && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {record.hora_servico.slice(0, 5)}
                    </span>
                  )}
                  <Badge variant="outline">{statusLabels[record.status] || record.status}</Badge>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{record.projeto_titulo || "Projeto de manutenção"}</h3>
                {record.trecho_nome && <p className="text-sm text-muted-foreground">{record.trecho_nome}</p>}
              </div>
              <span className="inline-flex items-center gap-2 text-sm text-primary">
                <Eye className="h-4 w-4" />
                Ver detalhes
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3.5 w-3.5" />
                {(record.equipe_nomes || []).join(", ") || "Sem equipe"}
              </Badge>
              {(record.categoria_nomes || []).map((name) => (
                <Badge key={name} variant="outline">{name}</Badge>
              ))}
              {record.humor_do_jardim && <Badge variant="outline">{moodLabels[record.humor_do_jardim] || record.humor_do_jardim}</Badge>}
              <Badge variant="outline" className="gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {record.midia.length} foto(s)
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {filters.page} de {totalPages}</span>
          <Button type="button" variant="outline" disabled={filters.page >= totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>
            Próxima
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.projeto_titulo || "Registro de manutenção"}</DialogTitle>
            <DialogDescription>
              {selectedRecord && format(parseISO(selectedRecord.data_servico), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Equipe</p>
                  <p className="mt-1 text-sm">{(selectedRecord.equipe_nomes || []).join(", ") || "Sem equipe informada"}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Serviços</p>
                  <p className="mt-1 text-sm">{(selectedRecord.categoria_nomes || []).join(" • ") || "Sem categorias"}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Estado do jardim</p>
                  <p className="mt-1 text-sm">{moodLabels[selectedRecord.humor_do_jardim || ""] || "Não informado"}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                  <p className="mt-1 text-sm">{statusLabels[selectedRecord.status] || selectedRecord.status}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Descrição</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selectedRecord.descricao}</p>
              </div>

              {canViewInternalNotes && selectedRecord.observacoes_internas && (
                <div className="rounded-xl border border-primary/15 bg-secondary/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Observações internas
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selectedRecord.observacoes_internas}</p>
                </div>
              )}

              {(selectedRecord.insumos?.length || selectedRecord.maquinas?.length) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedRecord.insumos && selectedRecord.insumos.length > 0 && (
                    <div className="rounded-xl border p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Insumos</p>
                      <div className="mt-2 space-y-2 text-sm">
                        {selectedRecord.insumos.map((entry) => (
                          <p key={entry.id || entry.insumo_id}>{entry.nome} · {entry.quantidade} {entry.unidade || "un"}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedRecord.maquinas && selectedRecord.maquinas.length > 0 && (
                    <div className="rounded-xl border p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Máquinas</p>
                      <div className="mt-2 space-y-2 text-sm">
                        {selectedRecord.maquinas.map((entry) => (
                          <p key={entry.id || entry.maquina_id}>{entry.nome} · {entry.horas_utilizadas}h</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {selectedRecord.midia.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Fotos</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedRecord.midia.map((media) => (
                      <button key={media.url} type="button" className="overflow-hidden rounded-xl border bg-muted aspect-square" onClick={() => setPhotoZoom({ url: media.previewUrl || media.url, title: media.nome || "Foto da visita" })}>
                        <img src={media.previewUrl || media.url} alt={media.nome || "Foto da visita"} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {(canEditAll || selectedRecord.created_by === user?.id) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedRecord(null);
                      onEdit(selectedRecord);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRecordToDelete(selectedRecord)}>
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!photoZoom} onOpenChange={(open) => !open && setPhotoZoom(null)}>
        <DialogContent className="max-w-4xl p-3">
          <DialogTitle className="sr-only">{photoZoom?.title || "Foto"}</DialogTitle>
          {photoZoom && <img src={photoZoom.url} alt={photoZoom.title} className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação remove o registro e os recursos vinculados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={() => {
                if (!recordToDelete) return;
                deleteMutation.mutate(recordToDelete.id, {
                  onSuccess: () => {
                    toast({ title: "Registro excluído" });
                    setSelectedRecord(null);
                    setRecordToDelete(null);
                  },
                  onError: (error: any) => {
                    toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
                  },
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
