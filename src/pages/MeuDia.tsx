import { useState, useRef, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Square } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AreasLauncher } from "@/components/inicio/AreasLauncher";
import { MinhasTarefas } from "@/components/inicio/MinhasTarefas";
import { AlertasProativos } from "@/components/inicio/AlertasProativos";
import { AgendaDoDia } from "@/components/inicio/AgendaDoDia";
import { RetomadaRapida } from "@/components/inicio/RetomadaRapida";
import { Lembretes } from "@/components/inicio/Lembretes";
import { MafeAvatar } from "@/components/inicio/MafeAvatar";

const REFLEXOES = [
  "Hoje é um ótimo dia para plantar boas sementes — no jardim e na vida.",
  "Que a sua energia hoje contagie todos ao seu redor.",
  "Jardins não crescem com pressa. Confie no seu tempo e siga plantando.",
  "Cuidar do detalhe hoje é colher beleza amanhã.",
  "Toda grande obra começa com um pequeno gesto. Comece.",
  "Respire fundo. O que é essencial cabe em um dia de cada vez.",
  "A raiz que não se vê sustenta tudo o que floresce.",
  "Faça com carinho — o cliente sente o cuidado nas entrelinhas.",
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

/** Count-up animado para o número de tarefas/alertas do resumo */
function useCountUp(target: number, duration = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

/** Marca d'água botânica em SVG — linhas ultra-finas no canto da faixa-herói */
function BotanicalMark() {
  return (
    <svg
      aria-hidden
      className="absolute -right-6 -top-6 w-[420px] h-[420px] pointer-events-none opacity-[0.06]"
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
      <path d="M200 180 C 165 180, 140 155, 135 125" />
      <path d="M200 180 C 235 180, 260 155, 265 125" />
      <path d="M200 120 C 180 120, 165 105, 162 85" />
      <path d="M200 120 C 220 120, 235 105, 238 85" />
      <ellipse cx="90" cy="210" rx="22" ry="8" transform="rotate(-30 90 210)" />
      <ellipse cx="310" cy="210" rx="22" ry="8" transform="rotate(30 310 210)" />
      <ellipse cx="118" cy="175" rx="18" ry="6" transform="rotate(-25 118 175)" />
      <ellipse cx="282" cy="175" rx="18" ry="6" transform="rotate(25 282 175)" />
      <ellipse cx="135" cy="125" rx="15" ry="5" transform="rotate(-20 135 125)" />
      <ellipse cx="265" cy="125" rx="15" ry="5" transform="rotate(20 265 125)" />
      <circle cx="200" cy="60" r="12" />
    </svg>
  );
}

export default function MeuDia() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const primeiroNome =
    profile?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Você";
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [focus, setFocus] = useState(false);
  const recognitionRef = useRef<any>(null);
  const reflexao = useMemo(() => pegarReflexao(), []);

  // Números resumo (usam os mocks: 5 tarefas / 3 alertas — count-up)
  const tarefasN = useCountUp(5);
  const alertasN = useCountUp(3);

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
        {/* ── Faixa-herói de marca ────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
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
            <div className="flex items-start gap-5">
              <MafeAvatar size={112} />
              <div className="flex-1 min-w-0">

              <h1
                className="type-h1"
                style={{ color: "hsl(var(--hero-band-fg))", fontSize: "40px", lineHeight: 1.1 }}
              >
                {saudacao()}, {primeiroNome}.
              </h1>
              <p
                className="text-[15px] mt-2"
                style={{ color: "hsl(var(--hero-band-fg) / 0.92)" }}
              >
                Você tem{" "}
                <span
                  className="font-sans tabular-nums font-bold"
                  style={{ color: "hsl(var(--hero-band-fg))" }}
                >
                  {tarefasN} tarefa{tarefasN === 1 ? "" : "s"}
                </span>{" "}
                e{" "}
                <span
                  className="font-sans tabular-nums font-bold"
                  style={{ color: "hsl(var(--hero-band-fg))" }}
                >
                  {alertasN} alerta{alertasN === 1 ? "" : "s"}
                </span>{" "}
                aguardando você.
              </p>
              <motion.p
                key={reflexao}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="text-[14px] italic mt-2 max-w-2xl"
                style={{ color: "hsl(var(--hero-band-fg) / 0.78)" }}
              >
                {reflexao}
              </motion.p>
            </div>
          </div>


            {/* Campo da Mafe — field elevado com brilho no foco */}
            <form
              onSubmit={send}
              className="relative flex items-end gap-2 max-w-3xl"
            >
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
                <motion.button
                  type="button"
                  onClick={toggleRec}
                  whileTap={{ scale: 0.92 }}
                  animate={recording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={recording ? { repeat: Infinity, duration: 1.4 } : { duration: 0.15 }}
                  className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {recording ? <Square className="w-4.5 h-4.5" /> : <Mic className="w-[18px] h-[18px]" />}
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={!input.trim()}
                  whileTap={{ scale: 0.92 }}
                  className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <Send className="w-[18px] h-[18px]" />
                </motion.button>
              </motion.div>
            </form>
          </div>
        </motion.section>

        {/* ── Faixa 2 — Retomada rápida ────────────────────── */}
        <RetomadaRapida />

        {/* Barra do launcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="type-label">Painel do dia</span>
            <span aria-hidden className="h-px w-16 bg-border/70" />
          </div>
          <AreasLauncher />
        </div>

        {/* ── Faixa 3 — Núcleo de trabalho (62/38) ─────────── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
          }}
          className="grid gap-5 lg:grid-cols-[62%_38%] xl:grid-cols-[63%_37%]"
        >
          {/* Coluna principal — Suas tarefas */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
            }}
          >
            <MinhasTarefas />
          </motion.div>

          {/* Coluna direita — empilhada */}
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

        {/* ── Faixa 4 — Lembretes ──────────────────────────── */}
        <Lembretes />

      </div>
    </AppLayout>
  );
}
