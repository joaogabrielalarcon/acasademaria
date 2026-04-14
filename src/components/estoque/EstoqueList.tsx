import { useState, useMemo } from "react";
import { useEstoqueSaldos, useEstoqueMovimentacoes, useRegistrarMovimentacao } from "@/hooks/useEstoque";
import { useInsumos } from "@/hooks/useInsumos";
import { usePlantas } from "@/hooks/usePlantas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EstoqueListProps {
  itemTipo: "insumo" | "planta";
}

export function EstoqueList({ itemTipo }: EstoqueListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"entrada" | "saida">("entrada");
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);

  const { data: saldos = [], isLoading: loadingSaldos } = useEstoqueSaldos(itemTipo);
  const { data: insumos = [] } = useInsumos();
  const { data: plantas = [] } = usePlantas();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: movimentacoes = [] } = useEstoqueMovimentacoes(itemTipo);
  const registrar = useRegistrarMovimentacao();

  const [formData, setFormData] = useState({
    item_id: "",
    quantidade: "",
    preco_unitario: "",
    fornecedor_id: "",
    observacoes: "",
  });

  const items = itemTipo === "insumo"
    ? insumos.map(i => ({ id: i.id, nome: i.nome, unidade: i.unidade }))
    : plantas.map(p => ({ id: p.id, nome: p.nome_popular, unidade: p.unidade }));

  const itemsMap = new Map(items.map(i => [i.id, i]));
  const saldosMap = new Map(saldos.map(s => [s.item_id, s]));

  // Items with saldo + items without saldo
  const allItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const result = items.map(item => {
      const saldo = saldosMap.get(item.id);
      return {
        ...item,
        saldo: saldo?.saldo ?? 0,
        total_entradas: saldo?.total_entradas ?? 0,
        total_saidas: saldo?.total_saidas ?? 0,
        ultima_movimentacao: saldo?.ultima_movimentacao ?? null,
      };
    });

    return result
      .filter(i => i.nome.toLowerCase().includes(term))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [items, saldos, searchTerm]);

  const handleOpenDialog = (type: "entrada" | "saida") => {
    setDialogType(type);
    setFormData({ item_id: "", quantidade: "", preco_unitario: "", fornecedor_id: "", observacoes: "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_id) { toast.error("Selecione um item"); return; }
    if (!formData.quantidade || parseFloat(formData.quantidade) <= 0) { toast.error("Quantidade inválida"); return; }

    registrar.mutate({
      item_id: formData.item_id,
      item_tipo: itemTipo,
      tipo_movimento: dialogType,
      quantidade: parseFloat(formData.quantidade),
      preco_unitario: formData.preco_unitario ? parseFloat(formData.preco_unitario) : 0,
      fornecedor_id: formData.fornecedor_id || null,
      origem: dialogType === "entrada" ? "compra" : "manual",
      observacoes: formData.observacoes || undefined,
    }, {
      onSuccess: () => {
        toast.success(dialogType === "entrada" ? "Entrada registrada!" : "Saída registrada!");
        setDialogOpen(false);
      },
      onError: (err) => toast.error("Erro: " + err.message),
    });
  };

  const historyItems = historyItemId
    ? movimentacoes.filter(m => m.item_id === historyItemId).slice(0, 20)
    : [];

  return (
    <>
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="gap-2" onClick={() => handleOpenDialog("entrada")}>
            <ArrowDownCircle className="w-4 h-4" /> Registrar Entrada
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleOpenDialog("saida")}>
            <ArrowUpCircle className="w-4 h-4" /> Registrar Saída
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSaldos ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : allItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                allItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.unidade || "-"}</TableCell>
                    <TableCell className="text-right text-emerald-600">{item.total_entradas}</TableCell>
                    <TableCell className="text-right text-red-500">{item.total_saidas}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.saldo > 0 ? "default" : item.saldo === 0 ? "secondary" : "destructive"}>
                        {item.saldo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Ver movimentações"
                        onClick={() => setHistoryItemId(historyItemId === item.id ? null : item.id)}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* History inline */}
        {historyItemId && historyItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                Movimentações — {itemsMap.get(historyItemId)?.nome}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setHistoryItemId(null)}>Fechar</Button>
            </div>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyItems.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell>{format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo_movimento === "entrada" ? "default" : "destructive"}>
                          {mov.tipo_movimento === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{mov.origem}</TableCell>
                      <TableCell className="text-right">{mov.quantidade}</TableCell>
                      <TableCell className="text-right">
                        {mov.preco_unitario ? `R$ ${mov.preco_unitario.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{mov.observacoes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Dialog entrada/saída */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "entrada" ? "Registrar Entrada (Compra)" : "Registrar Saída Manual"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{itemTipo === "insumo" ? "Insumo" : "Planta"} *</Label>
              <Select value={formData.item_id} onValueChange={v => setFormData({ ...formData, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {items.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantidade}
                  onChange={e => setFormData({ ...formData, quantidade: e.target.value })}
                />
              </div>
              {dialogType === "entrada" && (
                <div className="space-y-2">
                  <Label>Preço Unitário (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.preco_unitario}
                    onChange={e => setFormData({ ...formData, preco_unitario: e.target.value })}
                  />
                </div>
              )}
            </div>

            {dialogType === "entrada" && (
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={formData.fornecedor_id} onValueChange={v => setFormData({ ...formData, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={registrar.isPending}>
                {registrar.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
