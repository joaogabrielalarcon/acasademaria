import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Square, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { AreasLauncher } from "@/components/inicio/AreasLauncher";
import { MinhasTarefas } from "@/components/inicio/MinhasTarefas";
import { AlertasProativos } from "@/components/inicio/AlertasProativos";
import { AgendaDoDia } from "@/components/inicio/AgendaDoDia";
import { RetomadaRapida } from "@/components/inicio/RetomadaRapida";
import { LembretesPostits } from "@/components/inicio/LembretesPostits";
import { ClimaHeroInline } from "@/components/inicio/ClimaHeroInline";
import { Aniversariantes } from "@/components/inicio/Aniversariantes";
import { MafeAvatar } from "@/components/inicio/MafeAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REFLEXOES = [
  "Hoje é um ótimo dia para plantar boas sementes, no jardim e na vida.",
  "Que a sua energia hoje contagie todos ao seu redor.",
  "Jardins não crescem com pressa. Confie no seu tempo e siga plantando.",
  "Cuidar do detalhe hoje é colher beleza amanhã.",
  "Toda grande obra começa com um pequeno gesto. Comece.",
  "Respire fundo. O que é essencial cabe em um dia de cada vez.",
  "A raiz que não se vê sustenta tudo o que floresce.",
  "Faça com carinho, o cliente sente o cuidado nas entrelinhas.",
  "Persistência é o adubo dos sonhos. Continue.",
  "O sol nasce pra todo mundo, mas quem madruga rega o jardim primeiro.",
  "Cada estação tem sua beleza. Confie no ciclo.",
  "A coragem começa antes da certeza. Dê o primeiro passo.",
  "Presença é o presente mais raro que se pode oferecer.",
  "A natureza não se apressa, e ainda assim tudo se cumpre.",
  "Você é o jardineiro dos próprios dias.",
  "Semeie hoje o que quer colher em silêncio amanhã.",
  "Um dia bem cuidado é uma vida bem cuidada.",
  "Escute o vento, ele carrega respostas antigas.",
  "Fé é ver a flor onde ainda há semente.",
  "Trabalhar com propósito é rezar de mãos limpas.",
  "A beleza está no detalhe que ninguém pediu.",
  "Não é sobre pressa. É sobre direção.",
  "Cada raiz forte já foi uma semente frágil.",
  "Cultive a paciência: ela dá frutos que a pressa nunca vê.",
  "O que se faz com amor floresce mesmo fora da estação.",
];

const LAST_KEY = "meu-dia:last-quote";

