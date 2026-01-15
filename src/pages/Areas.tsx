import { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { useAllAreas, Area } from "@/hooks/useAreas";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { capitalizeWords } from "@/hooks/useInputMasks";

export default function Areas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemToDelete, setItemToDelete] = useState<Area | null>(null);

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: areas = [], isLoading } = useAllAreas();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#22c55e",
    ativo: true,
    ordem: 0,
  });

  // Filtrar e ordenar alfabeticamente
  const filteredAreas = useMemo(() => {
    const filtered = areas.filter((area) =>
      area.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (area.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
    return filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [areas, searchTerm]);

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: "#22c55e",
      ativo: true,
      ordem: areas.length,
    });
    setEditingArea(null);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      nome: area.nome,
      descricao: area.descricao || "",
      cor: area.cor || "#22c55e",
      ativo: area.ativo,
      ordem: area.ordem || 0,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingArea) {
        const { error } = await supabase
          .from("areas")
          .update(data)
          .eq("id", editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("areas").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success(editingArea ? "Área atualizada!" : "Área cadastrada!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao salvar área: " + error.message);
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("areas")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
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
      const { error } = await supabase.from("areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Área excluída!");
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

  const CORES_PREDEFINIDAS = [
    "#22c55e", // Verde
    "#8b5cf6", // Roxo
    "#3b82f6", // Azul
    "#f59e0b", // Amarelo
    "#ef4444", // Vermelho
    "#ec4899", // Rosa
    "#14b8a6", // Teal
    "#6366f1", // Indigo
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Áreas
            </h1>
            <p className="text-muted-foreground">
              Gerencie as áreas/setores da empresa
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Área
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingArea ? "Editar Área" : "Nova Área"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: capitalizeWords(e.target.value) })}
                    placeholder="Nome da área"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição da área"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {CORES_PREDEFINIDAS.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => setFormData({ ...formData, cor })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.cor === cor ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: cor }}
                      />
                    ))}
                    <Input
                      type="color"
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="w-8 h-8 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label>Área ativa</Label>
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabela */}
        <div className="card-botanical overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredAreas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Nenhuma área encontrada" : "Nenhuma área cadastrada"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell>
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: area.cor || '#22c55e' }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{area.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {area.descricao || "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={area.ativo}
                        onCheckedChange={(checked) =>
                          toggleAtivoMutation.mutate({ id: area.id, ativo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(area)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setItemToDelete(area)}
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

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A área "{itemToDelete?.nome}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
