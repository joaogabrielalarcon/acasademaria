import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinanceiroMovimentacoes, useRegistrarFinanceiro } from "@/hooks/useFinanceiroMovimentacoes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowDownCircle, ArrowUpCircle, Search, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const CATEGORIAS = [
  "compra_insumo",
  "compra_planta",
  "servico",
  "recebimento_cliente",
  "salario",
  "combustivel",
  "manutencao_maquina",
  "outros",
];

const CATEGORIAS_LABELS: Record<string, string> = {
  compra_insumo: "Compra de Insumo",
  compra_planta: "Compra de Planta",
  servico: "Serviço",
  recebimento_cliente: "Recebimento de Cliente",
  salario: "Salário",
  combustivel: "Combustível",
  manutencao_maquina: "Manutenção Máquina",
  outros: "Outros",
};

export default function Movimentacoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const { data: movimentacoes = [], isLoading } = useFinanceiroMovimentacoes();
  const { data: fornecedores = [] } = useFornecedores();
  const registrar = useRegistrarFinanceiro();
  const fornecedoresMap = new Map(fornecedores.map(f => [f.id, f.nome]));

  const [formData, setFormData] = useState({
    tipo: "saida" as "entrada" | "saida",
    categoria: "outros",
    descricao: "",
    valor: "",
    data_movimentacao: new Date().toISOString().split("T")[0],
    fornecedor_id: "",
  });

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return movimentacoes.filter(m => {
      const matchSearch = m.descricao.toLowerCase().includes(term);
      const matchTipo = filterTipo === "todos" || m.tipo === filterTipo;
      return matchSearch && matchTipo;
    });
  }, [movimentacoes, searchTerm, filterTipo]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const totals = useMemo(() => {
    const entradas = movimentacoes.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
    const saidas = movimentacoes.filter(m => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [movimentacoes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim()) { toast.error("Descrição obrigatória"); return; }
    if (!formData.valor || parseFloat(formData.valor) <= 0) { toast.error("Valor inválido"); return; }

    registrar.mutate({
      tipo: formData.tipo,
      categoria: formData.categoria,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      data_movimentacao: formData.data_movimentacao,
      fornecedor_id: formData.fornecedor_id || null,
    }, {
      onSuccess: () => {
        toast.success("Movimentação registrada!");
        setDialogOpen(false);
        setFormData({ tipo: "saida", categoria: "outros", descricao: "", valor: "", data_movimentacao: new Date().toISOString().split("T")[0], fornecedor_id: "" });
      },
      onError: (err) => toast.error("Erro: " + err.message),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground mt-1">Controle de entradas e saídas financeiras</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-xl font-bold text-emerald-600">
                    R$ {totals.entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-xl font-bold text-red-600">
                    R$ {totals.saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-xl font-bold ${totals.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    R$ {totals.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" /> Nova Movimentação
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
              ) : (
                visible.map(mov => (
                  <TableRow key={mov.id}>
                    <TableCell>{format(new Date(mov.data_movimentacao), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Badge variant={mov.tipo === "entrada" ? "default" : "destructive"} className="gap-1">
                        {mov.tipo === "entrada" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                        {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell>{CATEGORIAS_LABELS[mov.categoria] || mov.categoria}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{mov.descricao}</TableCell>
                    <TableCell>{mov.fornecedor_id ? fornecedoresMap.get(mov.fornecedor_id) || "-" : "-"}</TableCell>
                    <TableCell className={`text-right font-medium ${mov.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                      {mov.tipo === "entrada" ? "+" : "-"} R$ {mov.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setVisibleCount(c => c + 30)}>
              Carregar mais ({filtered.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v: "entrada" | "saida") => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.categoria} onValueChange={v => setFormData({ ...formData, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => (
                    <SelectItem key={c} value={c}>{CATEGORIAS_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" min="0.01" step="0.01" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.data_movimentacao} onChange={e => setFormData({ ...formData, data_movimentacao: e.target.value })} />
              </div>
            </div>
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
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={registrar.isPending}>
                {registrar.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
