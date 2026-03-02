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
  Send,
  Mic,
  Square,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile, useUserRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import mafeAvatar from "@/assets/flora-avatar.png";

type UserRole = "admin" | "gestor" | "operador";

const menuItems = [
  { title: "Clientes", description: "Gerenciar clientes e perfis", icon: Users, href: "/clientes", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Equipe", description: "Colaboradores e equipes", icon: UserCircle, href: "/equipe", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Plantas", description: "Catálogo de plantas", icon: Leaf, href: "/plantas", roles: ["admin"] as UserRole[] },
  { title: "Produtos e Insumos", description: "Materiais e insumos", icon: Package, href: "/insumos", roles: ["admin"] as UserRole[] },
  { title: "Fornecedores", description: "Cadastro de fornecedores", icon: Truck, href: "/fornecedores", roles: ["admin"] as UserRole[] },
  { title: "Máquinas", description: "Equipamentos e manutenção", icon: Wrench, href: "/maquinas", roles: ["admin"] as UserRole[] },
  { title: "Processos Internos", description: "Documentação de processos", icon: BookOpen, href: "/processos", roles: ["admin", "gestor"] as UserRole[] },
  { title: "Configurações do Sistema", description: "Áreas, acessos e categorias", icon: Settings, href: "/areas", roles: ["admin"] as UserRole[] },
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
  const { data: userRoles = [] } = useUserRoles(user?.id);
  const [inlineInput, setInlineInput] = useState("");
  const [quote] = useState(() => getRandomQuote());
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const getUserHighestRole = (): UserRole => {
    if (userRoles.length === 0) return "admin";
    if (userRoles.some(r => r.role === "admin")) return "admin";
    if (userRoles.some(r => r.role === "gestor")) return "gestor";
    return "operador";
  };

  const userRole = getUserHighestRole();
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
      <div className="flex flex-col gap-8 py-4">
        {/* Greeting + Mafe */}
        <div className="card-botanical p-8 max-w-3xl mx-auto w-full">
          <h1 className="text-2xl font-semibold text-foreground font-serif mb-1">
            {getGreeting()}, {firstName}! 👋🌳
          </h1>
          <p className="text-lg font-semibold text-foreground font-serif mb-2">Espero que esteja bem!</p>
          <p className="text-sm text-muted-foreground italic mb-6">{quote}</p>

          <div className="flex flex-col items-center mb-6">
            <img src={mafeAvatar} alt="Mafe" className="w-40 h-40 rounded-full object-cover object-top shadow-md mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-md">
              Eu sou a <span className="font-semibold text-foreground">Mafe</span>, assistente virtual da <span className="font-bold text-foreground">Maria Fernanda Marques — Paisagismo e Soluções Ambientais</span>. Me conte como posso te ajudar!
            </p>
          </div>

          {/* Inline chat input */}
          <form onSubmit={handleInlineSend} className="flex items-end gap-2">
            <textarea
              value={inlineInput}
              onChange={(e) => setInlineInput(e.target.value)}
              onKeyDown={handleInlineKeyDown}
              placeholder="Descreva o que você precisa..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              onClick={toggleRecording}
              className="rounded-xl h-10 w-10 shrink-0"
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!inlineInput.trim()}
              className="rounded-xl h-10 w-10 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Menu Grid */}
        <div className="max-w-3xl mx-auto w-full">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Módulos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-3 p-5 rounded-xl",
                  "bg-card border border-border",
                  "hover:bg-secondary hover:shadow-md hover:scale-[1.02]",
                  "transition-all duration-200 text-center group"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
