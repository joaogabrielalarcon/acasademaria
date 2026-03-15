import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCircle,
  Leaf,
  Package,
  Truck,
  Wrench,
  Settings,
  BookOpen,
  CalendarDays,
  GitBranch,
  Send,
  Mic,
  Square,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile, useHighestRole, type AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import mafeAvatar from "@/assets/flora-avatar.webp";

const menuItems = [
  { title: "Clientes", description: "Gerenciar clientes e perfis", icon: Users, href: "/clientes", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] as AppRole[] },
  { title: "Equipe", description: "Colaboradores e equipes", icon: UserCircle, href: "/equipe", roles: ["admin", "administrativo", "gestao_campo"] as AppRole[] },
  { title: "Calendário", description: "Datas importantes e feriados", icon: CalendarDays, href: "/calendario", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] as AppRole[] },
  { title: "Plantas", description: "Catálogo de plantas", icon: Leaf, href: "/plantas", roles: ["admin", "administrativo", "arquitetura"] as AppRole[] },
  { title: "Produtos e Insumos", description: "Materiais e insumos", icon: Package, href: "/insumos", roles: ["admin", "administrativo", "gestao_campo"] as AppRole[] },
  { title: "Fornecedores", description: "Cadastro de fornecedores", icon: Truck, href: "/fornecedores", roles: ["admin", "administrativo", "gestao_campo"] as AppRole[] },
  { title: "Máquinas", description: "Equipamentos e manutenção", icon: Wrench, href: "/maquinas", roles: ["admin", "administrativo", "gestao_campo"] as AppRole[] },
  { title: "Processos Internos", description: "Documentação de processos", icon: BookOpen, href: "/processos", roles: ["admin", "administrativo"] as AppRole[] },
  { title: "CRM", description: "Pipeline comercial", icon: GitBranch, href: "/crm", roles: ["admin", "administrativo", "gestao_campo", "arquitetura"] as AppRole[] },
  { title: "Configurações do Sistema", description: "Áreas, acessos e categorias", icon: Settings, href: "/areas", roles: ["admin"] as AppRole[] },
];

const MOTIVATIONAL_QUOTES = [
  "Cada dia é uma nova oportunidade de fazer algo extraordinário! 🌱",
  "Você já agradeceu por estar vivo hoje? O dia está lindo! ☀️",
  "A natureza nos ensina: tudo floresce no tempo certo. Confie no seu processo! 🌸",
  "Que tal espalhar gentileza por onde passar hoje? O mundo precisa disso! 💚",
  "Respire fundo, sorria e vá em frente. Você é mais forte do que imagina! 💪",
  "Hoje é um ótimo dia para plantar boas sementes — no jardim e na vida! 🌻",
  "Lembre-se: pequenas ações diárias constroem grandes resultados! 🏆",
  "A gratidão transforma o que temos em suficiente. Seja grato! 🙏",
  "Você viu só que dia especial que é hoje? Aproveite cada momento! ✨",
  "O segredo do sucesso é começar. E você já está aqui! 🚀",
  "Cuide de si como cuida de um jardim: com paciência, amor e dedicação! 🌿",
  "Hoje pode ser o melhor dia da sua semana. Depende só de você! 😊",
  "A beleza está nos detalhes. Olhe ao redor e perceba as coisas boas! 🦋",
  "Trabalhar com propósito faz toda a diferença. Você faz a diferença! 🌟",
  "Não existe tempo ruim para semear algo bom. Vamos juntos! 🤝",
  "Sorria! Um sorriso muda o seu dia e o de quem está ao seu lado! 😄",
  "A vida é como um jardim: precisa de cuidado, mas sempre recompensa! 🌺",
  "Você é parte essencial dessa equipe. Saiba que você é valorizado! 💛",
  "Permita-se celebrar as pequenas conquistas. Elas importam! 🎉",
  "Hoje é perfeito para fazer algo que te orgulhe. Bora lá! 🌈",
  "Quem planta com amor, colhe com alegria. Continue assim! 🌷",
  "Cada desafio é uma chance de crescer. Você vai longe! 🗻",
  "O mundo precisa de mais pessoas como você: dedicadas e carinhosas! 💐",
  "Respire o ar fresco, sinta a energia do dia. Tudo vai dar certo! 🍃",
  "Seu trabalho faz diferença na vida das pessoas. Nunca se esqueça disso! 🏡",
  "A simplicidade é a sofisticação suprema. Faça o simples com excelência! ⭐",
  "Acredite: o melhor ainda está por vir! Continue caminhando! 🛤️",
  "Um passo de cada vez. Você está no caminho certo! 👣",
  "Hoje é dia de gratidão, de sorrisos e de fazer acontecer! 🌞",
  "Que a sua energia hoje contagie todos ao seu redor! ⚡",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getRandomQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export default function MenuCentral() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [inlineInput, setInlineInput] = useState("");
  const [quote] = useState(() => getRandomQuote());
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const userRole = useHighestRole(user?.id);
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));
  const firstName = profile?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário";

  const handleInlineSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inlineInput.trim();
    if (!trimmed) return;
    // Stop recording and detach handlers before clearing
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
    }
    // Dispatch custom event for MafeChat to pick up
    window.dispatchEvent(new CustomEvent("mafe-inline-message", { detail: trimmed }));
    setInlineInput("");
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInlineSend(); }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
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
      setInlineInput(finalTranscript + interimTranscript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 py-4">
        {/* Greeting + Mafe — full width, no box */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-28 h-28 lg:w-44 lg:h-44 rounded-full overflow-hidden shadow-md shrink-0">
            <img src={mafeAvatar} alt="Mafe" className="w-full h-full object-cover scale-[1.15]" style={{ objectPosition: "50% 20%" }} loading="eager" decoding="async" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold text-foreground font-serif mb-1">
              {getGreeting()}, {firstName}! 👋🌳
            </h1>
            <p className="text-lg font-semibold text-foreground font-serif mb-1">Espero que esteja bem!</p>
            <p className="text-sm text-muted-foreground italic mb-4">{quote}</p>

            {/* Inline chat input */}
            <form onSubmit={handleInlineSend} className="flex items-end gap-2">
              <textarea
                value={inlineInput}
                onChange={(e) => setInlineInput(e.target.value)}
                onKeyDown={handleInlineKeyDown}
                placeholder="Pergunte algo à Mafe..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                size="icon"
                variant={isRecording ? "destructive" : "ghost"}
                onClick={toggleRecording}
                className="rounded-xl h-11 w-11 shrink-0"
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!inlineInput.trim()}
                className="rounded-xl h-11 w-11 shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>

        {/* Menu Grid — full width */}
        <div>
          <h2 className="text-base font-medium text-muted-foreground mb-4">Módulos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-4 p-6 rounded-xl",
                  "bg-card border border-border",
                  "hover:bg-secondary hover:shadow-md hover:scale-[1.02]",
                  "transition-all duration-200 text-center group"
                )}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-8 h-8 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-base text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
