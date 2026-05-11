import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ImageIcon, Star, AlertTriangle, GitMerge, Upload } from "lucide-react";
import { ImportarPlantasDialog } from "@/components/ImportarPlantasDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableExcel, DataTableColumn } from "@/components/ui/data-table-excel";
import { usePlantas, Planta } from "@/hooks/usePlantas";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useAuth, useIsAdmin, useIsAdminOrAdministrativo } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MesclarItensDialog, ItemFusivel } from "@/components/catalogo/MesclarItensDialog";
import { formatPorteMetros } from "@/lib/porte";

export function PlantasContent() {
  const [itemToDelete, setItemToDelete] = useState<Planta | null>(null);
  const [mergePrincipal, setMergePrincipal] = useState<Planta | null>(null);
  const [importarOpen, setImportarOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const podeMesclar = useIsAdminOrAdministrativo(user?.id);

  const { data: plantas = [], isLoading } = usePlantas();
  const { data: categorias = [] } = useCategoriasPlantas();
  const { data: fornecedores = [] } = useFornecedores();
  const queryClient = useQueryClient();

  const categoriasMap = new Map(categorias.map((c) => [c.id, c.nome]));
  const fornecedoresMap = new Map(fornecedores.map((f) => [f.id, f.nome]));

  const candidatosFusao: ItemFusivel[] = plantas.map((p) => ({
    id: p.id,
    nome: p.nome_popular,
    nome_secundario: p.nome_cientifico,
    altura_m: p.altura_m ?? p.altura_min_m ?? p.altura_max_m ?? null,
    fornecedor_id: p.fornecedor_id,
    fornecedor_nome: p.fornecedor_id ? fornecedoresMap.get(p.fornecedor_id) ?? null : null,
    preco_unitario: p.preco_unitario,
  }));

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
      key: "altura_m", header: "Altura (m)", width: 140, type: "number",
      accessor: (p) => p.altura_max_m ?? p.altura_min_m ?? p.altura_m,
      render: (p) => {
        const min = p.altura_min_m ?? p.altura_m;
        const max = p.altura_max_m ?? p.altura_m;
        if ((min == null || Number(min) === 0) && (max == null || Number(max) === 0)) {
          return <span className="text-muted-foreground">—</span>;
        }
        if (min != null && max != null && Number(min) !== Number(max)) {
          return `${formatPorteMetros(min, { suffix: false })} – ${formatPorteMetros(max)}`;
        }
        return formatPorteMetros((min ?? max) as number);
      },
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
      key: "alerta_validacao", header: "Alerta", width: 70,
      accessor: (p) => p.alerta_validacao ?? "",
      render: (p) => p.alerta_validacao
        ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-700 cursor-help">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">
                {p.alerta_validacao}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
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
          <Button variant="outline" className="gap-2" onClick={() => setImportarOpen(true)}>
            <Upload className="w-4 h-4" /> Importar Plantas
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
              {podeMesclar && (
                <Button variant="ghost" size="icon-sm" title="Mesclar duplicatas em desta planta" onClick={() => setMergePrincipal(planta)}>
                  <GitMerge className="w-4 h-4" />
                </Button>
              )}
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

      {mergePrincipal && (
        <MesclarItensDialog
          open={!!mergePrincipal}
          onOpenChange={(o) => !o && setMergePrincipal(null)}
          tipo="planta"
          principal={{
            id: mergePrincipal.id,
            nome: mergePrincipal.nome_popular,
            nome_secundario: mergePrincipal.nome_cientifico,
            altura_m: mergePrincipal.altura_m ?? mergePrincipal.altura_min_m ?? mergePrincipal.altura_max_m ?? null,
            fornecedor_id: mergePrincipal.fornecedor_id,
            fornecedor_nome: mergePrincipal.fornecedor_id ? fornecedoresMap.get(mergePrincipal.fornecedor_id) ?? null : null,
            preco_unitario: mergePrincipal.preco_unitario,
          }}
          candidatos={candidatosFusao}
          onMerged={() => setMergePrincipal(null)}
        />
      )}
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
