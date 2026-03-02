import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Etapa {
  id?: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  ordem: number;
}

interface ProcessoForm {
  id?: string;
  area_id: string;
  titulo: string;
  descricao: string;
  objetivo: string;
  etapas: Etapa[];
}

const emptyForm: ProcessoForm = {
  area_id: "",
  titulo: "",
  descricao: "",
  objetivo: "",
  etapas: [],
};

export default function ProcessosInternos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProcessoForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; titulo: string } | null>(null);

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, nome, cor")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  // Fetch processos with etapas
  const { data: processos = [], isLoading } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*, processo_etapas(*)")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  // Group by area
  const groupedByArea = areas
    .map((area) => ({
      ...area,
      processos: processos.filter((p: any) => p.area_id === area.id),
    }))
    .filter((g) => g.processos.length > 0 || isAdmin);

  // Save processo
  const saveMutation = useMutation({
    mutationFn: async (data: ProcessoForm) => {
      const { etapas, id, ...processoData } = data;

      if (id) {
        // Update
        const { error } = await supabase.from("processos").update(processoData).eq("id", id);
        if (error) throw error;

        // Delete old etapas and re-insert
        await supabase.from("processo_etapas").delete().eq("processo_id", id);
        if (etapas.length > 0) {
          const { error: etapaErr } = await supabase.from("processo_etapas").insert(
            etapas.map((e, i) => ({
              processo_id: id,
              titulo: e.titulo,
              descricao: e.descricao || null,
              responsavel: e.responsavel || null,
              ordem: i,
            }))
          );
          if (etapaErr) throw etapaErr;
        }
      } else {
        // Insert
        const { data: newProcesso, error } = await supabase
          .from("processos")
          .insert(processoData)
          .select("id")
          .single();
        if (error) throw error;

        if (etapas.length > 0) {
          const { error: etapaErr } = await supabase.from("processo_etapas").insert(
            etapas.map((e, i) => ({
              processo_id: newProcesso.id,
              titulo: e.titulo,
              descricao: e.descricao || null,
              responsavel: e.responsavel || null,
              ordem: i,
            }))
          );
          if (etapaErr) throw etapaErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setShowForm(false);
      setForm(emptyForm);
      toast({ title: "Processo salvo com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar processo", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("processos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setDeleteTarget(null);
      toast({ title: "Processo excluído" });
    },
  });

  const handleEdit = (processo: any) => {
    setForm({
      id: processo.id,
      area_id: processo.area_id,
      titulo: processo.titulo,
      descricao: processo.descricao || "",
      objetivo: processo.objetivo || "",
      etapas: (processo.processo_etapas || [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((e: any) => ({
          id: e.id,
          titulo: e.titulo,
          descricao: e.descricao || "",
          responsavel: e.responsavel || "",
          ordem: e.ordem,
        })),
    });
    setShowForm(true);
  };

  const addEtapa = () => {
    setForm((prev) => ({
      ...prev,
      etapas: [...prev.etapas, { titulo: "", descricao: "", responsavel: "", ordem: prev.etapas.length }],
    }));
  };

  const updateEtapa = (index: number, field: keyof Etapa, value: string) => {
    setForm((prev) => ({
      ...prev,
      etapas: prev.etapas.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }));
  };

  const removeEtapa = (index: number) => {
    setForm((prev) => ({
      ...prev,
      etapas: prev.etapas.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground font-serif">Processos Internos</h1>
              <p className="text-sm text-muted-foreground">Documentação de processos por área</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="terracota"
              onClick={() => {
                setForm(emptyForm);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Novo Processo
            </Button>
          )}
        </div>

        {/* Processos grouped by area */}
        {groupedByArea.length === 0 ? (
          <div className="card-botanical p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum processo cadastrado ainda</p>
            {isAdmin && (
              <Button variant="terracota" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
                <Plus className="w-4 h-4" />
                Criar primeiro processo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByArea.map((area) => (
              <section key={area.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: area.cor || "hsl(var(--primary))" }}
                  />
                  <h2 className="font-display text-lg font-semibold text-foreground">{area.nome}</h2>
                  <Badge variant="outline" className="text-xs">
                    {area.processos.length} processo{area.processos.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {area.processos.map((processo: any) => {
                    const isExpanded = expandedId === processo.id;
                    const etapas = (processo.processo_etapas || []).sort(
                      (a: any, b: any) => a.ordem - b.ordem
                    );

                    return (
                      <div key={processo.id} className="card-botanical overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : processo.id)}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{processo.titulo}</p>
                            {processo.objetivo && (
                              <p className="text-xs text-muted-foreground mt-0.5">{processo.objetivo}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {etapas.length} etapa{etapas.length !== 1 ? "s" : ""}
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border p-4 space-y-4">
                            {processo.descricao && (
                              <p className="text-sm text-muted-foreground">{processo.descricao}</p>
                            )}

                            {etapas.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Etapas
                                </p>
                                {etapas.map((etapa: any, i: number) => (
                                  <div
                                    key={etapa.id}
                                    className="flex gap-3 p-3 rounded-lg bg-muted/50"
                                  >
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                      {i + 1}
                                    </span>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {etapa.titulo}
                                      </p>
                                      {etapa.descricao && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {etapa.descricao}
                                        </p>
                                      )}
                                      {etapa.responsavel && (
                                        <p className="text-xs text-primary mt-0.5">
                                          Responsável: {etapa.responsavel}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isAdmin && (
                              <div className="flex gap-2 pt-2 border-t border-border">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(processo)}
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setDeleteTarget({ id: processo.id, titulo: processo.titulo })
                                  }
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Excluir
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Processo" : "Novo Processo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Área *</label>
              <Select value={form.area_id} onValueChange={(v) => setForm((p) => ({ ...p, area_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Título *</label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Nome do processo"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Objetivo</label>
              <Input
                value={form.objetivo}
                onChange={(e) => setForm((p) => ({ ...p, objetivo: e.target.value }))}
                placeholder="Qual o objetivo deste processo?"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                placeholder="Descrição detalhada..."
                rows={3}
              />
            </div>

            {/* Etapas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Etapas</label>
                <Button variant="outline" size="sm" onClick={addEtapa}>
                  <Plus className="w-3 h-3" />
                  Adicionar Etapa
                </Button>
              </div>
              <div className="space-y-3">
                {form.etapas.map((etapa, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Etapa {i + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => removeEtapa(i)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={etapa.titulo}
                      onChange={(e) => updateEtapa(i, "titulo", e.target.value)}
                      placeholder="Título da etapa"
                    />
                    <Textarea
                      value={etapa.descricao}
                      onChange={(e) => updateEtapa(i, "descricao", e.target.value)}
                      placeholder="Descrição / instruções"
                      rows={2}
                    />
                    <Input
                      value={etapa.responsavel}
                      onChange={(e) => updateEtapa(i, "responsavel", e.target.value)}
                      placeholder="Responsável (opcional)"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              variant="terracota"
              disabled={!form.area_id || !form.titulo || saveMutation.isPending}
              onClick={() => saveMutation.mutate(form)}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
            <AlertDialogDescription>
              O processo "{deleteTarget?.titulo}" e todas as suas etapas serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
