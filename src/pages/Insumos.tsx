// NOTE: Em versão futura, a Mafe terá capacidade de cadastrar insumos
// via texto ou voz — o usuário descreve o item e a IA preenche os campos
// automaticamente, confirmando com o usuário antes de salvar.

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoricoPrecos } from "@/components/HistoricoPrecos";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, History } from "lucide-react";
import { DataTableExcel, DataTableColumn } from "@/components/ui/data-table-excel";
import { useInsumos, Insumo } from "@/hooks/useInsumos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { capitalizeWords } from "@/hooks/useInputMasks";

const CATEGORIAS_INSUMOS = [
  "Fertilizante", "Defensivo", "Semente", "Ferramenta",
  "Irrigação", "Vasos / Decoração", "Materiais Construtivos", "Outros",
];

// Categorias dedicadas a Condicionadores de Solo (separados conceitualmente dos insumos).
const CATEGORIAS_CONDICIONADORES = [
  "Adubo Orgânico", "Adubo Mineral", "Adubo de Liberação Lenta",
  "Substrato", "Terra Preta", "Mix de Adubo", "Composto", "Outros",
];

const UNIDADES_INSUMOS = [
  "un", "kg", "litro", "m", "m²", "m³", "par", "caixa", "saco",
  "galão", "rolo", "pacote", "Ton", "Rolo", "Peça", "Vaso",
];

