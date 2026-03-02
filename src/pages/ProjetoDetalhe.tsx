import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderKanban,
  DollarSign,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useProjeto, projetoStatusConfig } from "@/hooks/useProjetos";
import { useCliente } from "@/hooks/useCliente";
import {
  useOrcamentoItens,
  useOrcamentoCotacoes,
  calcularPrecoVenda,
  tipoItemLabels,
  tipoItemOrder,
  OrcamentoItem,
  OrcamentoCotacao,
} from "@/hooks/useOrcamento";
import { usePlantas } from "@/hooks/usePlantas";
import { useInsumos } from "@/hooks/useInsumos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProjetoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(id);
  const { data: cliente } = useCliente(projeto?.cliente_id);
  const { data: itens = [], isLoading: loadingItens } = useOrcamentoItens(id);
  const itemIds = itens.map((i) => i.id);
  const { data: todasCotacoes = [] } = useOrcamentoCotacoes(itemIds);
  const { data: plantas = [] } = usePlantas();
  const { data: insumos = [] } = useInsumos();
  const { data: fornecedores = [] } = useFornecedores();

  // State
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    planta: true,
    insumo: true,
    servico: true,
  });
  const [showCotacaoDialog, setShowCotacaoDialog] = useState<string | null>(null); // item_id

  // Item form state
  const [itemForm, setItemForm] = useState({
    tipo: "servico",
    planta_id: "",
    insumo_id: "",
    descricao: "",
    quantidade: "1",
    unidade: "un",
    margem_percentual: "0",
    reserva_valor: "0",
    observacao: "",
  });

  // Cotação form state
  const [cotacaoForm, setCotacaoForm] = useState({
    fornecedor_id: "",
    fornecedor_nome: "",
    preco_unitario: "0",
    observacao: "",
  });

  // Group items by type
  const groupedItens = useMemo(() => {
    const groups: Record<string, (OrcamentoItem & { cotacoes: OrcamentoCotacao[] })[]> = {};
    for (const tipo of tipoItemOrder) {
      const filtered = itens
        .filter((i) => i.tipo === tipo)
        .map((item) => ({
          ...item,
          cotacoes: todasCotacoes.filter((c) => c.item_id === item.id),
        }));
      if (filtered.length > 0) {
        groups[tipo] = filtered;
      }
    }
    return groups;
  }, [itens, todasCotacoes]);

  // Totals
  const totalCusto = itens.reduce((sum, i) => sum + (i.preco_custo || 0) * (i.quantidade || 1), 0);
  const totalVenda = itens.reduce((sum, i) => sum + (i.preco_venda || 0) * (i.quantidade || 1), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // --- Mutations ---
  const saveItemMutation = useMutation({
    mutationFn: async () => {
      const precoCusto = 0; // will be set when cotação is selected
      const margem = parseFloat(itemForm.margem_percentual) || 0;
      const reserva = parseFloat(itemForm.reserva_valor) || 0;

      const payload = {
        projeto_id: id!,
        tipo: itemForm.tipo,
        planta_id: itemForm.tipo === "planta" && itemForm.planta_id ? itemForm.planta_id : null,
        insumo_id: itemForm.tipo === "insumo" && itemForm.insumo_id ? itemForm.insumo_id : null,
        descricao: itemForm.descricao,
        quantidade: parseFloat(itemForm.quantidade) || 1,
        unidade: itemForm.unidade,
        margem_percentual: margem,
        reserva_valor: reserva,
        preco_custo: precoCusto,
        preco_venda: calcularPrecoVenda(precoCusto, reserva, margem),
        observacao: itemForm.observacao || null,
      };

      if (editingItem) {
        const { error } = await supabase.from("orcamento_itens").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orcamento_itens").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-itens", id] });
      setShowItemDialog(false);
      setEditingItem(null);
      toast({ title: editingItem ? "Item atualizado" : "Item adicionado" });
    },
    onError: () => toast({ title: "Erro ao salvar item", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("orcamento_itens").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-itens", id] });
      setItemToDelete(null);
      toast({ title: "Item removido" });
    },
  });

  const saveCotacaoMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("orcamento_cotacoes").insert({
        item_id: itemId,
        fornecedor_id: cotacaoForm.fornecedor_id || null,
        fornecedor_nome: cotacaoForm.fornecedor_nome || null,
        preco_unitario: parseFloat(cotacaoForm.preco_unitario) || 0,
        observacao: cotacaoForm.observacao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-cotacoes"] });
      setCotacaoForm({ fornecedor_id: "", fornecedor_nome: "", preco_unitario: "0", observacao: "" });
      toast({ title: "Cotação adicionada" });
    },
  });

  const selecionarCotacaoMutation = useMutation({
    mutationFn: async ({ cotacao, item }: { cotacao: OrcamentoCotacao; item: OrcamentoItem }) => {
      // Desmarcar todas do mesmo item
      await supabase
        .from("orcamento_cotacoes")
        .update({ selecionada: false })
        .eq("item_id", item.id);
      // Marcar a selecionada
      await supabase
        .from("orcamento_cotacoes")
        .update({ selecionada: true })
        .eq("id", cotacao.id);
      // Atualizar o preço de custo e venda do item
      const precoCusto = cotacao.preco_unitario;
      const precoVenda = calcularPrecoVenda(precoCusto, item.reserva_valor, item.margem_percentual);
      await supabase
        .from("orcamento_itens")
        .update({ preco_custo: precoCusto, preco_venda: precoVenda })
        .eq("id", item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["orcamento-itens", id] });
      toast({ title: "Cotação selecionada" });
    },
  });

  const deleteCotacaoMutation = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { error } = await supabase.from("orcamento_cotacoes").delete().eq("id", cotacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-cotacoes"] });
      toast({ title: "Cotação removida" });
    },
  });

  // --- Handlers ---
  const openNewItem = (tipo = "servico") => {
    setEditingItem(null);
    setItemForm({
      tipo,
      planta_id: "",
      insumo_id: "",
      descricao: "",
      quantidade: "1",
      unidade: "un",
      margem_percentual: "0",
      reserva_valor: "0",
      observacao: "",
    });
    setShowItemDialog(true);
  };

  const openEditItem = (item: OrcamentoItem) => {
    setEditingItem(item);
    setItemForm({
      tipo: item.tipo,
      planta_id: item.planta_id || "",
      insumo_id: item.insumo_id || "",
      descricao: item.descricao,
      quantidade: String(item.quantidade),
      unidade: item.unidade || "un",
      margem_percentual: String(item.margem_percentual),
      reserva_valor: String(item.reserva_valor),
      observacao: item.observacao || "",
    });
    setShowItemDialog(true);
  };

  // Auto-fill description from planta/insumo selection
  const handlePlantaChange = (plantaId: string) => {
    const p = plantas.find((x) => x.id === plantaId);
    setItemForm((f) => ({
      ...f,
      planta_id: plantaId,
      descricao: p ? `${p.nome_popular}${p.nome_cientifico ? ` (${p.nome_cientifico})` : ""}` : f.descricao,
      unidade: p?.unidade || f.unidade,
    }));
  };

  const handleInsumoChange = (insumoId: string) => {
    const ins = insumos.find((x) => x.id === insumoId);
    setItemForm((f) => ({
      ...f,
      insumo_id: insumoId,
      descricao: ins?.nome || f.descricao,
      unidade: ins?.unidade || f.unidade,
    }));
  };

  // Loading
  if (loadingProjeto) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!projeto) {
    return (
      <AppLayout>
        <div className="empty-state py-24">
          <FolderKanban className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2 text-foreground">Projeto não encontrado</h3>
          <Button variant="terracota" onClick={() => navigate("/")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const statusInfo = projetoStatusConfig[projeto.status] || projetoStatusConfig.orcamento;

  return (
    <AppLayout>
      {/* Back */}
      <Link
        to={`/clientes/${projeto.cliente_id}?tab=projetos`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para {cliente?.nome || "Cliente"}</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            {projeto.titulo}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
            {cliente && <span className="text-sm text-muted-foreground">{cliente.nome}</span>}
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link to={`/projetos/${id}/editar`}>
              <Pencil className="w-4 h-4" />
              Editar Projeto
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orcamento" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="orcamento" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Orçamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orcamento">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="card-botanical p-4">
              <p className="text-sm text-muted-foreground">Itens</p>
              <p className="text-2xl font-bold text-foreground">{itens.length}</p>
            </div>
            <div className="card-botanical p-4">
              <p className="text-sm text-muted-foreground">Total Custo</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCusto)}</p>
            </div>
            <div className="card-botanical p-4">
              <p className="text-sm text-muted-foreground">Total Venda</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalVenda)}</p>
            </div>
          </div>

          {/* Add item buttons */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Button variant="outline" size="sm" onClick={() => openNewItem("planta")}>
                <Plus className="w-4 h-4" /> Planta
              </Button>
              <Button variant="outline" size="sm" onClick={() => openNewItem("insumo")}>
                <Plus className="w-4 h-4" /> Insumo
              </Button>
              <Button variant="outline" size="sm" onClick={() => openNewItem("servico")}>
                <Plus className="w-4 h-4" /> Serviço
              </Button>
            </div>
          )}

          {/* Grouped items */}
          {Object.keys(groupedItens).length > 0 ? (
            <div className="space-y-4">
              {tipoItemOrder.map((tipo) => {
                const items = groupedItens[tipo];
                if (!items) return null;
                const isExpanded = expandedGroups[tipo] !== false;

                return (
                  <div key={tipo} className="card-botanical overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        setExpandedGroups((g) => ({ ...g, [tipo]: !isExpanded }))
                      }
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <h3 className="font-display font-semibold text-foreground">
                          {tipoItemLabels[tipo]} ({items.length})
                        </h3>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(
                          items.reduce((s, i) => s + (i.preco_venda || 0) * (i.quantidade || 1), 0)
                        )}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t divide-y">
                        {items.map((item) => (
                          <div key={item.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">{item.descricao}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                  <span>Qtd: {item.quantidade} {item.unidade}</span>
                                  <span>Custo: {formatCurrency(item.preco_custo)}</span>
                                  <span>Margem: {item.margem_percentual}%</span>
                                  <span>Reserva: {formatCurrency(item.reserva_valor)}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-primary">
                                  {formatCurrency(item.preco_venda * item.quantidade)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.preco_venda)}/un
                                </p>
                              </div>
                            </div>

                            {/* Cotações */}
                            {item.cotacoes.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Cotações ({item.cotacoes.length})
                                </p>
                                {item.cotacoes.map((cot) => (
                                  <div
                                    key={cot.id}
                                    className={`flex items-center justify-between text-sm p-2 rounded ${
                                      cot.selecionada ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isAdmin && (
                                        <button
                                          onClick={() =>
                                            selecionarCotacaoMutation.mutate({ cotacao: cot, item })
                                          }
                                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            cot.selecionada
                                              ? "border-primary bg-primary"
                                              : "border-muted-foreground/40"
                                          }`}
                                        >
                                          {cot.selecionada && <Check className="w-3 h-3 text-primary-foreground" />}
                                        </button>
                                      )}
                                      <span>
                                        {cot.fornecedor_nome ||
                                          fornecedores.find((f) => f.id === cot.fornecedor_id)?.nome ||
                                          "Fornecedor"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{formatCurrency(cot.preco_unitario)}</span>
                                      {isAdmin && (
                                        <button
                                          onClick={() => deleteCotacaoMutation.mutate(cot.id)}
                                          className="text-muted-foreground hover:text-destructive"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            {isAdmin && (
                              <div className="flex gap-2 mt-3">
                                <Button variant="outline" size="sm" onClick={() => setShowCotacaoDialog(item.id)}>
                                  <Plus className="w-3 h-3" /> Cotação
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEditItem(item)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setItemToDelete(item.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum item no orçamento</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingItem && (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={itemForm.tipo} onValueChange={(v) => setItemForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planta">Planta</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemForm.tipo === "planta" && (
              <div className="space-y-2">
                <Label>Planta</Label>
                <Select value={itemForm.planta_id} onValueChange={handlePlantaChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {plantas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome_popular}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemForm.tipo === "insumo" && (
              <div className="space-y-2">
                <Label>Insumo</Label>
                <Select value={itemForm.insumo_id} onValueChange={handleInsumoChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {insumos.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>{ins.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={itemForm.descricao}
                onChange={(e) => setItemForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.quantidade}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantidade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={itemForm.unidade}
                  onChange={(e) => setItemForm((f) => ({ ...f, unidade: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Margem (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={itemForm.margem_percentual}
                  onChange={(e) => setItemForm((f) => ({ ...f, margem_percentual: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Reserva (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemForm.reserva_valor}
                  onChange={(e) => setItemForm((f) => ({ ...f, reserva_valor: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancelar</Button>
            <Button
              variant="terracota"
              onClick={() => saveItemMutation.mutate()}
              disabled={saveItemMutation.isPending || !itemForm.descricao}
            >
              {saveItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Cotação Dialog */}
      <Dialog open={!!showCotacaoDialog} onOpenChange={() => setShowCotacaoDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Cotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={cotacaoForm.fornecedor_id}
                onValueChange={(v) => {
                  const f = fornecedores.find((x) => x.id === v);
                  setCotacaoForm((c) => ({ ...c, fornecedor_id: v, fornecedor_nome: f?.nome || "" }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ou nome avulso</Label>
              <Input
                value={cotacaoForm.fornecedor_nome}
                onChange={(e) => setCotacaoForm((c) => ({ ...c, fornecedor_nome: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Unitário *</Label>
              <Input
                type="number"
                step="0.01"
                value={cotacaoForm.preco_unitario}
                onChange={(e) => setCotacaoForm((c) => ({ ...c, preco_unitario: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input
                value={cotacaoForm.observacao}
                onChange={(e) => setCotacaoForm((c) => ({ ...c, observacao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCotacaoDialog(null)}>Cancelar</Button>
            <Button
              variant="terracota"
              onClick={() => showCotacaoDialog && saveCotacaoMutation.mutate(showCotacaoDialog)}
              disabled={saveCotacaoMutation.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Alert */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Este item e todas as suas cotações serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteItemMutation.mutate(itemToDelete)}
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
