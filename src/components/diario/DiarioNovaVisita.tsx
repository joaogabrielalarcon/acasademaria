import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Lock, Mic, MicOff, Plus, Save, Send, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useHighestRole } from "@/hooks/useAuth";
import { useTrechosCliente } from "@/hooks/useCliente";
import { useColaboradoresAtivosBasico } from "@/hooks/useColaboradores";
import { useInsumos } from "@/hooks/useInsumos";
import { useMaquinas } from "@/hooks/useMaquinas";
import {
  MaintenanceCategory,
  MaintenanceMachineEntry,
  MaintenanceMedia,
  MaintenanceMood,
  MaintenanceRecord,
  MaintenanceSupplyEntry,
  normalizeMaintenanceText,
  slugifyMaintenanceLabel,
  useMaintenanceCategories,
  useMaintenanceProjects,
  useSaveMaintenanceRecord,
} from "@/hooks/useDiarioManutencao";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DiarioNovaVisitaProps {
  scopeProjectId?: string;
  scopedClienteId?: string;
  editingRecord?: MaintenanceRecord | null;
  onSaved?: () => void;
  onCancelEdit?: () => void;
}

const moodOptions: { value: MaintenanceMood; emoji: string; label: string }[] = [
  { value: "otimo", emoji: "😊", label: "Ótimo" },
  { value: "bom", emoji: "🙂", label: "Bom" },
  { value: "atencao", emoji: "😐", label: "Requer atenção" },
  { value: "critico", emoji: "😟", label: "Crítico" },
];

const aiAliases: Record<string, string[]> = {
  poda_geral: ["poda", "poda geral", "podas"],
  poda_finos: ["poda finos", "poda de finos"],
  poda_palmeiras: ["palmeira", "palmeiras"],
  adubacao: ["adubacao", "adubação", "adubo", "fertilizacao", "fertilização"],
  irrigacao_verificacao: ["irrigacao", "irrigação", "verificacao irrigacao", "verificação irrigação"],
  irrigacao_regulagem: ["regulagem irrigacao", "regulagem da irrigação"],
  irrigacao_reparo: ["reparo irrigacao", "conserto irrigação"],
  limpeza: ["limpeza", "limpar"],
  replantio: ["replantio", "replante", "plantio"],
  controle_fitossanitario: ["controle fitossanitario", "controle fitossanitário", "pragas", "fungos"],
  outro: ["outro", "outros"],
};

const createEmptyForm = (projectId?: string) => ({
  projeto_id: projectId || "",
  trecho_id: "geral",
  data_servico: new Date().toISOString().slice(0, 10),
  hora_servico: "",
  equipe_presente_ids: [] as string[],
  categorias_ids: [] as string[],
  humor_do_jardim: "bom" as MaintenanceMood,
  descricao: "",
  observacoes_internas: "",
  outros_servicos: "",
  midia: [] as MaintenanceMedia[],
  insumos: [] as MaintenanceSupplyEntry[],
  maquinas: [] as MaintenanceMachineEntry[],
});

