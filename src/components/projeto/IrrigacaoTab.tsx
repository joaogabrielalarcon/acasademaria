import { useState } from "react";
import { Plus, Droplets, Clock, History, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  useIrrigacaoSetores,
  useIrrigacaoHistorico,
  useAddSetor,
  useUpdateSetorTempo,
  useDeleteSetor,
  type IrrigacaoSetor,
} from "@/hooks/useIrrigacao";
import { useColaboradoresAtivosBasico } from "@/hooks/useColaboradores";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IrrigacaoTabProps {
  projetoId: string;
}

export function IrrigacaoTab({ projetoId }: IrrigacaoTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: setores = [], isLoading } = useIrrigacaoSetores(projetoId);
  const { data: colaboradores = [] } = useColaboradoresAtivosBasico();
  const addSetor = useAddSetor(projetoId);
  const updateTempo = useUpdateSetorTempo(projetoId);
  const deleteSetor = useDeleteSetor(projetoId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<IrrigacaoSetor | null>(null);
  const [showTempoDialog, setShowTempoDialog] = useState(false);
  const [tempoSetor, setTempoSetor] = useState<IrrigacaoSetor | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({ nome: "", descricao: "", tempo: "0" });
  // Tempo form
  const [tempoForm, setTempoForm] = useState({ novoTempo: "", observacao: "" });

  const handleAddSetor = async () => {
    if (!addForm.nome.trim()) return;
    try {
      await addSetor.mutateAsync({
        nome: addForm.nome.trim(),
        descricao_area: addForm.descricao.trim() || undefined,
        tempo_atual_minutos: parseInt(addForm.tempo) || 0,
      });
      toast({ title: "Setor adicionado" });
      setShowAddDialog(false);
      setAddForm({ nome: "", descricao: "", tempo: "0" });
    } catch {
      toast({ title: "Erro ao adicionar setor", variant: "destructive" });
    }
  };

  const handleAlterarTempo = async () => {
    if (!tempoSetor || !tempoForm.novoTempo) return;
    const novoTempo = parseInt(tempoForm.novoTempo);
    if (isNaN(novoTempo) || novoTempo < 0) return;

    try {
      await updateTempo.mutateAsync({
        setorId: tempoSetor.id,
        tempoAnterior: tempoSetor.tempo_atual_minutos,
        tempoNovo: novoTempo,
        observacao: tempoForm.observacao.trim() || undefined,
      });
      toast({ title: "Tempo atualizado" });
      setShowTempoDialog(false);
      setTempoForm({ novoTempo: "", observacao: "" });
      setTempoSetor(null);
      // Refresh selected setor if open
      if (selectedSetor?.id === tempoSetor.id) {
        setSelectedSetor({ ...tempoSetor, tempo_atual_minutos: novoTempo });
      }
    } catch {
      toast({ title: "Erro ao atualizar tempo", variant: "destructive" });
    }
  };

  const handleDeleteSetor = async (setor: IrrigacaoSetor) => {
    try {
      await deleteSetor.mutateAsync(setor.id);
      toast({ title: "Setor removido" });
      if (selectedSetor?.id === setor.id) setSelectedSetor(null);
    } catch {
      toast({ title: "Erro ao remover setor", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1E4D3A" }}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Irrigação</h2>
            <p className="text-sm text-muted-foreground">{setores.length} setor(es) cadastrado(s)</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="gap-2"
          style={{ backgroundColor: "#B93C2A" }}
        >
          <Plus className="w-4 h-4" />
          Adicionar Setor
        </Button>
      </div>

      {/* Setores List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : setores.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center" style={{ borderColor: "#1E4D3A40" }}>
          <Droplets className="w-12 h-12 mx-auto mb-4" style={{ color: "#1E4D3A" }} />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Nenhum setor de irrigação</h3>
          <p className="text-sm text-muted-foreground mb-4">Cadastre os setores de irrigação deste projeto para controlar os tempos.</p>
          <Button onClick={() => setShowAddDialog(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Primeiro Setor
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {setores.map((setor) => (
            <div
              key={setor.id}
              className="group rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md"
              style={{ borderColor: "#1E4D3A30", backgroundColor: "#F5EDE0" + "20" }}
              onClick={() => setSelectedSetor(setor)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-semibold text-foreground">{setor.nome}</h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {setor.descricao_area && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{setor.descricao_area}</p>
              )}
              <div className="flex items-center gap-2">
                <Badge
                  className="gap-1 font-mono text-sm"
                  style={{
                    backgroundColor: "#1E4D3A20",
                    color: "#1E4D3A",
                    border: "1px solid #1E4D3A40",
                  }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {setor.tempo_atual_minutos} min
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Setor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Novo Setor de Irrigação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do setor *</Label>
              <Input
                placeholder="Ex: Jardineiras da fachada"
                value={addForm.nome}
                onChange={(e) => setAddForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição da área</Label>
              <Textarea
                placeholder="Descreva a área coberta por este setor..."
                value={addForm.descricao}
                onChange={(e) => setAddForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo inicial (minutos)</Label>
              <Input
                type="number"
                min="0"
                value={addForm.tempo}
                onChange={(e) => setAddForm((f) => ({ ...f, tempo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAddSetor}
              disabled={!addForm.nome.trim() || addSetor.isPending}
              style={{ backgroundColor: "#B93C2A" }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setor Detail Sheet */}
      <Sheet open={!!selectedSetor} onOpenChange={(open) => !open && setSelectedSetor(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedSetor && (
            <SetorDetail
              setor={selectedSetor}
              onAlterarTempo={() => {
                setTempoSetor(selectedSetor);
                setTempoForm({ novoTempo: String(selectedSetor.tempo_atual_minutos), observacao: "" });
                setShowTempoDialog(true);
              }}
              onDelete={() => handleDeleteSetor(selectedSetor)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Alterar Tempo Dialog */}
      <Dialog open={showTempoDialog} onOpenChange={setShowTempoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Alterar Tempo — {tempoSetor?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "#F5EDE0" }}>
              <p className="text-sm text-muted-foreground">Tempo atual</p>
              <p className="text-xl font-bold font-mono" style={{ color: "#1E4D3A" }}>
                {tempoSetor?.tempo_atual_minutos} min
              </p>
            </div>
            <div className="space-y-2">
              <Label>Novo tempo (minutos) *</Label>
              <Input
                type="number"
                min="0"
                value={tempoForm.novoTempo}
                onChange={(e) => setTempoForm((f) => ({ ...f, novoTempo: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                placeholder="Motivo da alteração..."
                value={tempoForm.observacao}
                onChange={(e) => setTempoForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTempoDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleAlterarTempo}
              disabled={!tempoForm.novoTempo || updateTempo.isPending}
              style={{ backgroundColor: "#1E4D3A" }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetorDetail({
  setor,
  onAlterarTempo,
  onDelete,
}: {
  setor: IrrigacaoSetor;
  onAlterarTempo: () => void;
  onDelete: () => void;
}) {
  const { data: historico = [], isLoading } = useIrrigacaoHistorico(setor.id);

  return (
    <div className="space-y-6 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-xl">{setor.nome}</SheetTitle>
      </SheetHeader>

      {setor.descricao_area && (
        <p className="text-sm text-muted-foreground">{setor.descricao_area}</p>
      )}

      {/* Current time */}
      <div className="rounded-xl p-5 text-center" style={{ backgroundColor: "#F5EDE0" }}>
        <p className="text-sm text-muted-foreground mb-1">Tempo atual</p>
        <p className="text-4xl font-bold font-mono" style={{ color: "#1E4D3A" }}>
          {setor.tempo_atual_minutos}
          <span className="text-lg ml-1">min</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onAlterarTempo} className="flex-1 gap-2" style={{ backgroundColor: "#1E4D3A" }}>
          <Clock className="w-4 h-4" />
          Alterar Tempo
        </Button>
        <Button variant="outline" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-foreground">Histórico de Alterações</h3>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : historico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma alteração registrada.</div>
        ) : (
          <div className="space-y-3">
            {historico.map((h) => (
              <div
                key={h.id}
                className="rounded-lg border p-3 text-sm"
                style={{ borderColor: "#1E4D3A20" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: h.origem === "Mafe" ? "#B93C2A" : "#1E4D3A",
                      color: h.origem === "Mafe" ? "#B93C2A" : "#1E4D3A",
                    }}
                  >
                    {h.origem || "Manual"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">{h.tempo_anterior_minutos ?? "—"} min</span>
                  <span>→</span>
                  <span className="font-bold" style={{ color: "#1E4D3A" }}>{h.tempo_novo_minutos} min</span>
                </div>
                {h.observacao && (
                  <p className="mt-1 text-muted-foreground text-xs">{h.observacao}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
