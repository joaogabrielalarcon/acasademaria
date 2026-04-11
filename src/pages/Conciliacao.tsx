import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, Upload, Check, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useConciliacaoLancamentos,
  useConciliacaoExtratos,
  useImportarExtrato,
  useDarBaixa,
  useConfirmarCliente,
} from "@/hooks/useConciliacao";
import { useClientesSimples } from "@/hooks/useClientes";

const BANCOS = [
  { value: "nubank", label: "Nubank PF" },
  { value: "itau", label: "Itaú Empresas" },
  { value: "safra", label: "Safra Empresas" },
];

export default function Conciliacao() {
  const [modalOpen, setModalOpen] = useState(false);
  const [banco, setBanco] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [extratoAtivo, setExtratoAtivo] = useState<string | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<Record<string, string>>({});

  const { data: extratos = [] } = useConciliacaoExtratos();
  const { data: lancamentos = [], isLoading: loadingLanc } = useConciliacaoLancamentos(extratoAtivo);
  const { data: clientes = [] } = useClientesSimples();
  const importar = useImportarExtrato();
  const darBaixa = useDarBaixa();
  const confirmarCliente = useConfirmarCliente();

  const identificados = useMemo(() => lancamentos.filter((l: any) => l.status === "identificado"), [lancamentos]);
  const pendentes = useMemo(() => lancamentos.filter((l: any) => l.status === "pendente"), [lancamentos]);
  const emAberto = useMemo(() => lancamentos.filter((l: any) => l.status === "em_aberto"), [lancamentos]);

  const handleImportar = async () => {
    if (!arquivo || !banco) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const ext = arquivo.name.split(".").pop()?.toLowerCase();

      const result = await importar.mutateAsync({
        arquivo_base64: base64,
        banco,
        arquivo_nome: arquivo.name,
        data_extrato: new Date().toISOString().split("T")[0],
        tipo_arquivo: ext === "csv" ? "csv" : "pdf",
      });

      setExtratoAtivo(result.extrato_id);
      setModalOpen(false);
      setBanco("");
      setArquivo(null);
    };
    reader.readAsDataURL(arquivo);
  };

  const handleDarBaixaTodos = () => {
    const ids = identificados.map((l: any) => l.id);
    if (ids.length > 0) darBaixa.mutate(ids);
  };

  const handleConfirmar = (lancId: string) => {
    const clienteId = clienteSelecionado[lancId];
    if (!clienteId) return;
    const lanc = lancamentos.find((l: any) => l.id === lancId) as any;
    confirmarCliente.mutate({
      lancamentoId: lancId,
      clienteId,
      remetente_raw: lanc?.remetente_raw || undefined,
      conta_raw: lanc?.conta_raw || undefined,
      chave_pix_raw: lanc?.chave_pix_raw || undefined,
    });
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const formatDate = (d: string) => {
    try {
      return format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return d;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Landmark className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Conciliação Bancária</h1>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Extrato
          </Button>
        </div>

        {/* Extrato selector */}
        {extratos.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <Label className="mb-2 block">Selecione um extrato processado:</Label>
              <Select value={extratoAtivo || ""} onValueChange={setExtratoAtivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um extrato..." />
                </SelectTrigger>
                <SelectContent>
                  {extratos.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.banco.toUpperCase()} — {formatDate(e.data_extrato)} — {e.arquivo_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Results tabs */}
        {extratoAtivo && (
          <Tabs defaultValue="identificados" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="identificados" className="gap-2">
                <Check className="h-4 w-4" />
                Identificados ({identificados.length})
              </TabsTrigger>
              <TabsTrigger value="pendentes" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Não identificados ({pendentes.length})
              </TabsTrigger>
              <TabsTrigger value="em_aberto" className="gap-2">
                <XCircle className="h-4 w-4" />
                Em aberto ({emAberto.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1 - Identificados */}
            <TabsContent value="identificados">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Pagamentos Identificados</CardTitle>
                  {identificados.length > 0 && (
                    <Button size="sm" onClick={handleDarBaixaTodos} disabled={darBaixa.isPending}>
                      Dar baixa em todos
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {identificados.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum pagamento identificado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {identificados.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell>{formatDate(l.data_lancamento)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                {l.clientes?.nome || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(l.valor)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{l.descricao}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => darBaixa.mutate([l.id])}
                                disabled={darBaixa.isPending}
                              >
                                Dar baixa
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2 - Pendentes */}
            <TabsContent value="pendentes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pagamentos Não Identificados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendentes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Todos os pagamentos foram identificados!</p>
                  ) : (
                    pendentes.map((l: any) => (
                      <Card key={l.id} className="border-secondary">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-lg font-bold text-foreground">{formatCurrency(l.valor)}</span>
                              <span className="ml-3 text-sm text-muted-foreground">{formatDate(l.data_lancamento)}</span>
                            </div>
                            <Badge className="bg-secondary text-secondary-foreground">Pendente</Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {l.remetente_raw && (
                              <div>
                                <span className="text-muted-foreground">Remetente:</span>
                                <p className="font-medium text-foreground">{l.remetente_raw}</p>
                              </div>
                            )}
                            {l.conta_raw && (
                              <div>
                                <span className="text-muted-foreground">Conta:</span>
                                <p className="font-medium text-foreground">{l.conta_raw}</p>
                              </div>
                            )}
                            {l.chave_pix_raw && (
                              <div>
                                <span className="text-muted-foreground">Chave PIX:</span>
                                <p className="font-medium text-foreground">{l.chave_pix_raw}</p>
                              </div>
                            )}
                            {l.descricao && (
                              <div>
                                <span className="text-muted-foreground">Descrição:</span>
                                <p className="font-medium text-foreground">{l.descricao}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <Label>Qual cliente é esse?</Label>
                              <Select
                                value={clienteSelecionado[l.id] || ""}
                                onValueChange={(v) =>
                                  setClienteSelecionado((prev) => ({ ...prev, [l.id]: v }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {clientes.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => handleConfirmar(l.id)}
                              disabled={!clienteSelecionado[l.id] || confirmarCliente.isPending}
                            >
                              Confirmar e aprender
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3 - Em aberto */}
            <TabsContent value="em_aberto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pagamentos Em Aberto</CardTitle>
                </CardHeader>
                <CardContent>
                  {emAberto.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum pagamento em aberto no momento.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emAberto.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell>{formatDate(l.data_lancamento)}</TableCell>
                            <TableCell>{l.clientes?.nome || "—"}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(l.valor)}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">Em aberto</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!extratoAtivo && extratos.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum extrato importado</h3>
              <p className="text-muted-foreground mb-4">
                Importe um extrato bancário para começar a conciliação.
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Extrato
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de importação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Extrato Bancário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Banco</Label>
              <Select value={banco} onValueChange={setBanco}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco..." />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo (.csv ou .pdf)</Label>
              <Input
                type="file"
                accept=".csv,.pdf"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportar}
              disabled={!arquivo || !banco || importar.isPending}
            >
              {importar.isPending ? "Processando..." : "Processar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
