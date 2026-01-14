import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Users, Calendar, Bell, Leaf } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ServicoBlock, ServicoData, createEmptyServico } from "@/components/ServicoBlock";
import { parseISO, isAfter, startOfDay } from "date-fns";

// Mock data
const mockClientes = [
  { id: "1", nome: "Família Silveira" },
  { id: "2", nome: "Residência Campos" },
  { id: "3", nome: "Edifício Aurora" },
];

const mockTrechos = [
  { id: "1", nome: "Jardim Frontal", clienteId: "1" },
  { id: "2", nome: "Piscina", clienteId: "1" },
  { id: "3", nome: "Horta", clienteId: "2" },
];

const mockColaboradores = [
  { id: "1", nome: "João Silva" },
  { id: "2", nome: "Maria Santos" },
  { id: "3", nome: "Pedro Oliveira" },
  { id: "4", nome: "Maria Fernanda" },
];

const periodoOptions = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "dia_inteiro", label: "Dia inteiro" },
];

const alertaOptions = [
  { value: "nenhum", label: "Sem lembrete" },
  { value: "no_dia", label: "No dia" },
  { value: "1_dia", label: "1 dia antes" },
  { value: "3_dias", label: "3 dias antes" },
  { value: "1_semana", label: "1 semana antes" },
];

