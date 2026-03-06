import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mic, Paperclip, Send, Square, Video, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useHighestRole, useProfile } from "@/hooks/useAuth";
import { useColaboradoresAtivosBasico } from "@/hooks/useColaboradores";
import { useInsumos } from "@/hooks/useInsumos";
import { useMaquinas } from "@/hooks/useMaquinas";
import { useTrechosCliente } from "@/hooks/useCliente";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  clearMafeDiarioRascunho,
  createInitialMafeDiarioDraft,
  readMafeDiarioRascunho,
  extractMafeDiarioHiddenState,
  getVisibleMafeDiarioContent,
  saveMafeDiarioRascunho,
  type MafeDiarioHiddenState,
  type MafeDiarioMediaDraft,
  type MafeDiarioPhase,
  type MafeDiarioStoredDraft,
} from "@/lib/mafe-diario";

interface MafeDiarioChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projetoId: string;
  projetoNome: string;
  clienteNome: string;
  onSaved?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PendingAttachment {
  id: string;
  file: File;
  tipo: "foto" | "video";
  nome: string;
  previewUrl: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mafe-diario-chat`;
const INITIAL_ASSISTANT_MESSAGE = `Vamos registrar a visita de hoje! 🌿

Me conte sobre o trabalho que foi realizado. Para montar o registro completo, vou precisar saber:

- O período da visita (manhã, tarde ou dia inteiro)
- Quais áreas da propriedade foram trabalhadas
- Quem estava na equipe e o que cada um fez
- Insumos e máquinas utilizados
- Como ficou cada área ao final

Pode falar à vontade — pode ser de uma vez ou aos poucos que eu vou organizando tudo. 😊`;

const formatSavedDraftDate = (timestamp: string) => {
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) return "agora há pouco";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
};

const phaseMeta: Record<MafeDiarioPhase, { frameClass: string; badge: string }> = {
  collecting: {
    frameClass: "mafe-diario-frame--collecting",
    badge: "Coletando informações",
  },
  awaiting_registration: {
    frameClass: "mafe-diario-frame--awaiting",
    badge: "Aguardando cadastro",
  },
  ready_to_save: {
    frameClass: "mafe-diario-frame--ready",
    badge: "Pronto para salvar",
  },
};

const isImageFile = (file: File) => file.type.startsWith("image/");
const isVideoFile = (file: File) => file.type.startsWith("video/");

export function MafeDiarioChat({ open, onOpenChange, projetoId, projetoNome, clienteNome, onSaved }: MafeDiarioChatProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const highestRole = useHighestRole(user?.id);
  const { data: profile } = useProfile(user?.id);
  const { data: colaboradores = [] } = useColaboradoresAtivosBasico();
  const { data: insumos = [] } = useInsumos();
  const { data: maquinas = [] } = useMaquinas();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRefiningTranscript, setIsRefiningTranscript] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftState, setDraftState] = useState<MafeDiarioHiddenState>(() => createInitialMafeDiarioDraft(projetoId, ""));
  const [phase, setPhase] = useState<MafeDiarioPhase>("collecting");
  const [resumeDraft, setResumeDraft] = useState<MafeDiarioStoredDraft | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordingFinalTranscriptRef = useRef("");
  const recordingInterimTranscriptRef = useRef("");
  const recordingStopResolverRef = useRef<((value: string) => void) | null>(null);
  const recordingStoppedByUserRef = useRef(false);

  const { data: projectContext, isLoading: loadingContext } = useQuery({
    queryKey: ["mafe-diario-context", projetoId],
    enabled: open && !!projetoId,
    queryFn: async () => {
      const [projectRes, lastVisitRes] = await Promise.all([
        supabase
          .from("projetos")
          .select("cliente_id")
          .eq("id", projetoId)
          .maybeSingle(),
        supabase
          .from("diario_visitas" as never)
          .select("data_visita, status_geral")
          .eq("projeto_id", projetoId)
          .order("data_visita", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (lastVisitRes.error) throw lastVisitRes.error;

      return {
        clienteId: projectRes.data?.cliente_id || "",
        projectName: projetoNome,
        clientName: clienteNome,
        lastVisit: lastVisitRes.data,
      };
    },
  });

  const clearAttachments = () => {
    setAttachments((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const resetConversationState = () => {
    recordingFinalTranscriptRef.current = "";
    recordingInterimTranscriptRef.current = "";
    recordingStopResolverRef.current = null;
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setInput("");
    setIsStreaming(false);
    setIsRecording(false);
    setReviewOpen(false);
    clearAttachments();
  };

  const startFreshChat = (clienteId: string) => {
    resetConversationState();
    setResumeDraft(null);
    setMessages([{ id: crypto.randomUUID(), role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }]);
    setPhase("collecting");
    setDraftState(createInitialMafeDiarioDraft(projetoId, clienteId));
  };

  const restoreSavedDraft = (savedDraft: MafeDiarioStoredDraft, clienteId: string) => {
    resetConversationState();

    const restoredState = savedDraft.draftState
      ? {
          ...savedDraft.draftState,
          draft: {
            ...savedDraft.draftState.draft,
            projeto_id: projetoId,
            cliente_id: savedDraft.draftState.draft.cliente_id || clienteId,
          },
        }
      : createInitialMafeDiarioDraft(projetoId, clienteId);

    setResumeDraft(null);
    setMessages(
      savedDraft.mensagens.length
        ? savedDraft.mensagens.map((message) => ({
            ...message,
            id: message.id || crypto.randomUUID(),
          }))
        : [{ id: crypto.randomUUID(), role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }],
    );
    setDraftState(restoredState);
    setPhase(restoredState.phase);
  };

  useEffect(() => {
    if (!open || !projectContext?.clienteId) return;

    const savedDraft = readMafeDiarioRascunho(projetoId);
    if (savedDraft?.mensagens?.length) {
      resetConversationState();
      setMessages([]);
      setResumeDraft(savedDraft);

      const restoredState = savedDraft.draftState
        ? {
            ...savedDraft.draftState,
            draft: {
              ...savedDraft.draftState.draft,
              projeto_id: projetoId,
              cliente_id: savedDraft.draftState.draft.cliente_id || projectContext.clienteId,
            },
          }
        : createInitialMafeDiarioDraft(projetoId, projectContext.clienteId);

      setDraftState(restoredState);
      setPhase(restoredState.phase);
      return;
    }

    startFreshChat(projectContext.clienteId);
  }, [open, projetoId, projectContext?.clienteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, resumeDraft]);

  useEffect(() => {
    if (!open || !messages.length || resumeDraft) return;

    saveMafeDiarioRascunho({
      mensagens: messages,
      projetoId,
      projetoNome,
      clienteNome,
      timestamp: new Date().toISOString(),
      draftState,
    });
  }, [open, messages, projetoId, projetoNome, clienteNome, draftState, resumeDraft]);

  useEffect(() => {
    return () => {
      attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [attachments]);

  const reviewSummary = useMemo(() => draftState.draft, [draftState]);

  const resolveRecordingStop = (value: string) => {
    recordingStopResolverRef.current?.(value);
    recordingStopResolverRef.current = null;
  };

  const normalizeTranscriptWithContext = async (rawTranscript: string) => {
    const trimmed = rawTranscript.trim();
    if (!trimmed || !projectContext) return trimmed;

    setIsRefiningTranscript(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          mode: "normalize_transcript",
          projetoId,
          transcript: trimmed,
          currentDraft: draftState.draft,
          messages: messages.slice(-6).map((message) => ({ role: message.role, content: message.content })),
          currentPage: "Diário do projeto",
          currentRoute: window.location.pathname,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Não foi possível revisar a transcrição.");
      }

      const payload = await response.json();
      return (payload.transcript || trimmed).trim();
    } catch (error) {
      console.error("Erro ao revisar transcrição da Mafe:", error);
      toast({
        title: "Revisão de voz indisponível",
        description: "Mantive o texto captado pelo microfone para você revisar.",
      });
      return trimmed;
    } finally {
      setIsRefiningTranscript(false);
    }
  };

  const stopRecording = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setIsRecording(false);
      return input.trim();
    }

    recordingStoppedByUserRef.current = true;

    return new Promise<string>((resolve) => {
      recordingStopResolverRef.current = resolve;
      recognition.stop();
    });
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Microfone indisponível",
        description: "Seu navegador não suporta transcrição por voz.",
        variant: "destructive",
      });
      return;
    }

    recordingFinalTranscriptRef.current = "";
    recordingInterimTranscriptRef.current = "";
    recordingStoppedByUserRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          recordingFinalTranscriptRef.current += `${transcript} `;
        } else {
          interimTranscript = transcript;
        }
      }

      recordingInterimTranscriptRef.current = interimTranscript;
      setInput(`${recordingFinalTranscriptRef.current}${interimTranscript}`.trimStart());
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;

      recognitionRef.current = null;
      setIsRecording(false);

      const fallbackTranscript = `${recordingFinalTranscriptRef.current}${recordingInterimTranscriptRef.current}`.trim();
      resolveRecordingStop(fallbackTranscript || input.trim());

      if (event.error === "not-allowed") {
        toast({ title: "Permissão negada", description: "Libere o microfone para usar a transcrição.", variant: "destructive" });
      }
    };

    recognition.onend = async () => {
      if (!recordingStoppedByUserRef.current) {
        // Browser auto-stopped (silence timeout) — restart to keep capturing
        try {
          recognition.start();
          return;
        } catch {
          // If restart fails, treat as user stop
        }
      }

      recognitionRef.current = null;
      setIsRecording(false);

      const rawTranscript = `${recordingFinalTranscriptRef.current}${recordingInterimTranscriptRef.current}`.trim();
      if (!rawTranscript) {
        resolveRecordingStop(input.trim());
        return;
      }

      const refinedTranscript = await normalizeTranscriptWithContext(rawTranscript);
      setInput(refinedTranscript);
      resolveRecordingStop(refinedTranscript);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handlePickFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const nextAttachments: PendingAttachment[] = [];

    for (const file of Array.from(fileList)) {
      const validImage = isImageFile(file) && file.size <= 10 * 1024 * 1024;
      const validVideo = isVideoFile(file) && file.size <= 50 * 1024 * 1024;

      if (!validImage && !validVideo) {
        toast({ title: `Não consegui anexar ${file.name}`, description: "Use imagem até 10MB ou vídeo até 50MB.", variant: "destructive" });
        continue;
      }

      nextAttachments.push({
        id: crypto.randomUUID(),
        file,
        nome: file.name,
        tipo: isVideoFile(file) ? "video" : "foto",
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (!nextAttachments.length) return;

    setAttachments((current) => [...current, ...nextAttachments]);
    toast({ title: `${nextAttachments.length} anexo(s) pronto(s) para salvar` });
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.id === attachmentId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== attachmentId);
    });
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || !projectContext) return;

    const nextMessages = [...messages, { id: crypto.randomUUID(), role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);

    let rawAssistant = "";
    const assistantId = crypto.randomUUID();

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          projetoId,
          currentDraft: draftState.draft,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
          currentPage: "Diário do projeto",
          currentRoute: window.location.pathname,
        }),
      });

      if (!response.ok || !response.body) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Erro ao iniciar a conversa com a Mafe.");
      }

      setMessages((current) => [...current, { id: assistantId, role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.trim() || line.startsWith(":")) {
            newlineIndex = buffer.indexOf("\n");
            continue;
          }

          if (!line.startsWith("data: ")) {
            newlineIndex = buffer.indexOf("\n");
            continue;
          }

          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            finished = true;
            break;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.delta) {
              rawAssistant += parsed.delta;
              const visible = getVisibleMafeDiarioContent(rawAssistant);
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId ? { ...message, content: visible } : message,
                ),
              );
            }
          } catch {
            buffer = `${line}\n${buffer}`;
            break;
          }

          newlineIndex = buffer.indexOf("\n");
        }
      }

      const hiddenState = extractMafeDiarioHiddenState(rawAssistant);
      if (hiddenState) {
        setDraftState(hiddenState);
        setPhase(hiddenState.phase);
      }
    } catch (error: any) {
      toast({ title: "Erro na Mafe Diário", description: error.message || "Tente novamente.", variant: "destructive" });
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isRefiningTranscript) return;

    if (isRecording) {
      const transcript = await stopRecording();
      if (!transcript.trim()) return;
      await sendMessage(transcript);
      return;
    }

    await sendMessage(input);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!reviewSummary.areas.length) {
        throw new Error("A Mafe ainda não montou o rascunho da visita.");
      }

      const uploadedMedia: MafeDiarioMediaDraft[] = [];

      for (const attachment of attachments) {
        const extension = attachment.file.name.split(".").pop() || "bin";
        const filePath = `${projetoId}/${reviewSummary.data_visita}/${Date.now()}-${attachment.id}.${extension}`;
        const { data, error } = await supabase.storage.from("diario-midias").upload(filePath, attachment.file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (error) throw error;

        uploadedMedia.push({
          tipo: attachment.tipo,
          url: data.path,
          thumbnail_url: attachment.tipo === "foto" ? data.path : null,
          descricao: attachment.nome,
        });
      }

      const payload = {
        ...reviewSummary,
        observacoes_internas: reviewSummary.observacoes_internas || null,
        criar_alerta: Boolean(reviewSummary.criar_alerta),
        registrado_por_nome: profile?.nome || user?.email || "Equipe MFM",
        midias_gerais: [...(reviewSummary.midias_gerais || []), ...uploadedMedia],
      } as any;

      const { data, error } = await supabase.rpc("create_diario_visita_with_details", { payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      clearMafeDiarioRascunho(projetoId);
      toast({ title: "Visita salva", description: "O diário do projeto foi atualizado." });
      queryClient.invalidateQueries({ queryKey: ["diario-visitas-projeto", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["diario-alertas-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["cliente-feed"] });
      onSaved?.();
      resetConversationState();
      setMessages([]);
      setResumeDraft(null);
      setPhase("collecting");
      setDraftState(createInitialMafeDiarioDraft(projetoId, projectContext?.clienteId || ""));
      onOpenChange(false);
    },
  });

  const disableComposer = loadingContext || isStreaming || isRefiningTranscript || saveMutation.isPending || !!resumeDraft;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full border-l border-border p-0 sm:max-w-3xl">
          <div className="flex h-full flex-col bg-background">
            <SheetHeader className="border-b border-border px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SheetTitle>🌿 Mafe — {projetoNome || projectContext?.projectName || "Projeto"}</SheetTitle>
                  <SheetDescription>
                    Registro guiado da visita do diário {clienteNome ? `· ${clienteNome}` : projectContext?.clientName ? `· ${projectContext.clientName}` : ""}
                  </SheetDescription>
                </div>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {phaseMeta[phase].badge}
                </span>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-hidden px-6 py-5">
              <div className={cn("mafe-diario-frame flex h-full flex-col overflow-hidden rounded-3xl border bg-card", phaseMeta[phase].frameClass)}>
                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                  {loadingContext ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : resumeDraft ? (
                    <div className="flex h-full items-center justify-center p-4">
                      <div className="max-w-md rounded-3xl border border-border bg-muted/40 p-5 shadow-sm">
                        <p className="text-sm font-medium text-foreground">
                          Encontrei um rascunho do dia {formatSavedDraftDate(resumeDraft.timestamp)}. Quer continuar de onde parou?
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Se continuar, eu restauro a conversa e o contexto já coletado para este projeto.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button type="button" variant="terracota" onClick={() => restoreSavedDraft(resumeDraft, projectContext?.clienteId || "")}>
                            Continuar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              clearMafeDiarioRascunho(projetoId);
                              startFreshChat(projectContext?.clienteId || "");
                            }}
                          >
                            Começar do zero
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-muted/70 text-foreground",
                            )}
                          >
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}

                      {isStreaming && (
                        <div className="flex justify-start">
                          <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted/70 px-4 py-3">
                            <span className="mafe-diario-dot" />
                            <span className="mafe-diario-dot" />
                            <span className="mafe-diario-dot" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="border-t border-border px-4 py-4 sm:px-5">
                  {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-foreground">
                          {attachment.tipo === "video" ? <Video className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                          <span className="max-w-[180px] truncate">{attachment.nome}</span>
                          <button type="button" onClick={() => removeAttachment(attachment.id)} className="text-muted-foreground transition hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={isRecording ? "🎙️ Gravando... fale agora" : isRefiningTranscript ? "A Mafe está ajustando a transcrição com o contexto do projeto..." : "Conte para a Mafe como foi a visita"}
                      className="min-h-[110px] resize-none"
                      disabled={disableComposer}
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant={isRecording ? "ghost" : "outline"}
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={disableComposer}
                          className={isRecording ? "relative text-[#B93C2A]" : ""}
                        >
                          <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
                          {isRecording && (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#B93C2A] animate-pulse" />
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={disableComposer}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            handlePickFiles(event.target.files);
                            event.currentTarget.value = "";
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {phase === "ready_to_save" && (
                          <Button type="button" variant="success" onClick={() => setReviewOpen(true)} disabled={saveMutation.isPending}>
                            Revisar e salvar
                          </Button>
                        )}

                        <Button type="submit" variant="terracota" disabled={!input.trim() || disableComposer}>
                          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Enviar
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-card sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Revisar visita antes de salvar</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-muted/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Data</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{reviewSummary.data_visita}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Período</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{reviewSummary.periodo || "Não informado"}</p>
                </div>
              </div>
            </section>

            {reviewSummary.areas.map((area, index) => (
              <section key={`${area.nome_area}-${index}`} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-lg font-semibold text-foreground">{area.nome_area}</h4>
                  {area.status_area && <span className="diario-status-badge">{area.status_area}</span>}
                </div>

                {area.servicos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {area.servicos.map((servico) => (
                      <span key={servico} className="diario-chip-service">{servico}</span>
                    ))}
                  </div>
                )}

                {area.equipe.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-foreground">Equipe</p>
                    <div className="mt-2 space-y-2">
                      {area.equipe.map((membro, memberIndex) => (
                        <div key={`${membro.colaborador_nome}-${memberIndex}`} className="rounded-xl bg-muted/70 p-3 text-sm text-foreground">
                          {membro.colaborador_nome}
                          {membro.funcao ? ` · ${membro.funcao}` : ""}
                          {membro.descricao_atividade ? ` — ${membro.descricao_atividade}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {area.insumos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-foreground">Insumos</p>
                    <div className="mt-2 space-y-2">
                      {area.insumos.map((insumo, supplyIndex) => (
                        <div key={`${insumo.insumo_nome}-${supplyIndex}`} className="rounded-xl bg-muted/70 p-3 text-sm text-foreground">
                          {insumo.insumo_nome}
                          {(insumo.quantidade || insumo.unidade) ? ` · ${[insumo.quantidade, insumo.unidade].filter(Boolean).join(" ")}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {area.maquinas.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {area.maquinas.map((maquina, machineIndex) => (
                      <span key={`${maquina.maquina_nome}-${machineIndex}`} className="tag-secondary">{maquina.maquina_nome}</span>
                    ))}
                  </div>
                )}

                {area.relato && (
                  <div className="mt-4 rounded-xl bg-muted/70 p-3 text-sm text-muted-foreground">
                    {area.relato}
                  </div>
                )}
              </section>
            ))}

            {(reviewSummary.observacoes_internas || attachments.length > 0) && (
              <section className="rounded-2xl border border-border bg-muted/50 p-4">
                {reviewSummary.observacoes_internas && (
                  <div>
                    <p className="text-sm font-medium text-foreground">Observações internas</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{reviewSummary.observacoes_internas}</p>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", reviewSummary.observacoes_internas ? "mt-4" : "")}>
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="overflow-hidden rounded-2xl border border-border bg-background">
                        {attachment.tipo === "video" ? (
                          <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
                            <Video className="h-6 w-6" />
                          </div>
                        ) : (
                          <img src={attachment.previewUrl} alt={attachment.nome} className="aspect-square w-full object-cover" loading="lazy" />
                        )}
                        <div className="p-2 text-xs text-muted-foreground">{attachment.nome}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={saveMutation.isPending}>
                Voltar
              </Button>
              <Button type="button" variant="success" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar visita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