const formatTimer = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function DiarioNovaVisita({ scopeProjectId, scopedClienteId, editingRecord, onSaved, onCancelEdit }: DiarioNovaVisitaProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const highestRole = useHighestRole(user?.id);
  const canViewInternalNotes = highestRole !== "operador_campo" && highestRole !== "arquitetura";

  const { data: projects = [] } = useMaintenanceProjects(scopeProjectId);
  const { data: categories = [] } = useMaintenanceCategories();
  const { data: colaboradores = [] } = useColaboradoresAtivosBasico();
  const { data: insumos = [] } = useInsumos();
  const { data: maquinas = [] } = useMaquinas();
  const saveMutation = useSaveMaintenanceRecord();

  const [form, setForm] = useState(() => createEmptyForm(scopeProjectId));
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef("");

  const selectedProject = useMemo(() => projects.find((project) => project.id === form.projeto_id), [projects, form.projeto_id]);
  const selectedClienteId = selectedProject?.cliente_id || scopedClienteId;
  const { data: trechos = [] } = useTrechosCliente(selectedClienteId);

  const otherCategory = useMemo(
    () => categories.find((category) => normalizeMaintenanceText(category.nome).includes("outro")),
    [categories]
  );

  useEffect(() => {
    if (!editingRecord) {
      setForm(createEmptyForm(scopeProjectId));
      setAiInput("");
      setAiFilled(false);
      return;
    }

    setForm({
      projeto_id: editingRecord.projeto_id,
      trecho_id: editingRecord.trecho_id || "geral",
      data_servico: editingRecord.data_servico,
      hora_servico: editingRecord.hora_servico || "",
      equipe_presente_ids: editingRecord.equipe_presente_ids || [],
      categorias_ids: editingRecord.categorias_ids || [],
      humor_do_jardim: (editingRecord.humor_do_jardim as MaintenanceMood) || "bom",
      descricao: editingRecord.descricao || "",
      observacoes_internas: editingRecord.observacoes_internas || "",
      outros_servicos: "",
      midia: editingRecord.midia || [],
      insumos: editingRecord.insumos || [],
      maquinas: editingRecord.maquinas || [],
    });
    setAiInput(editingRecord.descricao || "");
    setAiFilled(false);
  }, [editingRecord, scopeProjectId]);

  useEffect(() => {
    if (!scopeProjectId && !editingRecord) return;
    if (scopeProjectId) {
      setForm((current) => ({ ...current, projeto_id: scopeProjectId }));
    }
  }, [scopeProjectId, editingRecord]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleEquipe = (id: string) => {
    updateForm(
      "equipe_presente_ids",
      form.equipe_presente_ids.includes(id)
        ? form.equipe_presente_ids.filter((item) => item !== id)
        : [...form.equipe_presente_ids, id]
    );
  };

  const toggleCategory = (id: string) => {
    updateForm(
      "categorias_ids",
      form.categorias_ids.includes(id)
        ? form.categorias_ids.filter((item) => item !== id)
        : [...form.categorias_ids, id]
    );
  };

  const validateBeforeSave = (status: "rascunho" | "finalizado") => {
    if (!form.projeto_id) {
      toast({ title: "Selecione um projeto", variant: "destructive" });
      return false;
    }

    if (status === "rascunho") return true;

    if (!form.data_servico) {
      toast({ title: "Informe a data da visita", variant: "destructive" });
      return false;
    }
    if (form.equipe_presente_ids.length === 0) {
      toast({ title: "Selecione pelo menos 1 colaborador", variant: "destructive" });
      return false;
    }
    if (form.midia.length === 0) {
      toast({ title: "Adicione pelo menos 1 foto", variant: "destructive" });
      return false;
    }
    if (form.descricao.trim().length < 20) {
      toast({ title: "A descrição precisa ter no mínimo 20 caracteres", variant: "destructive" });
      return false;
    }

    return true;
  };

  const resolveCategoryIdsFromAi = (types: string[]) => {
    const resolved = new Set<string>();

    types.forEach((type) => {
      const normalizedType = normalizeMaintenanceText(type).replace(/\s+/g, "_");
      const aliases = aiAliases[normalizedType] || [normalizedType];

      const matched = categories.find((category) => {
        const normalizedCategory = normalizeMaintenanceText(category.nome);
        const slugCategory = slugifyMaintenanceLabel(category.nome);
        return aliases.some((alias) => normalizedCategory.includes(alias.replace(/_/g, " ")) || slugCategory === alias);
      });

      if (matched) resolved.add(matched.id);
    });

    return Array.from(resolved);
  };

  const handleAiProcess = async (inputText: string) => {
    if (!inputText.trim()) return;

    setAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("diario-manutencao-ai", {
        body: {
          message: inputText,
          colaboradores: colaboradores.map((item) => ({ id: item.id, nome: item.nome })),
          maquinas: maquinas.map((item) => ({ id: item.id, nome: item.nome })),
          insumos: insumos.map((item) => ({ id: item.id, nome: item.nome, unidade: item.unidade })),
          servicoTipos: categories.map((item) => ({ value: item.slug, label: item.nome })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data?.data;
      const aiCategoryIds = resolveCategoryIdsFromAi((result?.servicos || []).map((item: any) => item.tipo));
      const outroDescricao = (result?.servicos || [])
        .filter((item: any) => normalizeMaintenanceText(item.tipo).includes("outro"))
        .map((item: any) => item.descricao)
        .filter(Boolean)
        .join("; ");

      setForm((current) => ({
        ...current,
        descricao: result?.descricao || current.descricao || inputText,
        observacoes_internas: canViewInternalNotes
          ? result?.observacoes_internas || current.observacoes_internas
          : "",
        humor_do_jardim: result?.humor_do_jardim || current.humor_do_jardim,
        categorias_ids: Array.from(new Set([...current.categorias_ids, ...aiCategoryIds])),
        outros_servicos: outroDescricao || current.outros_servicos,
        insumos:
          result?.recursos_insumos?.filter((item: any) => item.insumo_id).map((item: any) => ({
            insumo_id: item.insumo_id,
            quantidade: Number(item.quantidade || 1),
            observacao: item.unidade || null,
          })) || current.insumos,
        maquinas:
          result?.recursos_maquinas?.filter((item: any) => item.maquina_id).map((item: any) => ({
            maquina_id: item.maquina_id,
            horas_utilizadas: Number(item.horas_uso || 1),
            observacao: null,
          })) || current.maquinas,
      }));

      setAiInput("");
      setAiFilled(true);
      toast({ title: "IA preencheu o formulário", description: "Revise os campos antes de salvar." });
    } catch (aiError: any) {
      toast({ title: "Erro ao processar com IA", description: aiError.message || "Tente novamente", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const stopRecognition = () => {
    try {
      speechRecognitionRef.current?.stop?.();
    } catch (error) {
      console.error(error);
    }
    speechRecognitionRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      liveTranscriptRef.current = "";
      setRecordingSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0]?.transcript || "")
            .join(" ")
            .trim();

          liveTranscriptRef.current = transcript;
          setAiInput(transcript);
        };
        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        stopRecognition();
        stopTimer();
        setIsRecording(false);

        const transcript = liveTranscriptRef.current.trim() || aiInput.trim();
        if (transcript) {
          void handleAiProcess(transcript);
        } else {
          toast({ title: "Não consegui transcrever o áudio", description: "Digite o relato para a IA processar.", variant: "destructive" });
        }
      };

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      setIsRecording(true);
    } catch (error) {
      toast({ title: "Microfone indisponível", description: "Verifique a permissão do navegador.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    if (form.midia.length + files.length > 10) {
      toast({ title: "Máximo de 10 fotos", variant: "destructive" });
      return;
    }

    for (const file of Array.from(files)) {
      if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
        toast({ title: `${file.name} não é uma imagem suportada`, variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `manutencao/${form.projeto_id || "sem-projeto"}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("registros-midia").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        toast({ title: `Erro ao enviar ${file.name}`, description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: signedData } = await supabase.storage.from("registros-midia").createSignedUrl(path, 60 * 60);

      setForm((current) => ({
        ...current,
        midia: [
          ...current.midia,
          {
            url: path,
            tipo: "foto",
            nome: file.name,
            legenda: "",
            previewUrl: signedData?.signedUrl || "",
          },
        ],
      }));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (captureInputRef.current) captureInputRef.current.value = "";
  };

  const removeMedia = async (media: MaintenanceMedia) => {
    if (media.url && !media.url.startsWith("http")) {
      await supabase.storage.from("registros-midia").remove([media.url]);
    }

    setForm((current) => ({
      ...current,
      midia: current.midia.filter((item) => item.url !== media.url),
    }));
  };

  const handleSave = async (status: "rascunho" | "finalizado") => {
    if (!validateBeforeSave(status)) return;
    if (!selectedClienteId) {
      toast({ title: "Projeto inválido", description: "Não encontrei o cliente do projeto selecionado.", variant: "destructive" });
      return;
    }

    const finalDescription = [form.descricao.trim(), form.outros_servicos.trim() ? `Outros serviços: ${form.outros_servicos.trim()}` : ""]
      .filter(Boolean)
      .join("\n\n");

    saveMutation.mutate(
      {
        id: editingRecord?.id,
        projeto_id: form.projeto_id,
        cliente_id: selectedClienteId,
        trecho_id: form.trecho_id === "geral" ? null : form.trecho_id,
        data_servico: form.data_servico,
        hora_servico: form.hora_servico || null,
        equipe_presente_ids: form.equipe_presente_ids,
        descricao: finalDescription,
        observacoes_internas: canViewInternalNotes ? form.observacoes_internas : null,
        humor_do_jardim: form.humor_do_jardim,
        midia: form.midia,
        categorias_ids: form.categorias_ids,
        status,
        insumos: form.insumos.filter((item) => item.insumo_id),
        maquinas: form.maquinas.filter((item) => item.maquina_id),
      },
      {
        onSuccess: () => {
          toast({ title: status === "finalizado" ? "Visita registrada com sucesso!" : "Rascunho salvo com sucesso!" });
          setForm(createEmptyForm(scopeProjectId));
          setAiFilled(false);
          setAiInput("");
          onSaved?.();
        },
        onError: (error: any) => {
          toast({ title: "Erro ao salvar registro", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  const selectedCategoryNames = categories.filter((item) => form.categorias_ids.includes(item.id));

  return (
    <div className="space-y-6">
      <div className="card-botanical p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Registrar por voz ou texto
            </p>
            <p className="text-sm text-muted-foreground mt-1">A IA preenche o formulário automaticamente e você revisa antes de salvar.</p>
          </div>
          {isRecording && <Badge variant="outline">{formatTimer(recordingSeconds)}</Badge>}
        </div>

        {aiFilled && <div className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium">✅ IA preencheu o formulário. Revise os campos abaixo.</div>}

        <div className="space-y-3">
          <Textarea
            rows={4}
            value={aiInput}
            onChange={(event) => setAiInput(event.target.value)}
            placeholder="Descreva o que foi feito na visita ou grave um áudio acima."
            className="min-h-[120px]"
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={isRecording ? "destructive" : "outline"} onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? "Parar gravação" : "Gravar áudio"}
            </Button>
            <Button type="button" variant="terracota" onClick={() => handleAiProcess(aiInput)} disabled={aiLoading || !aiInput.trim()}>
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Processar com IA
            </Button>
          </div>
        </div>
      </div>

      <div className="card-botanical p-4 sm:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Projeto *</Label>
            <Select value={form.projeto_id} onValueChange={(value) => updateForm("projeto_id", value)} disabled={!!scopeProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto de manutenção" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trecho / Área</Label>
            <Select value={form.trecho_id} onValueChange={(value) => updateForm("trecho_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Área geral / todo o jardim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Área geral / Todo o jardim</SelectItem>
                {trechos.map((trecho) => (
                  <SelectItem key={trecho.id} value={trecho.id}>
                    {trecho.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data da visita *</Label>
            <Input type="date" value={form.data_servico} onChange={(event) => updateForm("data_servico", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Hora</Label>
            <Input type="time" value={form.hora_servico} onChange={(event) => updateForm("hora_servico", event.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Colaboradores presentes *</Label>
          <div className="flex flex-wrap gap-2">
            {colaboradores.map((colaborador) => {
              const active = form.equipe_presente_ids.includes(colaborador.id);
              return (
                <button
                  key={colaborador.id}
                  type="button"
                  onClick={() => toggleEquipe(colaborador.id)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  )}
                >
                  {colaborador.nome}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Serviços realizados</Label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const active = form.categorias_ids.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    active ? "border-primary bg-secondary shadow-sm" : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span className="block font-medium">{category.nome}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Toque para {active ? "remover" : "selecionar"}</span>
                </button>
              );
            })}
          </div>
          {selectedCategoryNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategoryNames.map((category) => (
                <Badge key={category.id} variant="secondary">{category.nome}</Badge>
              ))}
            </div>
          )}
          {otherCategory && form.categorias_ids.includes(otherCategory.id) && (
            <Textarea
              rows={3}
              placeholder="Descreva o serviço extra"
              value={form.outros_servicos}
              onChange={(event) => updateForm("outros_servicos", event.target.value)}
            />
          )}
        </div>

        <div className="space-y-3">
          <Label>Como está o jardim hoje?</Label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {moodOptions.map((option) => {
              const active = form.humor_do_jardim === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm("humor_do_jardim", option.value)}
                  className={cn(
                    "rounded-xl border px-4 py-4 text-left transition-all",
                    active ? "border-primary bg-secondary shadow-sm" : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span className="mt-2 block font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição do serviço *</Label>
          <Textarea
            rows={6}
            value={form.descricao}
            onChange={(event) => updateForm("descricao", event.target.value)}
            placeholder="Relato completo da visita."
          />
        </div>

        {canViewInternalNotes && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Observações internas (não vão para o cliente)
            </Label>
            <Textarea
              rows={4}
              value={form.observacoes_internas}
              onChange={(event) => updateForm("observacoes_internas", event.target.value)}
              placeholder="Anotações internas da equipe."
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Fotos da visita *</Label>
            <Badge variant="outline">{form.midia.length}/10</Badge>
          </div>
          <div
            className="rounded-xl border border-dashed border-primary/30 bg-muted/30 p-5 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleUploadFiles(event.dataTransfer.files);
            }}
          >
            <Upload className="mx-auto mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Arraste as fotos aqui</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, JPEG, PNG ou WEBP · máximo de 10 fotos</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={(event) => void handleUploadFiles(event.target.files)} />
              <input ref={captureInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void handleUploadFiles(event.target.files)} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-4 h-4" />
                Adicionar fotos
              </Button>
              <Button type="button" variant="ghost" onClick={() => captureInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                Usar câmera
              </Button>
            </div>
          </div>

          {form.midia.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {form.midia.map((media) => (
                <div key={media.url} className="relative overflow-hidden rounded-xl border bg-muted aspect-square">
                  <img src={media.previewUrl || media.url} alt={media.nome || "Foto da visita"} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => void removeMedia(media)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-foreground shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Insumos usados</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => updateForm("insumos", [...form.insumos, { insumo_id: "", quantidade: 1 }])}>
              <Plus className="w-4 h-4" />
              Insumo
            </Button>
          </div>
          <div className="space-y-2">
            {form.insumos.map((entry, index) => (
              <div key={`${entry.insumo_id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_120px_48px]">
                <Select
                  value={entry.insumo_id}
                  onValueChange={(value) =>
                    updateForm(
                      "insumos",
                      form.insumos.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, insumo_id: value } : item
                      )
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {insumos.map((insumo) => (
                      <SelectItem key={insumo.id} value={insumo.id}>
                        {insumo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={entry.quantidade}
                  onChange={(event) =>
                    updateForm(
                      "insumos",
                      form.insumos.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, quantidade: Number(event.target.value || 0) } : item
                      )
                    )
                  }
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => updateForm("insumos", form.insumos.filter((_, itemIndex) => itemIndex !== index))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Máquinas usadas</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => updateForm("maquinas", [...form.maquinas, { maquina_id: "", horas_utilizadas: 1 }])}>
              <Plus className="w-4 h-4" />
              Máquina
            </Button>
          </div>
          <div className="space-y-2">
            {form.maquinas.map((entry, index) => (
              <div key={`${entry.maquina_id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_120px_48px]">
                <Select
                  value={entry.maquina_id}
                  onValueChange={(value) =>
                    updateForm(
                      "maquinas",
                      form.maquinas.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, maquina_id: value } : item
                      )
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinas.map((maquina) => (
                      <SelectItem key={maquina.id} value={maquina.id}>
                        {maquina.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={entry.horas_utilizadas}
                  onChange={(event) =>
                    updateForm(
                      "maquinas",
                      form.maquinas.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, horas_utilizadas: Number(event.target.value || 0) } : item
                      )
                    )
                  }
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => updateForm("maquinas", form.maquinas.filter((_, itemIndex) => itemIndex !== index))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {editingRecord && (
              <Button type="button" variant="ghost" onClick={onCancelEdit}>
                Cancelar edição
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleSave("rascunho")} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar como rascunho
            </Button>
            <Button type="button" variant="terracota" onClick={() => handleSave("finalizado")} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingRecord ? "Atualizar registro" : "Finalizar registro"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