export function InsumosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Insumo | null>(null);
  const [showHistorico, setShowHistorico] = useState<Insumo | null>(null);
  // Aba ativa: filtra a listagem por tipo de produto.
  const [tipoAba, setTipoAba] = useState<"insumo" | "condicionador_solo">("insumo");

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: insumos = [], isLoading } = useInsumos();
  const { data: fornecedores = [] } = useFornecedores();
  const queryClient = useQueryClient();

  const fornecedoresMap = new Map(fornecedores.map((f) => [f.id, f.nome]));

  const insumosFiltrados = useMemo(
    () => insumos.filter((i) => (i.tipo_produto ?? "insumo") === tipoAba),
    [insumos, tipoAba]
  );

  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    unidade: "",
    fornecedor_id: "",
    preco_unitario: "",
    descricao_produto: "",
    volume_apresentacao: "",
    observacoes: "",
    tipo_produto: "insumo" as "insumo" | "condicionador_solo",
  });

  const resetForm = () => {
    setFormData({
      nome: "", categoria: "", unidade: "", fornecedor_id: "",
      preco_unitario: "", descricao_produto: "", volume_apresentacao: "", observacoes: "",
      tipo_produto: tipoAba,
    });
    setEditingInsumo(null);
  };

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setFormData({
      nome: insumo.nome,
      categoria: insumo.categoria || "",
      unidade: insumo.unidade || "",
      fornecedor_id: insumo.fornecedor_id || "",
      preco_unitario: insumo.preco_unitario?.toString() || "",
      descricao_produto: insumo.descricao_produto || "",
      volume_apresentacao: insumo.volume_apresentacao || "",
      observacoes: insumo.observacoes || "",
      tipo_produto: insumo.tipo_produto ?? "insumo",
    });
    setDialogOpen(true);
  };

  // Get mercado from selected fornecedor
  const selectedFornecedor = fornecedores.find((f) => f.id === formData.fornecedor_id);
  const localizacaoFornecedor = selectedFornecedor?.mercado || null;

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        nome: data.nome,
        categoria: data.categoria || null,
        unidade: data.unidade || null,
        fornecedor_id: data.fornecedor_id || null,
        preco_unitario: data.preco_unitario ? parseFloat(data.preco_unitario) : null,
        descricao_produto: data.descricao_produto || null,
        volume_apresentacao: data.volume_apresentacao || null,
        observacoes: data.observacoes || null,
        tipo_produto: data.tipo_produto,
      };

      if (editingInsumo) {
        const { error } = await supabase.from("insumos").update(payload).eq("id", editingInsumo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insumos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
      toast.success(editingInsumo ? "Insumo atualizado!" : "Insumo cadastrado!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao salvar insumo: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    saveMutation.mutate(formData);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insumos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
      toast.success("Insumo excluído!");
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const columns: DataTableColumn<Insumo>[] = [
    {
      key: "nome", header: "Nome", width: 220,
      accessor: (i) => i.nome,
      render: (i) => <span className="font-medium">{i.nome}</span>,
    },
    { key: "categoria", header: "Categoria", width: 160, accessor: (i) => i.categoria ?? "" },
    {
      key: "fornecedor", header: "Fornecedor", width: 200,
      accessor: (i) => (i.fornecedor_id ? fornecedoresMap.get(i.fornecedor_id) ?? "" : ""),
    },
    { key: "unidade", header: "Unidade", width: 90, accessor: (i) => i.unidade ?? "" },
    { key: "volume_apresentacao", header: "Volume / Apresentação", width: 170, accessor: (i) => i.volume_apresentacao ?? "" },
    {
      key: "preco_unitario", header: "Preço (R$)", width: 110, type: "number",
      accessor: (i) => i.preco_unitario,
      render: (i) => i.preco_unitario != null
        ? `R$ ${Number(i.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "ultima_compra", header: "Última compra", width: 130,
      accessor: (i) => i.ultima_compra ?? "",
      render: (i) => i.ultima_compra
        ? new Date(i.ultima_compra).toLocaleDateString("pt-BR")
        : <span className="text-muted-foreground">—</span>,
    },
    { key: "descricao_produto", header: "Descrição", width: 260, accessor: (i) => i.descricao_produto ?? "" },
    { key: "observacoes", header: "Observações", width: 220, accessor: (i) => i.observacoes ?? "" },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <Tabs value={tipoAba} onValueChange={(v) => setTipoAba(v as "insumo" | "condicionador_solo")}>
            <TabsList>
              <TabsTrigger value="insumo">Insumos</TabsTrigger>
              <TabsTrigger value="condicionador_solo">Condicionadores de Solo</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {tipoAba === "condicionador_solo" ? "Novo Condicionador de Solo" : "Novo Insumo"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingInsumo
                    ? (formData.tipo_produto === "condicionador_solo" ? "Editar Condicionador de Solo" : "Editar Insumo")
                    : (formData.tipo_produto === "condicionador_solo" ? "Novo Condicionador de Solo" : "Novo Insumo")}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: capitalizeWords(e.target.value) })}
                    placeholder="Nome do insumo"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(formData.tipo_produto === "condicionador_solo"
                          ? CATEGORIAS_CONDICIONADORES
                          : CATEGORIAS_INSUMOS
                        ).map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select value={formData.unidade} onValueChange={(v) => setFormData({ ...formData, unidade: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {UNIDADES_INSUMOS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((forn) => (
                          <SelectItem key={forn.id} value={forn.id}>{forn.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preço de Referência (R$)</Label>
                    <Input
                      type="number"
                      value={formData.preco_unitario}
                      onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                      placeholder="Ex: 25.00"
                      min={0}
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor estimado. O preço real é registrado em cada cotação.
                    </p>
                  </div>
                </div>

                {formData.fornecedor_id && (
                  <div className="space-y-2">
                    <Label>Localização do Fornecedor</Label>
                    <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                      {localizacaoFornecedor ? `📍 ${localizacaoFornecedor}` : "📍 Não informado"}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Volume / Apresentação</Label>
                  <Input
                    value={formData.volume_apresentacao}
                    onChange={(e) => setFormData({ ...formData, volume_apresentacao: e.target.value })}
                    placeholder="Ex: saco 25kg, galão 5L"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição do Produto</Label>
                  <Textarea
                    value={formData.descricao_produto}
                    onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
                    placeholder="Descrição detalhada do produto"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações sobre o insumo"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <DataTableExcel
          data={insumosFiltrados}
          columns={columns}
          rowKey={(i) => i.id}
          loading={isLoading}
          searchPlaceholder={tipoAba === "condicionador_solo" ? "Buscar condicionadores de solo..." : "Buscar insumos..."}
          globalSearchKeys={["nome", "categoria", "fornecedor", "descricao_produto", "observacoes"]}
          rowActions={(insumo) => (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(insumo)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="icon-sm" title="Ver histórico de preços"
                onClick={() => setShowHistorico(showHistorico?.id === insumo.id ? null : insumo)}
              >
                <History className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={() => setItemToDelete(insumo)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        />
      </div>

      {/* Histórico de preços inline */}
      {showHistorico && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              Histórico de Preços — {showHistorico.nome}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowHistorico(null)}>
              Fechar
            </Button>
          </div>
          <HistoricoPrecos tipo="insumo" itemId={showHistorico.id} />
        </div>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir insumo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O insumo "{itemToDelete?.nome}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Insumos() {
  return (
    <AppLayout>
      <InsumosContent />
    </AppLayout>
  );
}
