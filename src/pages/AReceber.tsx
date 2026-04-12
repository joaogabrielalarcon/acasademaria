import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Plus, DollarSign, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function useProjetosAprovados() {
  return useQuery({
    queryKey: ["projetos-aprovados-receber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, valor_total, valor_mensal, tipo, status, cliente_id, clientes(nome)")
        .in("status", ["aprovado", "em_execucao"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useParcelas() {
  return useQuery({
    queryKey: ["financeiro-parcelas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_parcelas")
        .select("*, projetos(titulo), clientes(nome)")
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  pago: { label: "Pago", variant: "default" },
  vencido: { label: "Vencido", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "outline" },
};

export default function AReceber() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: projetos = [] } = useProjetosAprovados();
  const { data: parcelas = [], isLoading } = useParcelas();
  const [addModal, setAddModal] = useState<string | null>(null); // projeto_id
  const [novaParcelaValor, setNovaParcelaValor] = useState("");
  const [novaParcelaVencimento, setNovaParcelaVencimento] = useState("");

  const addParcela = useMutation({
    mutationFn: async (params: { projeto_id: string; cliente_id: string; numero: number; valor: number; data_vencimento: string | null }) => {
      const { error } = await supabase.from("financeiro_parcelas").insert({
        projeto_id: params.projeto_id,
        cliente_id: params.cliente_id,
        numero_parcela: params.numero,
        valor: params.valor,
        data_vencimento: params.data_vencimento,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-parcelas"] });
      toast({ title: "Parcela adicionada" });
      setAddModal(null);
      setNovaParcelaValor("");
      setNovaParcelaVencimento("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financeiro_parcelas").update({ status: "pago" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-parcelas"] });
      toast({ title: "Parcela marcada como paga" });
    },
  });

  const parcelasPorProjeto = useMemo(() => {
    const map: Record<string, any[]> = {};
    parcelas.forEach((p: any) => {
      if (!map[p.projeto_id]) map[p.projeto_id] = [];
      map[p.projeto_id].push(p);
    });
    return map;
  }, [parcelas]);

  const totalAReceber = useMemo(() =>
    parcelas.filter((p: any) => p.status === "pendente" || p.status === "vencido").reduce((s: number, p: any) => s + Number(p.valor), 0),
    [parcelas]
  );

  const totalRecebido = useMemo(() =>
    parcelas.filter((p: any) => p.status === "pago").reduce((s: number, p: any) => s + Number(p.valor), 0),
    [parcelas]
  );

  // Renewal alerts: maintenance projects whose last parcela is within 30 days
  const renewalAlerts = useMemo(() => {
    const today = new Date();
    const in30days = new Date(today);
    in30days.setDate(in30days.getDate() + 30);

    return projetos
      .filter((p: any) => p.tipo === "manutencao")
      .map((p: any) => {
        const pp = parcelasPorProjeto[p.id] || [];
        if (pp.length === 0) return null;
        const lastParcela = pp.reduce((latest: any, cur: any) => {
          if (!latest || (cur.data_vencimento && cur.data_vencimento > (latest.data_vencimento || ""))) return cur;
          return latest;
        }, null);
        if (!lastParcela?.data_vencimento) return null;
        const lastDate = new Date(lastParcela.data_vencimento + "T12:00:00");
        if (lastDate <= in30days) {
          return { projeto: p, ultimaData: lastParcela.data_vencimento };
        }
        return null;
      })
      .filter(Boolean);
  }, [projetos, parcelasPorProjeto]);

  const handleAddParcela = () => {
    if (!addModal || !novaParcelaValor) return;
    const projeto = projetos.find((p: any) => p.id === addModal);
    if (!projeto) return;
    const existentes = parcelasPorProjeto[addModal] || [];
    const maxNum = existentes.reduce((m: number, p: any) => Math.max(m, p.numero_parcela), 0);
    addParcela.mutate({
      projeto_id: addModal,
      cliente_id: projeto.cliente_id,
      numero: maxNum + 1,
      valor: parseFloat(novaParcelaValor),
      data_vencimento: novaParcelaVencimento || null,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 py-4">
        <div className="flex items-center gap-3">
          <Receipt className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">A Receber</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total a Receber</p>
                  <p className="text-xl font-bold text-foreground">R$ {totalAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Recebido</p>
                  <p className="text-xl font-bold text-foreground">R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Parcelas Vencidas</p>
                  <p className="text-xl font-bold text-foreground">{parcelas.filter((p: any) => p.status === "vencido").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Renewal Alerts */}
        {renewalAlerts.length > 0 && (
          <div className="space-y-2">
            {renewalAlerts.map((alert: any) => (
              <Alert key={alert.projeto.id} variant="destructive">
                <RefreshCw className="h-4 w-4" />
                <AlertTitle>Renovação necessária</AlertTitle>
                <AlertDescription>
                  O contrato de manutenção <strong>{alert.projeto.titulo}</strong> ({(alert.projeto as any).clientes?.nome}) 
                  vence em {format(new Date(alert.ultimaData + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}. 
                  É necessário renovar o contrato para continuar gerando parcelas.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Projetos e Parcelas */}
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : projetos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum projeto aprovado encontrado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projetos.map((projeto: any) => {
              const projetoParcelas = parcelasPorProjeto[projeto.id] || [];
              const totalProjeto = projetoParcelas.reduce((s: number, p: any) => s + Number(p.valor), 0);
              return (
                <Card key={projeto.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base">{projeto.titulo}</CardTitle>
                        <p className="text-sm text-muted-foreground">{(projeto as any).clientes?.nome}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          Valor total: <span className="font-semibold text-foreground">R$ {(projeto.valor_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setAddModal(projeto.id)}>
                          <Plus className="w-4 h-4 mr-1" /> Parcela
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {projetoParcelas.length > 0 && (
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projetoParcelas.map((p: any) => {
                            const cfg = statusConfig[p.status] || statusConfig.pendente;
                            return (
                              <TableRow key={p.id}>
                                <TableCell>#{p.numero_parcela}</TableCell>
                                <TableCell>R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell>
                                  {p.data_vencimento
                                    ? format(new Date(p.data_vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {p.status === "pendente" && (
                                    <Button size="sm" variant="ghost" onClick={() => marcarPago.mutate(p.id)}>
                                      <CheckCircle2 className="w-4 h-4 mr-1" /> Pago
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <p className="text-sm text-muted-foreground mt-2 text-right">
                        Parcelado: R$ {totalProjeto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        {projeto.valor_total && totalProjeto < projeto.valor_total && (
                          <span className="text-destructive ml-2">
                            (faltam R$ {(projeto.valor_total - totalProjeto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} sem parcela)
                          </span>
                        )}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Parcela Dialog */}
      <Dialog open={!!addModal} onOpenChange={(o) => !o && setAddModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Parcela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={novaParcelaValor} onChange={(e) => setNovaParcelaValor(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input type="date" value={novaParcelaVencimento} onChange={(e) => setNovaParcelaVencimento(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(null)}>Cancelar</Button>
            <Button onClick={handleAddParcela} disabled={!novaParcelaValor || addParcela.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
