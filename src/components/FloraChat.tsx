import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Send, Loader2, User, Mic, Square, Minimize2, Maximize2, X, MessageCircle } from "lucide-react";
import floraAvatar from "@/assets/flora-avatar.png";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { useAuth, useProfile, useUserRoles } from "@/hooks/useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistente-mfm`;

const ROUTE_LABELS: Record<string, string> = {
  "/": "Menu Central (Página Inicial)",
  "/clientes": "Lista de Clientes",
  "/clientes/novo": "Cadastro de Novo Cliente",
  "/equipe": "Gestão da Equipe",
  "/plantas": "Catálogo de Plantas",
  "/plantas/nova": "Cadastro de Nova Planta",
  "/insumos": "Produtos e Insumos",
  "/fornecedores": "Fornecedores",
  "/maquinas": "Máquinas e Equipamentos",
  "/processos": "Processos Internos",
  "/areas": "Configurações - Áreas",
  "/acessos": "Controle de Acessos",
  "/projetos/novo": "Novo Projeto",
  "/registros/novo": "Novo Registro de Serviço",
  "/propostas/nova": "Nova Proposta",
  "/recebimentos/novo": "Novo Recebimento",
  "/solicitacoes/nova": "Nova Solicitação",
  "/alterar-senha": "Alterar Senha",
  "/custos-equipe": "Custos da Equipe",
  "/categorias-plantas": "Categorias de Plantas",
};

function getRouteLabel(pathname: string): string {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Pattern matches
  if (/^\/clientes\/[^/]+\/editar$/.test(pathname)) return "Edição de Cliente";
  if (/^\/clientes\/[^/]+$/.test(pathname)) return "Perfil do Cliente";
  if (/^\/projetos\/[^/]+\/editar$/.test(pathname)) return "Edição de Projeto";
  if (/^\/projetos\/[^/]+$/.test(pathname)) return "Detalhes do Projeto";
  if (/^\/registros\/[^/]+$/.test(pathname)) return "Detalhes do Registro";
  if (/^\/plantas\/[^/]+\/editar$/.test(pathname)) return "Edição de Planta";
  return "Página do Sistema";
}

const FLORA_INTRO = `Olá! Eu sou a **Flora**, assistente virtual da **Maria Fernanda Marques — Paisagismo e Soluções Ambientais**.

Me conte como posso te ajudar! Você pode digitar ou enviar um áudio 🎙️`;

export function FloraChat() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: userRoles = [] } = useUserRoles(user?.id);
  const location = useLocation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: FLORA_INTRO },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isGuiding, setIsGuiding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevRouteRef = useRef(location.pathname);

  const userRole = userRoles.some(r => r.role === "admin") ? "admin"
    : userRoles.some(r => r.role === "gestor") ? "gestor" : "operador";

  const currentPage = getRouteLabel(location.pathname);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Detect route changes and auto-notify Flora during guided sessions
  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    const newRoute = location.pathname;
    prevRouteRef.current = newRoute;

    if (prevRoute === newRoute) return;
    
    // Only auto-send if there's an active conversation beyond the intro
    const hasConversation = messages.length > 1;
    if (!hasConversation || isLoading) return;

    // Check if last assistant message contained step-by-step guidance
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
    const hasSteps = lastAssistantMsg?.content && /passo|etapa|clique|navegue|acesse|abra/i.test(lastAssistantMsg.content);
    
    if (hasSteps) {
      setIsGuiding(true);
      const newPageLabel = getRouteLabel(newRoute);
      // Auto-send a system-like message informing the route change
      const navMsg: Message = { role: "user", content: `[Naveguei para: ${newPageLabel}]` };
      setMessages(prev => [...prev, navMsg]);
      
      // Trigger Flora response with updated context
      sendToFlora([...messages.filter((m, i) => !(i === 0 && m.content === FLORA_INTRO)), navMsg], newRoute, newPageLabel);
    }
  }, [location.pathname]);

  const sendToFlora = async (allMessages: Message[], route?: string, page?: string) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          userRole,
          currentPage: page || currentPage,
          currentRoute: route || location.pathname,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao conectar com a Flora");
      }
      if (!resp.body) throw new Error("Sem resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (!isOpen) setHasUnread(true);
    } catch (err: any) {
      toast({ title: "Erro na Flora", description: err.message, variant: "destructive" });
      if (!assistantSoFar) setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Speech recognition
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Não suportado", description: "Tente o Google Chrome.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interimTranscript = transcript;
      }
      setInput(finalTranscript + interimTranscript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [toast]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    if (isRecording) stopRecording();
    if (!isOpen) setIsOpen(true);

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const allMessages = [...messages.filter((m, i) => !(i === 0 && m.content === FLORA_INTRO)), userMsg];
    await sendToFlora(allMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  if (!user) return null;

  // Floating bubble when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setHasUnread(false); }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 overflow-hidden border-2 border-primary/20"
      >
        <img src={floraAvatar} alt="Flora" className="w-full h-full object-cover object-top" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  const panelSize = isExpanded
    ? "fixed inset-4 z-50"
    : "fixed bottom-5 right-5 z-50 w-80 h-[28rem] sm:w-96 sm:h-[32rem]";

  return (
    <div className={`${panelSize} flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/50 shrink-0">
        <img src={floraAvatar} alt="Flora" className="w-8 h-8 rounded-full object-cover object-top" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-none">Flora</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            Assistente virtual — MFM Paisagismo
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.filter(msg => !msg.content.startsWith("[Naveguei para:")).map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <img src={floraAvatar} alt="Flora" className="w-6 h-6 rounded-full object-cover object-top shrink-0 mt-1" />
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>li]:my-0.5 [&>h1]:mt-2 [&>h2]:mt-2 [&>h3]:mt-1.5 [&>strong]:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <img src={floraAvatar} alt="Flora" className="w-6 h-6 rounded-full object-cover object-top shrink-0" />
            <div className="bg-muted rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2 shrink-0">
        {isRecording && (
          <div className="flex items-center gap-2 mb-1.5 text-[11px] text-destructive animate-pulse">
            <Mic className="w-3 h-3" />
            <span>Gravando áudio...</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "outline"}
            onClick={isRecording ? stopRecording : startRecording}
            className="rounded-xl h-9 w-9 shrink-0"
            disabled={isLoading}
          >
            {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "🎙️ Gravando..." : "Pergunte à Flora..."}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="rounded-xl h-9 w-9 shrink-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
