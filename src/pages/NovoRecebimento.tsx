import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Plus, Trash2, Loader2, Package, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlantas } from "@/hooks/usePlantas";
import { useInsumos } from "@/hooks/useInsumos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useCategoriasPlantas } from "@/hooks/useCategoriasPlantas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ItemRecebido {
  id: string;
  tipoItem: "planta" | "insumo";
  plantaId?: string;
  insumoId?: string;
  nome: string;
  quantidade: number;
  unidade: string;
  porte?: string;
  alturaCm?: number;
  dapCm?: number;
  observacao?: string;
}

// Mock clientes - depois puxar do banco
const mockClientes = [
  { id: "1", nome: "Fazenda Boa Vista" },
  { id: "2", nome: "Sítio Recanto Verde" },
  { id: "3", nome: "Chácara Primavera" },
];

const unidadeOptions = [
  { value: "un", label: "Unidade" },
  { value: "mudas", label: "Mudas" },
  { value: "caixaria", label: "Caixaria" },
  { value: "pote", label: "Pote" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "L", label: "Litro" },
  { value: "mL", label: "Mililitro" },
  { value: "sacos", label: "Sacos" },
  { value: "galoes", label: "Galões" },
  { value: "pacotes", label: "Pacotes" },
];

const porteOptions = [
  { value: "P", label: "Pequeno (P)" },
  { value: "M", label: "Médio (M)" },
  { value: "G", label: "Grande (G)" },
  { value: "XG", label: "Extra Grande (XG)" },
];

