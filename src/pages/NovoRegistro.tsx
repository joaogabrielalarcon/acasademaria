import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Users, Calendar, Bell, Leaf, Package, Loader2, MessageSquare } from "lucide-react";
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
import { parseISO, isAfter, startOfDay, format, subDays, addWeeks } from "date-fns";
import { useClientesSimples } from "@/hooks/useClientes";
import { useColaboradoresAtivosBasico } from "@/hooks/useColaboradores";
import { supabase } from "@/integrations/supabase/client";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { DraftResumeBanner } from "@/components/DraftResumeBanner";

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

  // Dados reais do banco - ordenados alfabeticamente
  const { data: clientesRaw = [], isLoading: loadingClientes } = useClientesSimples();
  const { data: colaboradoresRaw = [], isLoading: loadingColaboradores } = useColaboradoresAtivosBasico();

  // Ordenar clientes alfabeticamente
  const clientes = [...clientesRaw].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  
  // Ordenar colaboradores alfabeticamente e filtrar ativos
  const colaboradores = [...colaboradoresRaw]
    .filter(c => c.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // === SEÇÃO 1: Dados da Diária ===
  const [selectedCliente, setSelectedCliente] = useState(clienteIdFromUrl);
  
  const [dataVisita, setDataVisita] = useState(dataFromUrl);
  const [periodo, setPeriodo] = useState("dia_inteiro");
  const [equipePresente, setEquipePresente] = useState<string[]>([]);
  const [comentariosJardim, setComentariosJardim] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [statusDiaria, setStatusDiaria] = useState("realizado");
  const [alertaOpcao, setAlertaOpcao] = useState("nenhum");
  const [isSaving, setIsSaving] = useState(false);

  // === SEÇÃO 2: Serviços ===
  const [servicos, setServicos] = useState<ServicoData[]>([createEmptyServico()]);

  const draft = useAutosaveDraft({
    formKey: "novo-registro",
    scopeKey: clienteIdFromUrl || "novo",
    getSnapshot: () => ({
      selectedCliente, dataVisita, periodo, equipePresente,
      comentariosJardim, observacoesGerais, statusDiaria, alertaOpcao, servicos,
    }),
    applySnapshot: (s: any) => {
      if (!s) return;
      if (typeof s.selectedCliente === "string") setSelectedCliente(s.selectedCliente);
      if (typeof s.dataVisita === "string") setDataVisita(s.dataVisita);
      if (typeof s.periodo === "string") setPeriodo(s.periodo);
      if (Array.isArray(s.equipePresente)) setEquipePresente(s.equipePresente);
      if (typeof s.comentariosJardim === "string") setComentariosJardim(s.comentariosJardim);
      if (typeof s.observacoesGerais === "string") setObservacoesGerais(s.observacoesGerais);
      if (typeof s.statusDiaria === "string") setStatusDiaria(s.statusDiaria);
      if (typeof s.alertaOpcao === "string") setAlertaOpcao(s.alertaOpcao);
      if (Array.isArray(s.servicos)) setServicos(s.servicos);
    },
  });


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

  // Calcular data de alerta baseado na opção selecionada
  const calcularDataAlerta = (): string | null => {
    if (alertaOpcao === "nenhum") return null;
    const dataVisitaDate = parseISO(dataVisita);
    
    switch (alertaOpcao) {
      case "no_dia":
        return format(dataVisitaDate, "yyyy-MM-dd'T'08:00:00");
      case "1_dia":
        return format(subDays(dataVisitaDate, 1), "yyyy-MM-dd'T'08:00:00");
      case "3_dias":
        return format(subDays(dataVisitaDate, 3), "yyyy-MM-dd'T'08:00:00");
      case "1_semana":
        return format(subDays(dataVisitaDate, 7), "yyyy-MM-dd'T'08:00:00");
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (servicos.some((s) => s.categoriasIds.length === 0 || !s.descricao)) {
      toast({
        title: "Serviços incompletos",
        description: "Preencha as categorias e descrição de todos os serviços.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Criar a diária primeiro
      const dataAlerta = calcularDataAlerta();
      
      const { data: diaria, error: diariaError } = await supabase
        .from("diarias")
        .insert({
          cliente_id: selectedCliente,
          data_visita: dataVisita,
          periodo,
          status: statusDiaria,
          equipe_presente_ids: equipePresente,
          comentarios_jardim: comentariosJardim || null,
          observacoes_internas: observacoesGerais || null,
          data_alerta: dataAlerta,
        })
        .select()
        .single();

      if (diariaError) throw diariaError;

      // 2. Criar cada serviço (registro) vinculado à diária
      for (const servico of servicos) {
        const { data: registro, error: registroError } = await supabase
          .from("registros")
          .insert({
            cliente_id: selectedCliente,
            diaria_id: diaria.id,
            data_servico: dataVisita,
            tipo: "manutencao", // Valor válido da constraint
            status: statusDiaria,
            descricao: servico.descricao,
            observacoes_internas: servico.observacoesInternas || null,
            categorias_ids: servico.categoriasIds,
            trecho_id: servico.trechoId && servico.trechoId !== "geral" ? servico.trechoId : null,
            executores_ids: servico.executoresIds,
            equipe_presente_ids: equipePresente,
            solicitante: servico.solicitante === "outro" ? servico.solicitanteOutro : servico.solicitante || null,
            midia: servico.midiaUrls.length > 0 ? servico.midiaUrls : [],
          })
          .select()
          .single();

        if (registroError) throw registroError;

        // 3. Inserir insumos do serviço
        if (servico.insumos.length > 0) {
          const insumosToInsert = servico.insumos.map((i) => ({
            registro_id: registro.id,
            insumo_id: i.insumoId,
            quantidade: i.quantidade,
            observacao: null,
          }));

          const { error: insumosError } = await supabase
            .from("registro_insumos")
            .insert(insumosToInsert);

          if (insumosError) throw insumosError;
        }

        // 4. Inserir máquinas do serviço
        if (servico.maquinas.length > 0) {
          const maquinasToInsert = servico.maquinas.map((m) => ({
            registro_id: registro.id,
            maquina_id: m.maquinaId,
            horas_utilizadas: m.horasUtilizadas,
            observacao: m.observacao || null,
          }));

          const { error: maquinasError } = await supabase
            .from("registro_maquinas")
            .insert(maquinasToInsert);

          if (maquinasError) throw maquinasError;
        }
      }

      toast({
        title: statusDiaria === "agendado" ? "Diária agendada!" : "Diária registrada!",
        description: statusDiaria === "agendado" 
          ? `${servicos.length} serviço(s) agendado(s) para ${new Date(dataVisita).toLocaleDateString('pt-BR')}.`
          : `${servicos.length} serviço(s) salvos com sucesso.`,
      });

      if (clienteIdFromUrl) {
        navigate(`/clientes/${clienteIdFromUrl}`);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Erro ao salvar diária:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a diária. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clienteNome = clientes.find((c) => c.id === selectedCliente)?.nome;

  // Tipo de registro selecionado
  const [tipoRegistro, setTipoRegistro] = useState<"servico" | "recebimento" | "solicitacao" | null>(null);

  // Se selecionou recebimento ou solicitação, redirecionar
  const handleSelectTipoRegistro = (tipo: "servico" | "recebimento" | "solicitacao") => {
    const params = new URLSearchParams();
    if (clienteIdFromUrl) params.set("cliente", clienteIdFromUrl);
    params.set("data", dataVisita);
    
    if (tipo === "recebimento") {
      navigate(`/recebimentos/novo?${params.toString()}`);
    } else if (tipo === "solicitacao") {
      navigate(`/solicitacoes/nova?${params.toString()}`);
    } else {
      setTipoRegistro(tipo);
    }
  };

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
        {/* Seletor de tipo de registro */}
        {!tipoRegistro ? (
          <>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Novo Registro
            </h1>
            <p className="text-muted-foreground mb-8">
              Escolha o tipo de registro que deseja criar
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => handleSelectTipoRegistro("servico")}
                className="card-botanical p-6 text-left hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {statusDiaria === "agendado" ? "Agendar Diária" : "Registrar Diária"}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {statusDiaria === "agendado" 
                    ? "Agende uma visita futura com os serviços a serem realizados"
                    : "Registre a visita do dia e todos os serviços realizados"
                  }
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTipoRegistro("recebimento")}
                className="card-botanical p-6 text-left hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Recebimento de Materiais
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Registre a chegada de plantas, insumos e outros materiais
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTipoRegistro("solicitacao")}
                className="card-botanical p-6 text-left hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Solicitação / Observação
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Registre solicitações do cliente ou comentários importantes
                </p>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-2">
              <button
                type="button"
                onClick={() => setTipoRegistro(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                {statusDiaria === "agendado" ? "Agendar Diária" : "Nova Diária"}
              </h1>
            </div>
            <p className="text-muted-foreground mb-8">
              {statusDiaria === "agendado" 
                ? "Agende uma visita futura com os serviços a serem realizados"
                : "Registre a visita do dia e todos os serviços realizados"
              }
            </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ===================== */}
          {/* SEÇÃO 1: DADOS DA DIÁRIA */}
          {/* ===================== */}
          <section className="space-y-6 p-6 rounded-lg bg-card border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">
                Dados da Diária
              </h2>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
                {loadingColaboradores ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : colaboradores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum colaborador ativo cadastrado</p>
                ) : (
                  colaboradores.map((c) => (
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
                  ))
                )}
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
                {statusDiaria === "agendado" ? "Serviços a Realizar" : "Serviços Realizados"}
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addServico}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar serviço
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {statusDiaria === "agendado"
                ? "Liste os serviços previstos para esta visita. Você poderá registrar a execução depois."
                : "Adicione todos os serviços executados nesta visita. Cada serviço pode ter seus próprios responsáveis, insumos e fotos."
              }
            </p>

            <div className="space-y-4">
              {servicos.map((servico, index) => (
                <ServicoBlock
                  key={servico.id}
                  servico={servico}
                  index={index}
                  equipePresenteIds={equipePresente}
                  clienteId={selectedCliente}
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
              {statusDiaria === "agendado" ? "Agendar Diária" : "Salvar Diária"}
            </Button>
          </div>
        </form>
          </>
        )}
      </div>
    </AppLayout>
  );
}
