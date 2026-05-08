import { useState, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
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
  FileText,
  BarChart3,
  ClipboardList,
  Info,
  Calendar,
  Droplets,
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
import { ResumoFinanceiroTab } from "@/components/projeto/ResumoFinanceiroTab";
import { ExecucaoTab } from "@/components/projeto/ExecucaoTab";
import { DashboardTab } from "@/components/projeto/DashboardTab";
import { CotacaoSheet } from "@/components/projeto/CotacaoSheet";
import { InformacoesProjetoTab } from "@/components/projeto/InformacoesProjetoTab";
import { DiarioProjetoTab } from "@/components/projeto/DiarioProjetoTab";
import { DiarioManutencaoTab } from "@/components/projeto/DiarioManutencaoTab";
import { IrrigacaoTab } from "@/components/projeto/IrrigacaoTab";
import { Progress } from "@/components/ui/progress";

export default function ProjetoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    initialTab === "diario" ||
      initialTab === "orcamento" ||
      initialTab === "execucao" ||
      initialTab === "resumo" ||
      initialTab === "dashboard" ||
      initialTab === "irrigacao"
       ? initialTab
      : "informacoes",
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const nextSearchParams = new URLSearchParams(searchParams);

    if (value === "informacoes") {
      nextSearchParams.delete("tab");
    } else {
      nextSearchParams.set("tab", value);
    }

    setSearchParams(nextSearchParams, { replace: true });
  };

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(id);
  const { data: cliente } = useCliente(projeto?.cliente_id);

  // Lazy: only load when orcamento tab is active (or related tabs that need this data)
  const needsOrcamento = activeTab === "orcamento" || activeTab === "resumo" || activeTab === "execucao" || activeTab === "dashboard";
  const { data: itens = [], isLoading: loadingItens } = useOrcamentoItens(needsOrcamento ? id : undefined);
  const itemIds = itens.map((i) => i.id);
  const { data: todasCotacoes = [] } = useOrcamentoCotacoes(needsOrcamento ? itemIds : []);
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
  const [cotacaoSheetItem, setCotacaoSheetItem] = useState<string | null>(null); // item_id for sheet

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

  // Cotação completion
  const itensCotados = useMemo(() => {
    return itens.filter((item) =>
      todasCotacoes.some((c) => c.item_id === item.id && c.selecionada)
    ).length;
  }, [itens, todasCotacoes]);
  const cotacaoPercent = itens.length > 0 ? Math.round((itensCotados / itens.length) * 100) : 0;

  // Get item with cotações for sheet
  const sheetItem = useMemo(() => {
    if (!cotacaoSheetItem) return null;
    const item = itens.find((i) => i.id === cotacaoSheetItem);
    if (!item) return null;
    return { ...item, cotacoes: todasCotacoes.filter((c) => c.item_id === item.id) };
  }, [cotacaoSheetItem, itens, todasCotacoes]);

  // Get reference price for sheet item
  const sheetPrecoReferencia = useMemo(() => {
    if (!sheetItem) return null;
    if (sheetItem.planta_id) {
      const p = plantas.find((x) => x.id === sheetItem.planta_id);
      return p?.preco_unitario ?? null;
    }
    if (sheetItem.insumo_id) {
      const ins = insumos.find((x) => x.id === sheetItem.insumo_id);
      return ins?.preco_unitario ?? null;
    }
    return null;
  }, [sheetItem, plantas, insumos]);

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

      const sb = supabase as any;
      if (editingItem) {
        const { error } = await sb.from("orcamento_itens").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("orcamento_itens").insert(payload);
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="informacoes" className="gap-2">
            <Info className="w-4 h-4" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="diario" className="gap-2">
            <Calendar className="w-4 h-4" />
            Diário
          </TabsTrigger>
          <TabsTrigger value="irrigacao" className="gap-2">
            <Droplets className="w-4 h-4" />
            Irrigação
          </TabsTrigger>
          <TabsTrigger value="orcamento" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Orçamento
          </TabsTrigger>
          <TabsTrigger value="execucao" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Execução
          </TabsTrigger>
          <TabsTrigger value="resumo" className="gap-2">
            <FileText className="w-4 h-4" />
            Resumo Financeiro
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Informações do Projeto */}
        <TabsContent value="informacoes">
          <InformacoesProjetoTab
            projeto={projeto}
            isAdmin={isAdmin}
            userId={user?.id}
          />
        </TabsContent>

        {/* Diário */}
        <TabsContent value="diario">
          <DiarioProjetoTab
            key={`diario-${id}-${activeTab === "diario" ? "open" : "closed"}`}
            projetoId={id!}
            projetoNome={projeto.titulo}
            clienteNome={cliente?.nome || "Cliente"}
            clienteId={projeto.cliente_id}
            isActive={activeTab === "diario"}
          />
        </TabsContent>

        <TabsContent value="orcamento">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
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
            <div className="card-botanical p-4">
              <p className="text-sm text-muted-foreground">Cotações</p>
              <p className="text-2xl font-bold text-foreground">{itensCotados} <span className="text-base font-normal text-muted-foreground">de {itens.length}</span></p>
              <Progress value={cotacaoPercent} className="h-2 mt-2" />
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
                        {items.map((item) => {
                          const hasCotacoes = item.cotacoes.length > 0;
                          const temSelecionada = item.cotacoes.some((c) => c.selecionada);
                          const statusBadge = !hasCotacoes
                            ? { label: "Sem cotação", className: "bg-muted text-muted-foreground" }
                            : temSelecionada
                            ? { label: "Selecionado", className: "bg-primary/15 text-primary border-primary/30" }
                            : { label: "Pendente", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" };

                          return (
                          <div key={item.id} className="p-4">
                            <div
                              className="flex items-start justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setCotacaoSheetItem(item.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-foreground">{item.descricao}</p>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge.className}`}>
                                    {statusBadge.label}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                  <span>Qtd: {item.quantidade} {item.unidade}</span>
                                  <span>Custo: {formatCurrency(item.preco_custo)}</span>
                                  <span>Margem: {item.margem_percentual}%</span>
                                  <span>Reserva: {formatCurrency(item.reserva_valor)}</span>
                                  {hasCotacoes && <span>{item.cotacoes.length} cotação(ões)</span>}
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

                            {/* Actions */}
                            {isAdmin && (
                              <div className="flex gap-2 mt-3">
                                <Button variant="outline" size="sm" onClick={() => setCotacaoSheetItem(item.id)}>
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
                          );
                        })}
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

        {/* Resumo Financeiro */}
        <TabsContent value="resumo">
          <ResumoFinanceiroTab itens={itens} />
        </TabsContent>

        {/* Execução */}
        <TabsContent value="execucao">
          <ExecucaoTab projetoId={id!} clienteId={projeto.cliente_id} itens={itens} />
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <DashboardTab
            itens={itens}
            projetoStatus={projeto.status}
            dataCriacao={projeto.created_at}
            dataPrevisao={projeto.data_previsao}
          />
        </TabsContent>

        {/* Irrigação */}
        <TabsContent value="irrigacao">
          <IrrigacaoTab projetoId={id!} />
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

      {/* Cotação Sheet */}
      <CotacaoSheet
        item={sheetItem}
        open={!!cotacaoSheetItem}
        onOpenChange={(open) => !open && setCotacaoSheetItem(null)}
        fornecedores={fornecedores}
        isAdmin={isAdmin}
        projetoId={id!}
        precoReferencia={sheetPrecoReferencia}
      />

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