export default function NovoRecebimento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get("cliente");
  const dataParam = searchParams.get("data");

  // Estados do formulário
  const [clienteId, setClienteId] = useState(clienteIdParam || "");
  const [dataRecebimento, setDataRecebimento] = useState<Date | undefined>(
    dataParam ? new Date(dataParam) : new Date()
  );
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemRecebido[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para adicionar item
  const [tipoItemNovo, setTipoItemNovo] = useState<"planta" | "insumo">("planta");
  const [itemSelecionadoId, setItemSelecionadoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("");
  const [porte, setPorte] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [dapCm, setDapCm] = useState("");
  const [observacaoItem, setObservacaoItem] = useState("");

  // Hooks para dados
  const { data: plantas = [], isLoading: loadingPlantas } = usePlantas();
  const { data: insumos = [], isLoading: loadingInsumos } = useInsumos();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: categoriasPlantas = [] } = useCategoriasPlantas();

  const isLoading = loadingPlantas || loadingInsumos;

  const adicionarItem = () => {
    if (!itemSelecionadoId || !quantidade || !unidade) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    let nome = "";
    if (tipoItemNovo === "planta") {
      const planta = plantas.find((p) => p.id === itemSelecionadoId);
      nome = planta?.nome_popular || "";
    } else {
      const insumo = insumos.find((i) => i.id === itemSelecionadoId);
      nome = insumo?.nome || "";
    }

    const novoItem: ItemRecebido = {
      id: crypto.randomUUID(),
      tipoItem: tipoItemNovo,
      plantaId: tipoItemNovo === "planta" ? itemSelecionadoId : undefined,
      insumoId: tipoItemNovo === "insumo" ? itemSelecionadoId : undefined,
      nome,
      quantidade: parseFloat(quantidade),
      unidade,
      porte: porte || undefined,
      alturaCm: alturaCm ? parseFloat(alturaCm) : undefined,
      dapCm: dapCm ? parseFloat(dapCm) : undefined,
      observacao: observacaoItem || undefined,
    };

    setItens([...itens, novoItem]);
    limparCamposItem();
  };

  const limparCamposItem = () => {
    setItemSelecionadoId("");
    setQuantidade("");
    setUnidade("");
    setPorte("");
    setAlturaCm("");
    setDapCm("");
    setObservacaoItem("");
  };

  const removerItem = (id: string) => {
    setItens(itens.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!dataRecebimento) {
      toast.error("Selecione a data do recebimento");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setIsSubmitting(true);

    try {
      // Criar o registro de recebimento
      const { data: registro, error: registroError } = await supabase
        .from("registros")
        .insert({
          cliente_id: clienteId,
          data_servico: format(dataRecebimento, "yyyy-MM-dd"),
          tipo: "recebimento_materiais",
          status: "realizado",
          descricao: `Recebimento de ${itens.length} item(s)`,
          observacoes_internas: observacoes || null,
        })
        .select()
        .single();

      if (registroError) throw registroError;

      // Inserir os itens recebidos
      const itensParaInserir = itens.map((item) => ({
        registro_id: registro.id,
        tipo_item: item.tipoItem,
        planta_id: item.plantaId || null,
        insumo_id: item.insumoId || null,
        quantidade: item.quantidade,
        unidade: item.unidade,
        porte: item.porte || null,
        altura_cm: item.alturaCm || null,
        dap_cm: item.dapCm || null,
        observacao: item.observacao || null,
      }));

      const { error: itensError } = await supabase
        .from("recebimento_itens")
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      toast.success("Recebimento registrado com sucesso!");
      navigate(`/clientes/${clienteId}`);
    } catch (error) {
      console.error("Erro ao salvar recebimento:", error);
      toast.error("Erro ao salvar recebimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verificar se a categoria da planta precisa de altura/DAP
  const plantaSelecionada = plantas.find((p) => p.id === itemSelecionadoId);
  const categoriaSelecionada = plantaSelecionada
    ? categoriasPlantas.find((c) => c.id === plantaSelecionada.categoria_id)
    : null;
  const precisaAlturaDap =
    categoriaSelecionada?.campos_obrigatorios?.includes("altura") ||
    categoriaSelecionada?.campos_obrigatorios?.includes("dap");

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Recebimento de Materiais
            </h1>
            <p className="text-sm text-muted-foreground">
              Registrar entrada de plantas e insumos
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Dados do Recebimento */}
          <section className="card-botanical p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Dados do Recebimento
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label>Data do Recebimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataRecebimento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataRecebimento
                        ? format(dataRecebimento, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataRecebimento}
                      onSelect={setDataRecebimento}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações gerais</Label>
              <Textarea
                placeholder="Observações sobre o recebimento..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </div>
          </section>

          {/* Adicionar Itens */}
          <section className="card-botanical p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              Adicionar Itens
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Carregando...</span>
              </div>
            ) : (
              <>
                <Tabs
                  value={tipoItemNovo}
                  onValueChange={(v) => {
                    setTipoItemNovo(v as "planta" | "insumo");
                    setItemSelecionadoId("");
                    setUnidade("");
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="planta" className="gap-2">
                      <Leaf className="w-4 h-4" />
                      Planta
                    </TabsTrigger>
                    <TabsTrigger value="insumo" className="gap-2">
                      <Package className="w-4 h-4" />
                      Insumo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="planta" className="space-y-4 mt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Planta *</Label>
                        <Select
                          value={itemSelecionadoId}
                          onValueChange={setItemSelecionadoId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar planta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {plantas.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome_popular}
                                {p.nome_cientifico && (
                                  <span className="text-muted-foreground ml-1">
                                    ({p.nome_cientifico})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Porte</Label>
                        <Select value={porte} onValueChange={setPorte}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar porte..." />
                          </SelectTrigger>
                          <SelectContent>
                            {porteOptions.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Altura e DAP para árvores/palmeiras */}
                    {precisaAlturaDap && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Altura (cm)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 150"
                            value={alturaCm}
                            onChange={(e) => setAlturaCm(e.target.value)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>DAP (cm)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 10"
                            value={dapCm}
                            onChange={(e) => setDapCm(e.target.value)}
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="insumo" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Insumo *</Label>
                      <Select
                        value={itemSelecionadoId}
                        onValueChange={(id) => {
                          setItemSelecionadoId(id);
                          const insumo = insumos.find((i) => i.id === id);
                          if (insumo?.unidade) {
                            setUnidade(insumo.unidade);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar insumo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {insumos.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Quantidade e Unidade */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Quantidade *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade *</Label>
                    <Select value={unidade} onValueChange={setUnidade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadeOptions.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input
                      placeholder="Opcional..."
                      value={observacaoItem}
                      onChange={(e) => setObservacaoItem(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarItem}
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </>
            )}
          </section>

          {/* Lista de Itens */}
          {itens.length > 0 && (
            <section className="card-botanical p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Itens Adicionados ({itens.length})
              </h2>

              <div className="space-y-2">
                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {item.tipoItem === "planta" ? (
                        <Leaf className="w-4 h-4 text-primary" />
                      ) : (
                        <Package className="w-4 h-4 text-secondary" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantidade} {item.unidade}
                          {item.porte && ` • Porte ${item.porte}`}
                          {item.alturaCm && ` • ${item.alturaCm}cm`}
                          {item.dapCm && ` • DAP ${item.dapCm}cm`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removerItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button
              variant="terracota"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Registrar Recebimento"
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
