import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Loader2,
  Calendar,
  Users,
  Clock,
  Camera,
  Scissors,
  Droplets,
  Leaf,
  Bug,
  Trash2,
  ChevronDown,
  ChevronRight,
  Wrench,
  Package,
  AlertTriangle,
  X,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import {
  useManutencaoVisitas,
  useManutencaoServicos,
  useManutencaoRecursos,
  useSaveManutencaoVisita,
  useDeleteManutencaoVisita,
  servicoTipos,
  servicoTipoLabels,
  ManutencaoServico,
  ManutencaoRecurso,
} from "@/hooks/useManutencaoVisitas";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useMaquinas } from "@/hooks/useMaquinas";
import { useInsumos } from "@/hooks/useInsumos";
import { MidiaUpload } from "@/components/MidiaUpload";
import { FilePreview } from "@/components/projeto/FilePreview";
import { cn } from "@/lib/utils";

interface DiarioManutencaoTabProps {
  projetoId: string;
  clienteId: string;
}

const servicoIcons: Record<string, React.ReactNode> = {
  poda_geral: <Scissors className="w-3.5 h-3.5" />,
  poda_finos: <Scissors className="w-3.5 h-3.5" />,
  poda_palmeiras: <Scissors className="w-3.5 h-3.5" />,
  adubacao: <Leaf className="w-3.5 h-3.5" />,
  irrigacao_verificacao: <Droplets className="w-3.5 h-3.5" />,
  irrigacao_regulagem: <Droplets className="w-3.5 h-3.5" />,
  irrigacao_reparo: <Droplets className="w-3.5 h-3.5" />,
  limpeza: <Leaf className="w-3.5 h-3.5" />,
  replantio: <Leaf className="w-3.5 h-3.5" />,
  controle_fitossanitario: <Bug className="w-3.5 h-3.5" />,
  outro: <Wrench className="w-3.5 h-3.5" />,
};

