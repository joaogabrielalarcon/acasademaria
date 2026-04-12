import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Wrench, Plus, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MaquinaDetalheSheetProps {
  maquinaId: string | null;
  maquinaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS_MANUTENCAO = [
  { value: "preventiva", label: "Preventiva" },
  { value: "corretiva", label: "Corretiva" },
  { value: "troca_peca", label: "Troca de Peça" },
];

// NOTE: Em versão futura, a Mafe terá capacidade de registrar uso e manutenção via texto ou voz.

export function MaquinaDetalheSheet({ maquinaId, maquinaNome, open, onOpenChange }: MaquinaDetalheSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [manutDialogOpen, setManutDialogOpen] = useState(false);
  const [manutForm, setManutForm] = useState({
    data_manutencao: "",
    tipo: "corretiva",
    descricao: "",
    custo: "",
    realizado_por: "",
    observacoes: "",
  });

  // Histórico de USO — vem dos diários de projetos (diario_maquinas_area + diario_visitas)
  const { data: usoHistorico = [], isLoading: loadingUso } = useQuery({
    queryKey: ["maquina-uso", maquinaId],
    enabled: !!maquinaId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diario_maquinas_area")
        .select(`
          id,
          created_at,
          maquina_nome,
          visita_id,
          area_id
        `)
        .eq("maquina_id", maquinaId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch visit details for context
      const visitaIds = [...new Set(data.map((d: any) => d.visita_id))];
      const { data: visitas } = await supabase
        .from("diario_visitas")
        .select("id, data_visita, projeto_id")
        .in("id", visitaIds);

      const { data: areas } = await supabase
        .from("diario_areas")
        .select("id, nome_area")
        .in("id", data.map((d: any) => d.area_id).filter(Boolean));

      // Get project names
      const projetoIds = [...new Set((visitas || []).map((v: any) => v.projeto_id))];
      const { data: projetos } = await supabase
        .from("projetos")
        .select("id, titulo")
        .in("id", projetoIds);

      const visitaMap = new Map((visitas || []).map((v: any) => [v.id, v]));
      const areaMap = new Map((areas || []).map((a: any) => [a.id, a]));
      const projetoMap = new Map((projetos || []).map((p: any) => [p.id, p]));

      return data.map((item: any) => {
        const visita = visitaMap.get(item.visita_id);
        const area = areaMap.get(item.area_id);
        const projeto = visita ? projetoMap.get(visita.projeto_id) : null;
        return {
          id: item.id,
          data: visita?.data_visita || item.created_at?.slice(0, 10),
          projeto: projeto?.titulo || "–",
          area: area?.nome_area || "–",
        };
      });
    },
  });

  // Histórico de MANUTENÇÃO — registrado manualmente
  const { data: manutHistorico = [], isLoading: loadingManut } = useQuery({
    queryKey: ["maquina-manutencao", maquinaId],
    enabled: !!maquinaId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maquinas_manutencoes" as any)
        .select("*")
        .eq("maquina_id", maquinaId!)
        .order("data_manutencao", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const saveManutMutation = useMutation({
    mutationFn: async () => {
      if (!maquinaId) throw new Error("Máquina não selecionada");
      const { error } = await supabase.from("maquinas_manutencoes" as any).insert({
        maquina_id: maquinaId,
        data_manutencao: manutForm.data_manutencao,
        tipo: manutForm.tipo,
        descricao: manutForm.descricao,
        custo: manutForm.custo ? parseFloat(manutForm.custo) : null,
        realizado_por: manutForm.realizado_por || null,
        observacoes: manutForm.observacoes || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maquina-manutencao", maquinaId] });
      toast.success("Manutenção registrada!");
      setManutDialogOpen(false);
      setManutForm({ data_manutencao: "", tipo: "corretiva", descricao: "", custo: "", realizado_por: "", observacoes: "" });
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const handleSaveManut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manutForm.data_manutencao || !manutForm.descricao.trim()) {
      toast.error("Data e descrição são obrigatórios");
      return;
    }
    saveManutMutation.mutate();
  };

  const formatDate = (d: string) => {
    try {
      return format(new Date(`${d}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return d;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      preventiva: "bg-primary/20 text-primary",
      corretiva: "bg-amber-100 text-amber-800",
      troca_peca: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = {
      preventiva: "Preventiva",
      corretiva: "Corretiva",
      troca_peca: "Troca de Peça",
    };
    return <Badge variant="outline" className={colors[tipo] || ""}>{labels[tipo] || tipo}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            {maquinaNome}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="uso" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="uso" className="gap-2">
              <Clock className="w-4 h-4" />
              Uso ({usoHistorico.length})
            </TabsTrigger>
            <TabsTrigger value="manutencao" className="gap-2">
              <Wrench className="w-4 h-4" />
              Manutenção ({manutHistorico.length})
            </TabsTrigger>
          </TabsList>

          {/* === ABA USO === */}
          <TabsContent value="uso" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Registros de uso vindos automaticamente dos diários de manutenção dos projetos.
            </p>

            {loadingUso ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : usoHistorico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum registro de uso encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Área</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usoHistorico.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(item.data)}</TableCell>
                      <TableCell className="text-sm">{item.projeto}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.area}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* === ABA MANUTENÇÃO === */}
          <TabsContent value="manutencao" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Registros manuais de manutenção do equipamento.
              </p>
              <Dialog open={manutDialogOpen} onOpenChange={setManutDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Registrar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Manutenção</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveManut} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data *</Label>
                        <Input
                          type="date"
                          value={manutForm.data_manutencao}
                          onChange={(e) => setManutForm({ ...manutForm, data_manutencao: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select
                          value={manutForm.tipo}
                          onValueChange={(v) => setManutForm({ ...manutForm, tipo: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPOS_MANUTENCAO.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição *</Label>
                      <Textarea
                        value={manutForm.descricao}
                        onChange={(e) => setManutForm({ ...manutForm, descricao: e.target.value })}
                        placeholder="Descreva o que foi feito..."
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Custo (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={manutForm.custo}
                          onChange={(e) => setManutForm({ ...manutForm, custo: e.target.value })}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Realizado por</Label>
                        <Input
                          value={manutForm.realizado_por}
                          onChange={(e) => setManutForm({ ...manutForm, realizado_por: e.target.value })}
                          placeholder="Nome do técnico"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={manutForm.observacoes}
                        onChange={(e) => setManutForm({ ...manutForm, observacoes: e.target.value })}
                        placeholder="Observações adicionais..."
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setManutDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saveManutMutation.isPending}>
                        {saveManutMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingManut ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : manutHistorico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma manutenção registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {manutHistorico.map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{formatDate(item.data_manutencao)}</span>
                      </div>
                      {getTipoBadge(item.tipo)}
                    </div>
                    <p className="text-sm">{item.descricao}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {item.custo && <span>R$ {Number(item.custo).toFixed(2).replace(".", ",")}</span>}
                      {item.realizado_por && <span>Por: {item.realizado_por}</span>}
                    </div>
                    {item.observacoes && (
                      <p className="text-xs text-muted-foreground italic">{item.observacoes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
