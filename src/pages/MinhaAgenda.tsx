import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useAgendaTarefas, useSalvarTarefas, useAtualizarStatusTarefa, useExcluirTarefa, type AgendaTarefa } from "@/hooks/useAgenda";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, Plus, Mic, Square, Sparkles, Trash2, CheckCircle, Clock, AlertTriangle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TarefaPreview {
  titulo: string;
  prioridade: string;
  prazo: string | null;
  descricao?: string;
  dependencias?: Array<{
    nome_colaborador: string;
    descricao_entrega: string;
    tempo_estimado_dias: number;
  }>;
}

export default function MinhaAgenda() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { toast } = useToast();

  // Get colaborador ID from profile
  const [colaboradorId, setColaboradorId] = useState<string | undefined>();

  // Fetch colaborador ID on mount
  useState(() => {
    if (user?.id) {
      supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .single()
        .then(({ data }) => {
          if (data) setColaboradorId(data.id);
        });
    }
  });

  const { data: tarefas = [], isLoading } = useAgendaTarefas(colaboradorId);
  const salvarTarefas = useSalvarTarefas();
  const atualizarStatus = useAtualizarStatusTarefa();
  const excluirTarefa = useExcluirTarefa();

  const [captureOpen, setCaptureOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<TarefaPreview[] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const today = new Date();

  const filterTarefas = (tab: string) => {
    const pending = tarefas.filter((t) => t.status !== "concluida");
    if (tab === "semana") {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      return pending.filter(
        (t) =>
          t.prioridade === "urgente" ||
          t.prioridade === "semana" ||
          (t.prazo && isWithinInterval(parseISO(t.prazo), { start, end }))
      );
    }
    if (tab === "mes") {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return pending.filter(
        (t) =>
          t.prioridade !== "concluida" &&
          (!t.prazo || isWithinInterval(parseISO(t.prazo), { start, end }) || parseISO(t.prazo) <= end)
      );
    }
    return tarefas; // "todas" includes completed
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = texto;
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interim = transcript;
      }
      setTexto(finalTranscript + interim);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleOrganizar = async () => {
    if (!texto.trim()) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("assessor-agenda", {
        body: { texto: texto.trim() },
      });
      if (error) throw error;
      if (data?.tarefas) {
        setPreview(data.tarefas);
      } else {
        toast({ title: "Nenhuma tarefa identificada", duration: 3000 });
      }
    } catch (e: any) {
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmarPreview = async () => {
    if (!preview || !colaboradorId) return;
    await salvarTarefas.mutateAsync({ tarefas: preview, colaboradorId });
    setPreview(null);
    setTexto("");
    setCaptureOpen(false);
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case "urgente":
        return <Badge className="bg-primary text-primary-foreground">Urgente</Badge>;
      case "semana":
        return <Badge variant="secondary">Esta semana</Badge>;
      case "mes":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Este mês</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluida":
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case "em_andamento":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-border" />;
    }
  };

  const isNearDeadline = (prazo: string | null) => {
    if (!prazo) return false;
    return differenceInDays(parseISO(prazo), today) <= 2;
  };

  const renderTarefaCard = (tarefa: AgendaTarefa) => (
    <div
      key={tarefa.id}
      className={`bg-card border border-border rounded-xl p-4 space-y-3 ${
        isNearDeadline(tarefa.prazo) && tarefa.status !== "concluida"
          ? "bg-primary/5 border-primary/20"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() =>
              atualizarStatus.mutate({
                id: tarefa.id,
                status: tarefa.status === "concluida" ? "pendente" : tarefa.status === "pendente" ? "em_andamento" : "concluida",
              })
            }
            className="mt-0.5 shrink-0"
          >
            {getStatusIcon(tarefa.status)}
          </button>
          <div className="min-w-0">
            <p className={`font-semibold text-foreground ${tarefa.status === "concluida" ? "line-through opacity-50" : ""}`}>
              {tarefa.titulo}
            </p>
            {tarefa.descricao && (
              <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getPrioridadeBadge(tarefa.prioridade)}
          <button onClick={() => excluirTarefa.mutate(tarefa.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tarefa.prazo && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground ml-7">
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>
            Prazo: {format(parseISO(tarefa.prazo), "dd/MM/yyyy")}
            {isNearDeadline(tarefa.prazo) && tarefa.status !== "concluida" && (
              <span className="text-primary font-medium ml-1">
                <AlertTriangle className="w-3 h-3 inline" /> Próximo do prazo
              </span>
            )}
          </span>
        </div>
      )}

      {tarefa.dependencias && tarefa.dependencias.length > 0 && (
        <div className="ml-7 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> Dependências
          </p>
          {tarefa.dependencias.map((dep) => (
            <div key={dep.id} className="text-sm bg-secondary/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span>
                <span className="font-medium text-foreground">{dep.descricao_entrega}</span>
                {dep.colaborador_id && (
                  <span className="text-muted-foreground ml-1">• {dep.tempo_estimado_dias}d</span>
                )}
              </span>
              <Badge variant="outline" className="text-xs">
                {dep.status_entrega === "entregue" ? "✓ Entregue" : dep.status_entrega === "atrasado" ? "Atrasado" : "Pendente"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <div className="ml-7">
        <Select
          value={tarefa.status}
          onValueChange={(v) => atualizarStatus.mutate({ id: tarefa.id, status: v })}
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
          </div>
          <Dialog open={captureOpen} onOpenChange={(o) => { setCaptureOpen(o); if (!o) { setPreview(null); setTexto(""); } }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> Capturar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">Capturar Tarefas</DialogTitle>
              </DialogHeader>

              {!preview ? (
                <div className="space-y-4">
                  <Textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="O que você tem na cabeça? Fale tudo... Ex: 'Preciso cobrar o orçamento da Dona Maria, pedir pro João levar adubo na obra do Parque, e agendar visita técnica para semana que vem'"
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={toggleRecording}
                    >
                      {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={handleOrganizar}
                      disabled={!texto.trim() || isProcessing}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isProcessing ? "Organizando..." : "Organizar com Mafe"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Mafe identificou as seguintes tarefas. Confirme para salvar:</p>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {preview.map((t, i) => (
                      <div key={i} className="bg-secondary/30 border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground text-sm">{t.titulo}</p>
                          {getPrioridadeBadge(t.prioridade)}
                        </div>
                        {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                        {t.prazo && <p className="text-xs text-muted-foreground">Prazo: {t.prazo}</p>}
                        {t.dependencias && t.dependencias.length > 0 && (
                          <div className="text-xs space-y-1">
                            <p className="font-medium text-muted-foreground">Dependências:</p>
                            {t.dependencias.map((d, j) => (
                              <p key={j} className="text-muted-foreground">• {d.nome_colaborador}: {d.descricao_entrega} ({d.tempo_estimado_dias}d)</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPreview(null)} className="flex-1">
                      Voltar
                    </Button>
                    <Button
                      onClick={handleConfirmarPreview}
                      disabled={salvarTarefas.isPending}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {salvarTarefas.isPending ? "Salvando..." : "Confirmar e Salvar"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="semana" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="semana">Esta Semana</TabsTrigger>
            <TabsTrigger value="mes">Este Mês</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
          </TabsList>

          {["semana", "mes", "todas"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filterTarefas(tab).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma tarefa</p>
                  <p className="text-sm">Use o botão "+ Capturar" para adicionar</p>
                </div>
              ) : (
                filterTarefas(tab).map(renderTarefaCard)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