export function DiarioManutencaoTab({ projetoId, clienteId }: DiarioManutencaoTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: visitas = [], isLoading } = useManutencaoVisitas(projetoId);
  const visitaIds = visitas.map((v) => v.id);
  const { data: allServicos = [] } = useManutencaoServicos(visitaIds);
  const { data: allRecursos = [] } = useManutencaoRecursos(visitaIds);
  const { data: colaboradores = [] } = useColaboradores();
  const { data: maquinas = [] } = useMaquinas();
  const { data: insumos = [] } = useInsumos();

  const saveMutation = useSaveManutencaoVisita();
  const deleteMutation = useDeleteManutencaoVisita();

  const [showForm, setShowForm] = useState(false);
  const [expandedVisita, setExpandedVisita] = useState<string | null>(null);
  const [visitaToDelete, setVisitaToDelete] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    data_visita: format(new Date(), "yyyy-MM-dd"),
    equipe_ids: [] as string[],
    horas_trabalhadas: "",
    ocorrencias: "",
    observacoes_internas: "",
    midia: [] as { url: string; tipo: string; nome: string }[],
  });
  const [formServicos, setFormServicos] = useState<Record<string, { checked: boolean; descricao: string; quantidade: string; unidade: string }>>({});
  const [formRecursosMaquinas, setFormRecursosMaquinas] = useState<{ maquina_id: string; horas_uso: string }[]>([]);
  const [formRecursosInsumos, setFormRecursosInsumos] = useState<{ insumo_id: string; quantidade: string; unidade: string }[]>([]);

  // Colaboradores map
  const colabMap = useMemo(() => new Map(colaboradores.map((c) => [c.id, c.nome])), [colaboradores]);
  const maquinaMap = useMemo(() => new Map(maquinas.map((m) => [m.id, m.nome])), [maquinas]);
  const insumoMap = useMemo(() => new Map(insumos.map((i) => [i.id, i.nome])), [insumos]);

  // Filter visitas
  const filteredVisitas = useMemo(() => {
    if (filterPeriod === "all") return visitas;
    const now = new Date();
    const monthsBack = filterPeriod === "1m" ? 1 : filterPeriod === "3m" ? 3 : 6;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    return visitas.filter((v) => parseISO(v.data_visita) >= cutoff);
  }, [visitas, filterPeriod]);

  const resetForm = () => {
    setFormData({
      data_visita: format(new Date(), "yyyy-MM-dd"),
      equipe_ids: [],
      horas_trabalhadas: "",
      ocorrencias: "",
      observacoes_internas: "",
      midia: [],
    });
    setFormServicos({});
    setFormRecursosMaquinas([]);
    setFormRecursosInsumos([]);
  };

  const handleSubmit = () => {
    if (!formData.data_visita) {
      toast({ title: "Informe a data da visita", variant: "destructive" });
      return;
    }
    if (formData.equipe_ids.length === 0) {
      toast({ title: "Selecione ao menos 1 membro da equipe", variant: "destructive" });
      return;
    }
    if (!formData.horas_trabalhadas) {
      toast({ title: "Informe as horas trabalhadas", variant: "destructive" });
      return;
    }
    if (formData.midia.length === 0) {
      toast({ title: "Adicione ao menos 1 foto", variant: "destructive" });
      return;
    }

    const servicos: ManutencaoServico[] = Object.entries(formServicos)
      .filter(([_, v]) => v.checked)
      .map(([tipo, v]) => ({
        tipo,
        descricao: v.descricao || null,
        quantidade: v.quantidade ? parseFloat(v.quantidade) : null,
        unidade: v.unidade || null,
      }));

    const recursos: ManutencaoRecurso[] = [
      ...formRecursosMaquinas
        .filter((r) => r.maquina_id)
        .map((r) => ({
          tipo: "maquina" as const,
          maquina_id: r.maquina_id,
          horas_uso: r.horas_uso ? parseFloat(r.horas_uso) : null,
        })),
      ...formRecursosInsumos
        .filter((r) => r.insumo_id)
        .map((r) => ({
          tipo: "insumo" as const,
          insumo_id: r.insumo_id,
          quantidade: r.quantidade ? parseFloat(r.quantidade) : null,
          unidade: r.unidade || null,
        })),
    ];

    saveMutation.mutate(
      {
        projetoId,
        data_visita: formData.data_visita,
        equipe_ids: formData.equipe_ids,
        horas_trabalhadas: parseFloat(formData.horas_trabalhadas),
        ocorrencias: formData.ocorrencias,
        observacoes_internas: formData.observacoes_internas,
        midia: formData.midia,
        servicos,
        recursos,
      },
      {
        onSuccess: () => {
          toast({ title: "Visita registrada com sucesso!" });
          setShowForm(false);
          resetForm();
        },
        onError: () => {
          toast({ title: "Erro ao salvar visita", variant: "destructive" });
        },
      }
    );
  };

  const toggleEquipeMember = (id: string) => {
    setFormData((f) => ({
      ...f,
      equipe_ids: f.equipe_ids.includes(id)
        ? f.equipe_ids.filter((x) => x !== id)
        : [...f.equipe_ids, id],
    }));
  };

  const toggleServico = (tipo: string) => {
    setFormServicos((prev) => ({
      ...prev,
      [tipo]: {
        checked: !prev[tipo]?.checked,
        descricao: prev[tipo]?.descricao || "",
        quantidade: prev[tipo]?.quantidade || "",
        unidade: prev[tipo]?.unidade || "",
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Diário de Manutenção
          </h3>
          <Badge variant="outline" className="text-xs">
            {visitas.length} visita{visitas.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="1m">Último mês</SelectItem>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="terracota" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {filteredVisitas.length === 0 ? (
        <div className="card-botanical p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">Nenhuma visita registrada</p>
          <Button variant="terracota" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Registrar primeira visita
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {filteredVisitas.map((visita) => {
              const servicos = allServicos.filter((s) => s.visita_id === visita.id);
              const recursos = allRecursos.filter((r) => r.visita_id === visita.id);
              const isExpanded = expandedVisita === visita.id;
              const fotos = (visita.midia || []).filter((m) => m.tipo?.startsWith("image"));

              return (
                <div key={visita.id} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className="absolute left-3.5 top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                  <div className="card-botanical overflow-hidden">
                    <button
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedVisita(isExpanded ? null : visita.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-display font-semibold text-foreground">
                            {format(parseISO(visita.data_visita), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>{visita.equipe_ids.length}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{visita.horas_trabalhadas}h</span>
                          </div>
                          {fotos.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Camera className="w-3.5 h-3.5" />
                              <span>{fotos.length}</span>
                            </div>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Service badges summary */}
                      {servicos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {servicos.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs gap-1">
                              {servicoIcons[s.tipo]}
                              {servicoTipoLabels[s.tipo] || s.tipo}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t p-4 space-y-4">
                        {/* Equipe */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Equipe</p>
                          <div className="flex flex-wrap gap-1.5">
                            {visita.equipe_ids.map((id) => (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {colabMap.get(id) || "—"}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Serviços detalhados */}
                        {servicos.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Serviços</p>
                            <div className="space-y-1.5">
                              {servicos.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  {servicoIcons[s.tipo]}
                                  <span className="font-medium">{servicoTipoLabels[s.tipo] || s.tipo}</span>
                                  {s.quantidade && (
                                    <span className="text-muted-foreground">
                                      — {s.quantidade} {s.unidade}
                                    </span>
                                  )}
                                  {s.descricao && (
                                    <span className="text-muted-foreground">({s.descricao})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recursos */}
                        {recursos.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recursos</p>
                            <div className="space-y-1.5">
                              {recursos.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  {r.tipo === "maquina" ? (
                                    <Wrench className="w-3.5 h-3.5" />
                                  ) : (
                                    <Package className="w-3.5 h-3.5" />
                                  )}
                                  <span className="font-medium">
                                    {r.tipo === "maquina"
                                      ? maquinaMap.get(r.maquina_id || "") || "—"
                                      : insumoMap.get(r.insumo_id || "") || "—"}
                                  </span>
                                  {r.tipo === "maquina" && r.horas_uso && (
                                    <span className="text-muted-foreground">{r.horas_uso}h</span>
                                  )}
                                  {r.tipo === "insumo" && r.quantidade && (
                                    <span className="text-muted-foreground">
                                      {r.quantidade} {r.unidade}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ocorrências */}
                        {visita.ocorrencias && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Ocorrências
                            </p>
                            <p className="text-sm text-foreground">{visita.ocorrencias}</p>
                          </div>
                        )}

                        {/* Fotos */}
                        {fotos.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Fotos</p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {fotos.slice(0, 6).map((foto, i) => (
                                <FilePreview key={i} nome={foto.nome} url={foto.url} tipo={foto.tipo} bucket="registros-midia" />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Delete */}
                        {isAdmin && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setVisitaToDelete(visita.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir registro
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== NEW VISIT DIALOG ===== */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Registro de Manutenção</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Data e Horas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da visita *</Label>
                <Input
                  type="date"
                  value={formData.data_visita}
                  onChange={(e) => setFormData((f) => ({ ...f, data_visita: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Horas trabalhadas *</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 8"
                  value={formData.horas_trabalhadas}
                  onChange={(e) => setFormData((f) => ({ ...f, horas_trabalhadas: e.target.value }))}
                />
              </div>
            </div>

            {/* Equipe */}
            <div className="space-y-2">
              <Label>Equipe presente *</Label>
              <div className="flex flex-wrap gap-2">
                {colaboradores
                  .filter((c) => c.ativo)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleEquipeMember(c.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-colors",
                        formData.equipe_ids.includes(c.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      )}
                    >
                      {c.nome}
                    </button>
                  ))}
              </div>
            </div>

            {/* Serviços */}
            <div className="space-y-3">
              <Label>Serviços executados</Label>
              <div className="space-y-2">
                {servicoTipos.map((tipo) => {
                  const st = formServicos[tipo.value];
                  const isChecked = st?.checked || false;

                  return (
                    <div key={tipo.value} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`srv-${tipo.value}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleServico(tipo.value)}
                        />
                        <label
                          htmlFor={`srv-${tipo.value}`}
                          className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                        >
                          {servicoIcons[tipo.value]}
                          {tipo.label}
                        </label>
                      </div>
                      {isChecked && (
                        <div className="ml-6 grid grid-cols-3 gap-2">
                          {(tipo.value === "adubacao" || tipo.value === "replantio" || tipo.value === "controle_fitossanitario") && (
                            <>
                              <Input
                                placeholder={tipo.value === "adubacao" ? "Tipo de adubo" : tipo.value === "replantio" ? "Espécie" : "Produto"}
                                value={st?.descricao || ""}
                                onChange={(e) =>
                                  setFormServicos((p) => ({
                                    ...p,
                                    [tipo.value]: { ...p[tipo.value], descricao: e.target.value },
                                  }))
                                }
                                className="text-sm"
                              />
                              <Input
                                placeholder="Qtd"
                                type="number"
                                value={st?.quantidade || ""}
                                onChange={(e) =>
                                  setFormServicos((p) => ({
                                    ...p,
                                    [tipo.value]: { ...p[tipo.value], quantidade: e.target.value },
                                  }))
                                }
                                className="text-sm"
                              />
                              <Input
                                placeholder="Unidade"
                                value={st?.unidade || ""}
                                onChange={(e) =>
                                  setFormServicos((p) => ({
                                    ...p,
                                    [tipo.value]: { ...p[tipo.value], unidade: e.target.value },
                                  }))
                                }
                                className="text-sm"
                              />
                            </>
                          )}
                          {tipo.value === "outro" && (
                            <Input
                              placeholder="Descreva o serviço"
                              value={st?.descricao || ""}
                              onChange={(e) =>
                                setFormServicos((p) => ({
                                  ...p,
                                  [tipo.value]: { ...p[tipo.value], descricao: e.target.value },
                                }))
                              }
                              className="col-span-3 text-sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Máquinas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Máquinas utilizadas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormRecursosMaquinas((p) => [...p, { maquina_id: "", horas_uso: "" }])
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> Máquina
                </Button>
              </div>
              {formRecursosMaquinas.map((rm, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={rm.maquina_id}
                    onValueChange={(v) =>
                      setFormRecursosMaquinas((p) =>
                        p.map((x, j) => (j === i ? { ...x, maquina_id: v } : x))
                      )
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinas
                        .filter((m) => m.ativo)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-24"
                    placeholder="Horas"
                    type="number"
                    step="0.5"
                    value={rm.horas_uso}
                    onChange={(e) =>
                      setFormRecursosMaquinas((p) =>
                        p.map((x, j) => (j === i ? { ...x, horas_uso: e.target.value } : x))
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormRecursosMaquinas((p) => p.filter((_, j) => j !== i))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Insumos consumidos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Insumos consumidos</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormRecursosInsumos((p) => [...p, { insumo_id: "", quantidade: "", unidade: "" }])
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> Insumo
                </Button>
              </div>
              {formRecursosInsumos.map((ri, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={ri.insumo_id}
                    onValueChange={(v) => {
                      const ins = insumos.find((x) => x.id === v);
                      setFormRecursosInsumos((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, insumo_id: v, unidade: ins?.unidade || x.unidade } : x
                        )
                      );
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.map((ins) => (
                        <SelectItem key={ins.id} value={ins.id}>
                          {ins.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-20"
                    placeholder="Qtd"
                    type="number"
                    value={ri.quantidade}
                    onChange={(e) =>
                      setFormRecursosInsumos((p) =>
                        p.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    className="w-20"
                    placeholder="Un"
                    value={ri.unidade}
                    onChange={(e) =>
                      setFormRecursosInsumos((p) =>
                        p.map((x, j) => (j === i ? { ...x, unidade: e.target.value } : x))
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormRecursosInsumos((p) => p.filter((_, j) => j !== i))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Fotos */}
            <div className="space-y-2">
              <Label>Fotos do jardim * (mín. 1)</Label>
              <MidiaUpload
                bucket="registros-midia"
                value={formData.midia}
                onChange={(midia) => setFormData((f) => ({ ...f, midia }))}
                maxFiles={20}
              />
            </div>

            {/* Ocorrências */}
            <div className="space-y-2">
              <Label>Ocorrências ou problemas encontrados</Label>
              <Textarea
                value={formData.ocorrencias}
                onChange={(e) => setFormData((f) => ({ ...f, ocorrencias: e.target.value }))}
                placeholder="Descreva problemas, pragas, danos, etc."
                rows={3}
              />
            </div>

            {/* Observações internas */}
            <div className="space-y-2">
              <Label>Observações internas (não aparece no relatório)</Label>
              <Textarea
                value={formData.observacoes_internas}
                onChange={(e) => setFormData((f) => ({ ...f, observacoes_internas: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              variant="terracota"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!visitaToDelete} onOpenChange={() => setVisitaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (visitaToDelete) {
                  deleteMutation.mutate(
                    { id: visitaToDelete, projetoId },
                    {
                      onSuccess: () => {
                        toast({ title: "Registro excluído" });
                        setVisitaToDelete(null);
                      },
                    }
                  );
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