function pegarReflexao(): string {
  if (typeof window === "undefined") return REFLEXOES[0];
  const ultima = window.localStorage.getItem(LAST_KEY);
  const pool = REFLEXOES.filter((r) => r !== ultima);
  const escolhida = pool[Math.floor(Math.random() * pool.length)];
  window.localStorage.setItem(LAST_KEY, escolhida);
  return escolhida;
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Marca d'água botânica em SVG — linhas ultra-finas no canto da faixa-herói */
function BotanicalMark() {
  return (
    <svg
      aria-hidden
      className="absolute -right-16 -bottom-24 w-[360px] h-[360px] pointer-events-none opacity-[0.035] motion-reduce:hidden"
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      <path d="M200 380 C 200 260, 200 180, 200 60" />
      <path d="M200 300 C 140 300, 100 260, 90 210" />
      <path d="M200 300 C 260 300, 300 260, 310 210" />
      <path d="M200 240 C 155 240, 125 210, 118 175" />
      <path d="M200 240 C 245 240, 275 210, 282 175" />
      <ellipse cx="90" cy="210" rx="22" ry="8" transform="rotate(-30 90 210)" />
      <ellipse cx="310" cy="210" rx="22" ry="8" transform="rotate(30 310 210)" />
      <ellipse cx="118" cy="175" rx="18" ry="6" transform="rotate(-25 118 175)" />
      <ellipse cx="282" cy="175" rx="18" ry="6" transform="rotate(25 282 175)" />
      <circle cx="200" cy="60" r="12" />
    </svg>
  );
}

export default function MeuDia() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const primeiroNome =
    profile?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "você";
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [focus, setFocus] = useState(false);
  const recognitionRef = useRef<any>(null);
  const reflexao = useMemo(() => pegarReflexao(), []);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setRecording(false);
    }
    window.dispatchEvent(new CustomEvent("mafe-inline-message", { detail: t }));
    setInput("");
  };

  const toggleRec = () => {
    if (recording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setRecording(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    let final = "";
    r.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + " ";
        else interim = t;
      }
      setInput(final + interim);
    };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    recognitionRef.current = r;
    r.start();
    setRecording(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 py-2">
        {/* ── FAIXA 1 — Herói ────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative overflow-hidden rounded-xl shadow-e2 px-8 py-8 lg:px-10 lg:py-9"
          style={{
            background:
              "linear-gradient(135deg, #193527 0%, #12271D 55%, #0E1F17 100%)",
            color: "hsl(var(--hero-band-fg))",
          }}
        >
          <BotanicalMark />

          <div className="relative flex flex-col gap-5 max-w-4xl">
            <div className="flex items-start gap-6">
              <MafeAvatar size={160} />
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div>
                  <h1
                    className="type-h1"
                    style={{
                      color: "hsl(var(--hero-band-fg))",
                      fontSize: "44px",
                      lineHeight: 1.1,
                    }}
                  >
                    {saudacao()}, {primeiroNome}.
                  </h1>
                  <motion.p
                    key={reflexao}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.35 }}
                    className="text-[15px] italic mt-3 max-w-2xl"
                    style={{ color: "hsl(var(--hero-band-fg) / 0.86)" }}
                  >
                    {reflexao}
                  </motion.p>
                </div>

                <Aniversariantes />
              </div>

              {/* + universal, no topo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Novo registro"
                    className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white/[0.10] hover:bg-white/[0.18] border border-white/[0.14] transition-colors"
                    style={{ color: "hsl(var(--hero-band-fg))" }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Criar novo
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/projetos/novo")}>
                    Projeto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/clientes/novo")}>
                    Cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orcamentos/novo")}>
                    Orçamento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/registros/novo")}>
                    Registro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Campo da Mafe — field elevado com brilho no foco */}
            <form onSubmit={send} className="relative flex items-end gap-2 max-w-3xl">
              <motion.div
                animate={{
                  boxShadow: focus
                    ? "0 0 0 2px rgba(158, 55, 34, 0.4), 0 8px 24px rgba(0,0,0,0.25)"
                    : "0 4px 14px rgba(0,0,0,0.18)",
                }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex items-center gap-1 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.12] pl-4 pr-1.5 py-1.5"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setFocus(true)}
                  onBlur={() => setFocus(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Pergunte algo à Mafe…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent py-2 text-[15px] placeholder:text-white/45 focus:outline-none"
                  style={{ color: "hsl(var(--hero-band-fg))" }}
                />
                <button
                  type="button"
                  onClick={toggleRec}
                  aria-label={recording ? "Parar gravação" : "Ditar mensagem"}
                  className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {recording ? <Square className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Enviar mensagem"
                  className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <Send className="w-[18px] h-[18px]" />
                </button>
              </motion.div>
            </form>
          </div>
        </motion.section>

        {/* ── FAIXA 2 — Retomada rápida + Lembretes + Clima ── */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] items-start">
          <div className="flex flex-col gap-3 min-w-0">
            <RetomadaRapida />
            <LembretesPostits />
          </div>
          <ClimaHoje />
        </div>

        {/* Barra do launcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="type-label">Painel do dia</span>
            <span aria-hidden className="h-px w-16 bg-border/70" />
          </div>
          <AreasLauncher />
        </div>

        {/* ── FAIXA 3 — Núcleo de trabalho (62/38) ─────────── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
          }}
          className="grid gap-5 lg:grid-cols-[62%_38%] xl:grid-cols-[63%_37%]"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
            }}
          >
            <MinhasTarefas />
          </motion.div>

          <div className="flex flex-col gap-5 min-w-0">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
              }}
            >
              <AlertasProativos />
            </motion.div>
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
              }}
            >
              <AgendaDoDia />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
