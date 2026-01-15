import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { usePlantas, Planta } from "@/hooks/usePlantas";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Plantas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");
  const [filterFornecedor, setFilterFornecedor] = useState<string>("todos");
  const [itemToDelete, setItemToDelete] = useState<Planta | null>(null);

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: plantas = [], isLoading } = usePlantas();
  const { data: categorias = [] } = useCategoriasPlantas();
  const { data: fornecedores = [] } = useFornecedores();
  const queryClient = useQueryClient();

  const categoriasMap = new Map(categorias.map((c) => [c.id, c.nome]));
  const fornecedoresMap = new Map(fornecedores.map((f) => [f.id, f.nome]));

  // Filtrar e ordenar alfabeticamente
  const filteredPlantas = useMemo(() => {
    const filtered = plantas.filter((p) => {
      const matchesSearch =
        p.nome_popular.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.nome_cientifico?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategoria =
        filterCategoria === "todas" || p.categoria_id === filterCategoria;
      const matchesFornecedor =
        filterFornecedor === "todos" || p.fornecedor_id === filterFornecedor;
      return matchesSearch && matchesCategoria && matchesFornecedor;
    });
    return filtered.sort((a, b) => a.nome_popular.localeCompare(b.nome_popular, 'pt-BR'));
  }, [plantas, searchTerm, filterCategoria, filterFornecedor]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plantas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantas"] });
      toast.success("Planta excluída!");
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Plantas
            </h1>
            <p className="text-muted-foreground">
              Gerencie o catálogo de plantas disponíveis
            </p>
          </div>

          <Button asChild className="gap-2">
            <Link to="/plantas/nova">
              <Plus className="w-4 h-4" />
              Nova Planta
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
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
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os fornecedores</SelectItem>
              {fornecedores.map((forn) => (
                <SelectItem key={forn.id} value={forn.id}>
                  {forn.nome}
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
                <TableHead>Nome Popular</TableHead>
                <TableHead>Nome Científico</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Porte</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredPlantas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma planta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlantas.map((planta) => (
                  <TableRow key={planta.id}>
                    <TableCell className="font-medium">{planta.nome_popular}</TableCell>
                    <TableCell className="text-muted-foreground italic">
                      {planta.nome_cientifico || "-"}
                    </TableCell>
                    <TableCell>
                      {planta.categoria_id ? categoriasMap.get(planta.categoria_id) || "-" : "-"}
                    </TableCell>
                    <TableCell>
                      {planta.fornecedor_id ? fornecedoresMap.get(planta.fornecedor_id) || "-" : "-"}
                    </TableCell>
                    <TableCell>{planta.porte || "-"}</TableCell>
                    <TableCell>{planta.unidade || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link to={`/plantas/${planta.id}/editar`}>
                            <Pencil className="w-4 h-4" />
                          </Link>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setItemToDelete(planta)}
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
            <AlertDialogTitle>Excluir planta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A planta "{itemToDelete?.nome_popular}" será removida permanentemente.
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
