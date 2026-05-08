import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Check,
  X,
  Trash2,
  Loader2,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Star,
  History,
} from "lucide-react";
import { OrcamentoItem, OrcamentoCotacao, calcularPrecoVenda } from "@/hooks/useOrcamento";
import { Fornecedor } from "@/hooks/useFornecedores";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CotacaoSheetProps {
  item: (OrcamentoItem & { cotacoes: OrcamentoCotacao[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedores: Fornecedor[];
  isAdmin: boolean;
  projetoId: string;
  precoReferencia?: number | null;
}

export function CotacaoSheet({
  item,
  open,
  onOpenChange,
  fornecedores,
  isAdmin,
  projetoId,
  precoReferencia,
}: CotacaoSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fornecedor_id: "",
    fornecedor_nome: "",
    preco_unitario: "",
    observacao: "",
  });

  // Fetch price history for the linked planta/insumo + fornecedor
  const linkedId = item?.planta_id || item?.insumo_id;
  const linkedTipo = item?.planta_id ? "planta" : item?.insumo_id ? "insumo" : null;

  const { data: historicoPrecos = [] } = useQuery({
    queryKey: ["historico-cotacoes", linkedTipo, linkedId],
    queryFn: async () => {
      if (!linkedId || !linkedTipo) return [];
      // Get from orcamento_cotacoes joined through orcamento_itens
      const column = linkedTipo === "planta" ? "planta_id" : "insumo_id";
      const { data, error } = await (supabase as any)
        .from("orcamento_itens")
        .select(`id, projeto_id, ${column}, orcamento_cotacoes(fornecedor_id, fornecedor_nome, preco_unitario, selecionada, created_at)`)
        .eq(column, linkedId)
        .neq("projeto_id", projetoId);
      if (error) throw error;
      // Flatten
      const records: { fornecedor_nome: string; preco_unitario: number; created_at: string; selecionada: boolean }[] = [];
      for (const item of data || []) {
        const cotacoes = (item as any).orcamento_cotacoes || [];
        for (const c of cotacoes) {
          records.push({
            fornecedor_nome: c.fornecedor_nome || "—",
            preco_unitario: c.preco_unitario,
            created_at: c.created_at,
            selecionada: c.selecionada,
          });
        }
      }
      records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return records.slice(0, 10);
    },
    enabled: !!linkedId && open,
  });

  // Stats
  const stats = useMemo(() => {
    if (!item || item.cotacoes.length === 0) return null;
    const precos = item.cotacoes.map((c) => c.preco_unitario);
    const menor = Math.min(...precos);
    const maior = Math.max(...precos);
    const media = precos.reduce((a, b) => a + b, 0) / precos.length;
    const selecionada = item.cotacoes.find((c) => c.selecionada);
    return { menor, maior, media, selecionada };
  }, [item]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Mutations
  const saveCotacaoMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const preco = parseFloat(form.preco_unitario) || 0;
      const { error } = await supabase.from("orcamento_cotacoes").insert({
        item_id: item.id,
        fornecedor_id: form.fornecedor_id || null,
        fornecedor_nome: form.fornecedor_nome || null,
        preco_unitario: preco,
        observacao: form.observacao || null,
      });
      if (error) throw error;

      // Save to historico_precos if linked to planta/insumo
      if (linkedId && linkedTipo && form.fornecedor_id) {
        await supabase.from("historico_precos").insert({
          item_id: linkedId,
          item_tipo: linkedTipo,
          fornecedor_id: form.fornecedor_id,
          preco: preco,
          data_orcamento: new Date().toISOString().split("T")[0],
          observacoes: `Cotação projeto`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["historico-cotacoes"] });
      setForm({ fornecedor_id: "", fornecedor_nome: "", preco_unitario: "", observacao: "" });
      setShowForm(false);
      toast({ title: "Cotação adicionada" });
    },
    onError: () => toast({ title: "Erro ao salvar cotação", variant: "destructive" }),
  });

  const selecionarMutation = useMutation({
    mutationFn: async (cotacao: OrcamentoCotacao) => {
      if (!item) return;
      await supabase.from("orcamento_cotacoes").update({ selecionada: false }).eq("item_id", item.id);
      await supabase.from("orcamento_cotacoes").update({ selecionada: true }).eq("id", cotacao.id);
      const precoCusto = cotacao.preco_unitario;
      const precoVenda = calcularPrecoVenda(precoCusto, item.reserva_valor, item.margem_percentual);
      await supabase.from("orcamento_itens").update({ preco_custo: precoCusto, preco_venda: precoVenda }).eq("id", item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-cotacoes"] });
      queryClient.invalidateQueries({ queryKey: ["orcamento-itens", projetoId] });
      toast({ title: "Fornecedor selecionado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { error } = await supabase.from("orcamento_cotacoes").delete().eq("id", cotacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento-cotacoes"] });
      toast({ title: "Cotação removida" });
    },
  });

  if (!item) return null;

  // Status
  const cotacaoStatus = item.cotacoes.length === 0
    ? { label: "Sem cotação", className: "bg-muted text-muted-foreground" }
    : item.cotacoes.some((c) => c.selecionada)
    ? { label: "Fornecedor selecionado", className: "bg-primary/15 text-primary border-primary/30" }
    : { label: "Cotações pendentes", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left font-display">{item.descricao}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cotacaoStatus.className}>
              {cotacaoStatus.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Qtd: {item.quantidade} {item.unidade} · Margem: {item.margem_percentual}% · Reserva: {formatCurrency(item.reserva_valor)}
            </span>
          </div>
        </SheetHeader>

        {/* Price Reference */}
        {precoReferencia != null && precoReferencia > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">Preço de Referência</span>
              <span className="ml-auto font-bold text-primary">{formatCurrency(precoReferencia)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor estimado cadastrado na base (não é cotação oficial)</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
              <TrendingDown className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs text-muted-foreground">Menor</p>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(stats.menor)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted text-center">
              <BarChart3 className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Médio</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(stats.media)}</p>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 text-center">
              <TrendingUp className="w-3.5 h-3.5 mx-auto text-rose-600 mb-1" />
              <p className="text-xs text-muted-foreground">Maior</p>
              <p className="text-sm font-bold text-rose-700">{formatCurrency(stats.maior)}</p>
            </div>
          </div>
        )}

        <Separator className="mb-4" />

        {/* Cotações list */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Cotações ({item.cotacoes.length})</h4>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus className="w-3.5 h-3.5" /> Nova Cotação
              </Button>
            )}
          </div>

          {item.cotacoes.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma cotação adicionada.</p>
          )}

          {item.cotacoes.map((cot) => (
            <div
              key={cot.id}
              className={`p-3 rounded-lg border transition-colors ${
                cot.selecionada
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isAdmin && (
                    <button
                      onClick={() => selecionarMutation.mutate(cot)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        cot.selecionada
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40 hover:border-primary"
                      }`}
                    >
                      {cot.selecionada && <Check className="w-3 h-3 text-primary-foreground" />}
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {cot.fornecedor_nome ||
                        fornecedores.find((f) => f.id === cot.fornecedor_id)?.nome ||
                        "Fornecedor"}
                    </p>
                    {cot.observacao && (
                      <p className="text-xs text-muted-foreground truncate">{cot.observacao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-sm">{formatCurrency(cot.preco_unitario)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => deleteMutation.mutate(cot.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {cot.selecionada && (
                <div className="mt-2 pt-2 border-t border-primary/20 text-xs text-muted-foreground">
                  Preço final: <span className="font-bold text-primary">{formatCurrency(calcularPrecoVenda(cot.preco_unitario, item.reserva_valor, item.margem_percentual))}</span> /un
                </div>
              )}
            </div>
          ))}
        </div>

        {/* New cotação form */}
        {showForm && isAdmin && (
          <div className="p-4 rounded-lg border border-dashed border-primary/30 bg-muted/30 space-y-3 mb-4">
            <h5 className="text-sm font-semibold text-foreground">Nova Cotação</h5>
            <div className="space-y-2">
              <Label className="text-xs">Fornecedor</Label>
              <Select
                value={form.fornecedor_id}
                onValueChange={(v) => {
                  const f = fornecedores.find((x) => x.id === v);
                  setForm((c) => ({ ...c, fornecedor_id: v, fornecedor_nome: f?.nome || "" }));
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
              <Label className="text-xs">Ou nome avulso</Label>
              <Input
                value={form.fornecedor_nome}
                onChange={(e) => setForm((c) => ({ ...c, fornecedor_nome: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Preço Unitário *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_unitario}
                onChange={(e) => setForm((c) => ({ ...c, preco_unitario: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observação</Label>
              <Input
                value={form.observacao}
                onChange={(e) => setForm((c) => ({ ...c, observacao: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                variant="terracota"
                size="sm"
                onClick={() => saveCotacaoMutation.mutate()}
                disabled={saveCotacaoMutation.isPending || !form.preco_unitario}
              >
                {saveCotacaoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {/* Price history */}
        {historicoPrecos.length > 0 && (
          <>
            <Separator className="mb-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Histórico de Preços</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Cotações anteriores deste item em outros projetos</p>
              {historicoPrecos.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <div>
                    <p className="text-foreground">{h.fornecedor_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      {h.selecionada && <span className="ml-1 text-primary">✓ selecionada</span>}
                    </p>
                  </div>
                  <span className="font-medium">{formatCurrency(h.preco_unitario)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
