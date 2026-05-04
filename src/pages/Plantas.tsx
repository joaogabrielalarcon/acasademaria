import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ImageIcon, Star } from "lucide-react";
import { DataTableExcel, DataTableColumn } from "@/components/ui/data-table-excel";
import { usePlantas, Planta } from "@/hooks/usePlantas";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PlantasContent() {
  const [itemToDelete, setItemToDelete] = useState<Planta | null>(null);

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: plantas = [], isLoading } = usePlantas();
  const { data: categorias = [] } = useCategoriasPlantas();
  const { data: fornecedores = [] } = useFornecedores();
  const queryClient = useQueryClient();

  const categoriasMap = new Map(categorias.map((c) => [c.id, c.nome]));
  const fornecedoresMap = new Map(fornecedores.map((f) => [f.id, f.nome]));

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
    onError: (error) => toast.error("Erro ao excluir: " + error.message),
  });

  const columns: DataTableColumn<Planta>[] = [
    {
      key: "nome_popular", header: "Nome Popular", width: 200,
      accessor: (p) => p.nome_popular,
      render: (p) => <span className="font-medium">{p.nome_popular}</span>,
    },
    {
      key: "nome_cientifico", header: "Nome Científico", width: 200,
      accessor: (p) => p.nome_cientifico ?? "",
      render: (p) => <span className="italic text-muted-foreground">{p.nome_cientifico || "—"}</span>,
    },
    {
      key: "categoria", header: "Categoria", width: 150,
      accessor: (p) => (p.categoria_id ? categoriasMap.get(p.categoria_id) ?? "" : ""),
    },
    {
      key: "fornecedor", header: "Fornecedor", width: 180,
      accessor: (p) => (p.fornecedor_id ? fornecedoresMap.get(p.fornecedor_id) ?? "" : ""),
    },
    {
      key: "altura_m", header: "Altura (m)", width: 110, type: "number",
      accessor: (p) => p.altura_m,
      render: (p) => p.altura_m != null
        ? `${Number(p.altura_m).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
        : <span className="text-muted-foreground">—</span>,
    },
    { key: "dap_cm", header: "DAP (cm)", width: 100, type: "number", accessor: (p) => p.dap_cm },
    { key: "unidade", header: "Unidade", width: 100, accessor: (p) => p.unidade ?? "" },
    { key: "embalagem", header: "Embalagem", width: 120, accessor: (p) => p.embalagem ?? "" },
    {
      key: "preco_unitario", header: "Preço (R$)", width: 110, type: "number",
      accessor: (p) => p.preco_unitario,
      render: (p) => p.preco_unitario != null
        ? `R$ ${Number(p.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "nota_qualidade", header: "Qualidade", width: 110, type: "number",
      accessor: (p) => p.nota_qualidade,
      render: (p) => p.nota_qualidade != null
        ? (
          <span className="inline-flex items-center gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5" fill={i < (p.nota_qualidade ?? 0) ? "currentColor" : "none"} />
            ))}
          </span>
        )
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "midia", header: "Mídia", width: 80, disableFilter: true, disableSort: true,
      accessor: (p) => (p.midia?.length ?? 0),
      render: (p) => {
        const n = p.midia?.length ?? 0;
        return n > 0
          ? <span className="inline-flex items-center gap-1 text-foreground"><ImageIcon className="w-4 h-4" />{n}</span>
          : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "alerta_validacao", header: "Alerta", width: 140,
      accessor: (p) => p.alerta_validacao ?? "",
      render: (p) => p.alerta_validacao
        ? <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700">{p.alerta_validacao}</span>
        : <span className="text-muted-foreground">—</span>,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button asChild className="gap-2">
            <Link to="/plantas/nova">
              <Plus className="w-4 h-4" /> Nova Planta
            </Link>
          </Button>
        </div>

        <DataTableExcel
          data={plantas}
          columns={columns}
          rowKey={(p) => p.id}
          loading={isLoading}
          searchPlaceholder="Buscar plantas..."
          globalSearchKeys={["nome_popular", "nome_cientifico", "categoria", "fornecedor", "embalagem"]}
          rowActions={(planta) => (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link to={`/plantas/${planta.id}/editar`}>
                  <Pencil className="w-4 h-4" />
                </Link>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={() => setItemToDelete(planta)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        />
      </div>

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
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Plantas() {
  return (
    <AppLayout>
      <PlantasContent />
    </AppLayout>
  );
}