export default function NovoRegistro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const clienteIdFromUrl = searchParams.get("cliente") || "";
  const dataFromUrl = searchParams.get("data") || new Date().toISOString().split("T")[0];

  // === SEÇÃO 1: Dados da Diária ===
  const [selectedCliente, setSelectedCliente] = useState(clienteIdFromUrl);
  const [selectedTrecho, setSelectedTrecho] = useState("");
  const [dataVisita, setDataVisita] = useState(dataFromUrl);
  const [periodo, setPeriodo] = useState("dia_inteiro");
  const [equipePresente, setEquipePresente] = useState<string[]>([]);
  const [comentariosJardim, setComentariosJardim] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [statusDiaria, setStatusDiaria] = useState("realizado");
  const [alertaOpcao, setAlertaOpcao] = useState("nenhum");

  // === SEÇÃO 2: Serviços ===
  const [servicos, setServicos] = useState<ServicoData[]>([createEmptyServico()]);

  // Atualizar status baseado na data selecionada
  useEffect(() => {
    const today = startOfDay(new Date());
    const selectedDate = parseISO(dataVisita);
    if (isAfter(selectedDate, today)) {
      setStatusDiaria("agendado");
    } else {
      setStatusDiaria("realizado");
    }
  }, [dataVisita]);

  const filteredTrechos = mockTrechos.filter((t) => t.clienteId === selectedCliente);

  const toggleEquipePresente = (id: string) => {
    setEquipePresente((prev) => {
      if (prev.includes(id)) {
        // Se remover da equipe, também remove como executor de todos os serviços
        setServicos((servicos) =>
          servicos.map((s) => ({
            ...s,
            executoresIds: s.executoresIds.filter((e) => e !== id),
          }))
        );
        return prev.filter((r) => r !== id);
      }
      return [...prev, id];
    });
  };

  const addServico = () => {
    setServicos([...servicos, createEmptyServico()]);
  };

  const updateServico = (id: string, data: Partial<ServicoData>) => {
    setServicos((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
  };

  const removeServico = (id: string) => {
    if (servicos.length <= 1) return;
    setServicos((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!selectedCliente) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (servicos.some((s) => !s.tipo || !s.descricao)) {
      toast({
        title: "Serviços incompletos",
        description: "Preencha o tipo e descrição de todos os serviços.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Diária registrada!",
      description: `${servicos.length} serviço(s) salvos com sucesso.`,
    });

    if (clienteIdFromUrl) {
      navigate(`/clientes/${clienteIdFromUrl}`);
    } else {
      navigate("/");
    }
  };

  const clienteNome = mockClientes.find((c) => c.id === selectedCliente)?.nome;

  return (
    <AppLayout>
      {/* Back Button */}
      <Link
        to={clienteIdFromUrl ? `/clientes/${clienteIdFromUrl}` : "/"}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>
          Voltar {clienteIdFromUrl && clienteNome ? `para ${clienteNome}` : "para Clientes"}
        </span>
      </Link>

      <div className="max-w-3xl">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Nova Diária
        </h1>
        <p className="text-muted-foreground mb-8">
          Registre a visita do dia e todos os serviços realizados
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ===================== */}
          {/* SEÇÃO 1: DADOS DA DIÁRIA */}
          {/* ===================== */}
          <section className="space-y-6 p-6 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-emerald-600" />
              <h2 className="font-display text-lg font-semibold text-foreground">
                Dados da Diária
              </h2>
            </div>

            {/* Cliente e Trecho */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
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
              <div className="space-y-2">
                <Label htmlFor="trecho">Trecho geral</Label>
                <Select
                  value={selectedTrecho}
                  onValueChange={setSelectedTrecho}
                  disabled={!selectedCliente}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedCliente
                          ? "Selecione o trecho"
                          : "Selecione um cliente primeiro"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Área geral / Todo o jardim</SelectItem>
                    {filteredTrechos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data e Período */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data da Visita *</Label>
                <Input
                  type="date"
                  id="data"
                  value={dataVisita}
                  onChange={(e) => setDataVisita(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período da visita</Label>
                <RadioGroup
                  value={periodo}
                  onValueChange={setPeriodo}
                  className="flex flex-wrap gap-3 pt-2"
                >
                  {periodoOptions.map((p) => (
                    <div key={p.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={p.value} id={`periodo-${p.value}`} />
                      <Label
                        htmlFor={`periodo-${p.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {p.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Equipe Presente */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipe presente na casa
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione todos que foram ao local no dia
              </p>
              <div className="flex flex-wrap gap-2">
                {mockColaboradores.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleEquipePresente(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      equipePresente.includes(c.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Comentários gerais do jardim */}
            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentários gerais do jardim</Label>
              <Textarea
                id="comentarios"
                placeholder="Ex: floração intensa, solo úmido, pragas observadas..."
                rows={2}
                value={comentariosJardim}
                onChange={(e) => setComentariosJardim(e.target.value)}
              />
            </div>

            {/* Observações internas */}
            <div className="space-y-2">
              <Label htmlFor="obs-gerais">Observações internas da visita</Label>
              <Textarea
                id="obs-gerais"
                placeholder="Notas internas, não visíveis ao cliente..."
                rows={2}
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
              />
            </div>

            {/* Status e Lembrete */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <RadioGroup
                  value={statusDiaria}
                  onValueChange={setStatusDiaria}
                  className="flex flex-wrap gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="realizado" id="status-realizado" />
                    <Label
                      htmlFor="status-realizado"
                      className="font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                      Realizado
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="agendado" id="status-agendado" />
                    <Label
                      htmlFor="status-agendado"
                      className="font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Agendado
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {statusDiaria === "agendado" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    Lembrete
                  </Label>
                  <Select value={alertaOpcao} onValueChange={setAlertaOpcao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quando lembrar?" />
                    </SelectTrigger>
                    <SelectContent>
                      {alertaOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* ===================== */}
          {/* SEÇÃO 2: SERVIÇOS */}
          {/* ===================== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Serviços Realizados
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addServico}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar serviço
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Adicione todos os serviços executados nesta visita. Cada serviço pode ter seus
              próprios responsáveis, insumos e fotos.
            </p>

            <div className="space-y-4">
              {servicos.map((servico, index) => (
                <ServicoBlock
                  key={servico.id}
                  servico={servico}
                  index={index}
                  equipePresenteIds={equipePresente}
                  onUpdate={updateServico}
                  onRemove={removeServico}
                  isOnly={servicos.length === 1}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full border-2 border-dashed border-primary/30 hover:border-primary/50 text-muted-foreground"
              onClick={addServico}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar outro serviço
            </Button>
          </section>

          {/* ===================== */}
          {/* AÇÕES */}
          {/* ===================== */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-primary/20">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" variant="terracota" className="flex-1 sm:flex-none">
              Salvar Diária
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
