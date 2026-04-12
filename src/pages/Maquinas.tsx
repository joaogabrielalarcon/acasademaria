import { useState, useMemo } from "react";
import { MaquinaDetalheSheet } from "@/components/maquinas/MaquinaDetalheSheet";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Search, Trash2, Wrench } from "lucide-react";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { capitalizeWords } from "@/hooks/useInputMasks";

interface Maquina {
  id: string;
  nome: string;
  codigo_interno: string | null;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  status: string;
  horas_acumuladas: number;
  horas_limite_manutencao: number;
  ultima_manutencao: string | null;
  observacoes: string | null;
  ativo: boolean;
}

const CATEGORIAS_MAQUINAS = [
  "Roçadeira",
  "Cortador de Grama",
  "Motosserra",
  "Soprador",
  "Pulverizador",
  "Tesoura Elétrica",
  "Perfurador",
  "Outros",
];

const STATUS_OPTIONS = [
  { value: "ativa", label: "Ativa", color: "bg-primary/70" },
  { value: "manutencao", label: "Em Manutenção", color: "bg-primary/40" },
  { value: "inativa", label: "Inativa", color: "bg-primary/20" },
];

export default function Maquinas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [itemToDelete, setItemToDelete] = useState<Maquina | null>(null);
  const [detailMaquina, setDetailMaquina] = useState<Maquina | null>(null);

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const queryClient = useQueryClient();

  const { data: maquinas = [], isLoading } = useQuery({
    queryKey: ["maquinas-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maquinas")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Maquina[];
    },
  });

  const [formData, setFormData] = useState({
    nome: "",
    codigo_interno: "",
    categoria: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    status: "ativa",
    horas_acumuladas: "0",
    horas_limite_manutencao: "100",
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      codigo_interno: "",
      categoria: "",
      marca: "",
      modelo: "",
      numero_serie: "",
      status: "ativa",
      horas_acumuladas: "0",
      horas_limite_manutencao: "100",
      observacoes: "",
    });
    setEditingMaquina(null);
  };

  const handleEdit = (maquina: Maquina) => {
    setEditingMaquina(maquina);
    setFormData({
      nome: maquina.nome,
      codigo_interno: maquina.codigo_interno || "",
      categoria: maquina.categoria || "",
      marca: maquina.marca || "",
      modelo: maquina.modelo || "",
      numero_serie: maquina.numero_serie || "",
      status: maquina.status,
      horas_acumuladas: String(maquina.horas_acumuladas || 0),
      horas_limite_manutencao: String(maquina.horas_limite_manutencao || 100),
      observacoes: maquina.observacoes || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        nome: data.nome,
        codigo_interno: data.codigo_interno || null,
        categoria: data.categoria || null,
        marca: data.marca || null,
        modelo: data.modelo || null,
        numero_serie: data.numero_serie || null,
        status: data.status,
        horas_acumuladas: parseFloat(data.horas_acumuladas) || 0,
        horas_limite_manutencao: parseFloat(data.horas_limite_manutencao) || 100,
        observacoes: data.observacoes || null,
        updated_by: user?.id,
      };

      if (editingMaquina) {
        const { error } = await supabase
          .from("maquinas")
          .update(payload)
          .eq("id", editingMaquina.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("maquinas").insert({
          ...payload,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maquinas-all"] });
      queryClient.invalidateQueries({ queryKey: ["maquinas"] });
      toast.success(editingMaquina ? "Máquina atualizada!" : "Máquina cadastrada!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao salvar máquina: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    saveMutation.mutate(formData);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maquinas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maquinas-all"] });
      queryClient.invalidateQueries({ queryKey: ["maquinas"] });
      toast.success("Máquina excluída!");
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handleDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const filteredMaquinas = useMemo(() => {
    const filtered = maquinas.filter((m) => {
      const matchesSearch =
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.modelo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategoria =
        filterCategoria === "todas" || m.categoria === filterCategoria;
      const matchesStatus =
        filterStatus === "todos" || m.status === filterStatus;
      return matchesSearch && matchesCategoria && matchesStatus;
    });
    return filtered.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [maquinas, searchTerm, filterCategoria, filterStatus]);

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge variant="outline" className="gap-1.5">
        <span className={`w-2 h-2 rounded-full ${statusOption?.color || "bg-gray-500"}`} />
        {statusOption?.label || status}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Máquinas e Equipamentos
            </h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro de máquinas e equipamentos
            </p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Máquina
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMaquina ? "Editar Máquina" : "Nova Máquina"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: capitalizeWords(e.target.value) })
                      }
                      placeholder="Nome da máquina"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigo_interno">Código Interno</Label>
                    <Input
                      id="codigo_interno"
                      value={formData.codigo_interno}
                      onChange={(e) =>
                        setFormData({ ...formData, codigo_interno: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: ROC-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) =>
                        setFormData({ ...formData, categoria: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_MAQUINAS.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input
                      id="marca"
                      value={formData.marca}
                      onChange={(e) =>
                        setFormData({ ...formData, marca: capitalizeWords(e.target.value) })
                      }
                      placeholder="Ex: Stihl, Husqvarna"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input
                      id="modelo"
                      value={formData.modelo}
                      onChange={(e) =>
                        setFormData({ ...formData, modelo: e.target.value })
                      }
                      placeholder="Ex: FS 220"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero_serie">Número de Série</Label>
                    <Input
                      id="numero_serie"
                      value={formData.numero_serie}
                      onChange={(e) =>
                        setFormData({ ...formData, numero_serie: e.target.value })
                      }
                      placeholder="Número de série"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horas_acumuladas">Horas Acumuladas</Label>
                    <Input
                      id="horas_acumuladas"
                      type="number"
                      value={formData.horas_acumuladas}
                      onChange={(e) =>
                        setFormData({ ...formData, horas_acumuladas: e.target.value })
                      }
                      min={0}
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horas_limite_manutencao">Limite p/ Manutenção (h)</Label>
                    <Input
                      id="horas_limite_manutencao"
                      type="number"
                      value={formData.horas_limite_manutencao}
                      onChange={(e) =>
                        setFormData({ ...formData, horas_limite_manutencao: e.target.value })
                      }
                      min={0}
                      step="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    placeholder="Observações sobre a máquina"
                    rows={3}
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
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS_MAQUINAS.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="card-botanical overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Marca/Modelo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredMaquinas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhuma máquina encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaquinas.map((maquina) => (
                  <TableRow key={maquina.id}>
                    <TableCell className="font-medium">{maquina.nome}</TableCell>
                    <TableCell>{maquina.codigo_interno || "-"}</TableCell>
                    <TableCell>{maquina.categoria || "-"}</TableCell>
                    <TableCell>
                      {maquina.marca || maquina.modelo
                        ? `${maquina.marca || ""} ${maquina.modelo || ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(maquina.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(maquina)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setItemToDelete(maquina)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir máquina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A máquina "{itemToDelete?.nome}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
