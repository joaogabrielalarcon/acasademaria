import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustoEquipe {
  id: string;
  colaborador_id: string;
  salario_mensal: number;
  custo_dia_util: number;
  data_vigencia: string;
  created_at: string;
  observacoes: string | null;
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
  ativo: boolean;
}

interface HistoricoSalario {
  id: string;
  colaborador_id: string;
  salario_anterior: number | null;
  salario_novo: number;
  data_alteracao: string;
  usuario_id: string | null;
}

export default function CustosEquipe() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [histDialogOpen, setHistDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedColabId, setSelectedColabId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    colaborador_id: "",
    salario_mensal: "",
    data_vigencia: new Date().toISOString().split("T")[0],
  });

  const queryClient = useQueryClient();

  const { data: custos = [], isLoading } = useQuery({
    queryKey: ["custos-equipe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custos_equipe")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustoEquipe[];
    },
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Colaborador[];
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico-salarios", selectedColabId],
    queryFn: async () => {
      if (!selectedColabId) return [];
      const { data, error } = await supabase
        .from("historico_salarios")
        .select("*")
        .eq("colaborador_id", selectedColabId)
        .order("data_alteracao", { ascending: false });
      if (error) throw error;
      return data as HistoricoSalario[];
    },
    enabled: !!selectedColabId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p.nome]));
  const colabMap = new Map(colaboradores.map((c) => [c.id, c]));

  // Apenas o custo mais recente por colaborador
  const custosAtuais = useMemo(() => {
    const map = new Map<string, CustoEquipe>();
    for (const c of custos) {
      if (!map.has(c.colaborador_id)) {
        map.set(c.colaborador_id, c);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const nomeA = colabMap.get(a.colaborador_id)?.nome || "";
      const nomeB = colabMap.get(b.colaborador_id)?.nome || "";
      return nomeA.localeCompare(nomeB, "pt-BR");
    });
  }, [custos, colabMap]);

  // Colaboradores sem custo cadastrado
  const colabsSemCusto = colaboradores.filter(
    (c) => !custos.some((cu) => cu.colaborador_id === c.id)
  );

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        colaborador_id: data.colaborador_id,
        salario_mensal: parseFloat(data.salario_mensal),
        data_vigencia: data.data_vigencia,
      };

      if (editingId) {
        const { error } = await supabase
          .from("custos_equipe")
          .update({ salario_mensal: payload.salario_mensal, data_vigencia: payload.data_vigencia })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custos_equipe").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos-equipe"] });
      queryClient.invalidateQueries({ queryKey: ["historico-salarios"] });
      toast.success(editingId ? "Salário atualizado!" : "Custo cadastrado!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ colaborador_id: "", salario_mensal: "", data_vigencia: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleEdit = (custo: CustoEquipe) => {
    setEditingId(custo.id);
    setFormData({
      colaborador_id: custo.colaborador_id,
      salario_mensal: custo.salario_mensal.toString(),
      data_vigencia: custo.data_vigencia,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.colaborador_id || !formData.salario_mensal) {
      toast.error("Preencha colaborador e salário");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Custos da Equipe
            </h1>
            <p className="text-muted-foreground">
              Gerencie salários e custos por dia útil dos colaboradores
            </p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" />
            Novo Custo
          </Button>
        </div>

        <div className="card-botanical overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Salário Mensal</TableHead>
                <TableHead>Custo/Dia Útil</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : custosAtuais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-foreground/60">
                    Nenhum custo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                custosAtuais.map((custo) => {
                  const colab = colabMap.get(custo.colaborador_id);
                  return (
                    <TableRow key={custo.id}>
                      <TableCell className="font-medium">{colab?.nome || "-"}</TableCell>
                      <TableCell>{colab?.cargo || "-"}</TableCell>
                      <TableCell>R$ {custo.salario_mensal.toFixed(2)}</TableCell>
                      <TableCell>R$ {custo.custo_dia_util.toFixed(2)}</TableCell>
                      <TableCell>
                        {format(new Date(custo.data_vigencia + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(custo)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => { setSelectedColabId(custo.colaborador_id); setHistDialogOpen(true); }}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de cadastro/edição */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Salário" : "Novo Custo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select
                value={formData.colaborador_id}
                onValueChange={(v) => setFormData({ ...formData, colaborador_id: v })}
                disabled={!!editingId}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(editingId ? colaboradores : colabsSemCusto).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Salário Mensal (R$) *</Label>
              <Input
                type="number"
                value={formData.salario_mensal}
                onChange={(e) => setFormData({ ...formData, salario_mensal: e.target.value })}
                placeholder="Ex: 2500.00"
                min={0}
                step="0.01"
              />
              {formData.salario_mensal && (
                <p className="text-xs text-foreground/60">
                  Custo por dia útil: R$ {(parseFloat(formData.salario_mensal) / 21).toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data de Vigência</Label>
              <Input
                type="date"
                value={formData.data_vigencia}
                onChange={(e) => setFormData({ ...formData, data_vigencia: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de histórico de salários */}
      <Dialog open={histDialogOpen} onOpenChange={setHistDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Histórico de Salários — {selectedColabId ? colabMap.get(selectedColabId)?.nome : ""}
            </DialogTitle>
          </DialogHeader>
          {historico.length === 0 ? (
            <p className="text-sm text-foreground/60 py-4">Nenhuma alteração registrada.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Anterior</TableHead>
                    <TableHead>Novo</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        {format(new Date(h.data_alteracao), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {h.salario_anterior != null ? `R$ ${h.salario_anterior.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>R$ {h.salario_novo.toFixed(2)}</TableCell>
                      <TableCell>
                        {h.usuario_id ? profileMap.get(h.usuario_id) || "-" : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
