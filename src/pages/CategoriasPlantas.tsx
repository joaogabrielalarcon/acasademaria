import { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Search } from "lucide-react";
import { useCategoriasPlantas, CategoriaPlanta } from "@/hooks/useCategoriasPlantas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CategoriasPlantas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaPlanta | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categorias = [], isLoading } = useCategoriasPlantas();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    ordem: 0,
    ativo: true,
  });

  // Filtrar e ordenar alfabeticamente
  const filteredCategorias = useMemo(() => {
    const filtered = categorias.filter((cat) =>
      cat.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [categorias, searchTerm]);

  const resetForm = () => {
    setFormData({
      nome: "",
      ordem: categorias.length,
      ativo: true,
    });
    setEditingCategoria(null);
  };

  const handleEdit = (categoria: CategoriaPlanta) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      ordem: categoria.ordem,
      ativo: categoria.ativo,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingCategoria) {
        const { error } = await supabase
          .from("categorias_plantas")
          .update(data)
          .eq("id", editingCategoria.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categorias_plantas").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_plantas"] });
      toast.success(editingCategoria ? "Categoria atualizada!" : "Categoria cadastrada!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao salvar categoria: " + error.message);
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("categorias_plantas")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_plantas"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Categorias de Plantas
            </h1>
            <p className="text-muted-foreground">
              Gerencie as categorias para classificação de plantas
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Árvore, Arbusto, Forração..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordem">Ordem de exibição</Label>
                  <Input
                    id="ordem"
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Categoria ativa</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> Plantas da categoria "Árvore" exigem o campo DAP (Diâmetro à Altura do Peito) no recebimento de materiais.
          </p>
        </div>

        {/* Tabela */}
        <div className="card-botanical overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredCategorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">{categoria.nome}</TableCell>
                    <TableCell>{categoria.ordem}</TableCell>
                    <TableCell>
                      <Switch
                        checked={categoria.ativo}
                        onCheckedChange={(checked) =>
                          toggleAtivoMutation.mutate({ id: categoria.id, ativo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(categoria)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
