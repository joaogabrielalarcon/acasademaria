import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Square } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import mafeAvatar from "@/assets/flora-avatar.webp";
import { AreasLauncher } from "@/components/inicio/AreasLauncher";
import { MinhasTarefas } from "@/components/inicio/MinhasTarefas";
import { AlertasProativos } from "@/components/inicio/AlertasProativos";
import { AgendaDoDia } from "@/components/inicio/AgendaDoDia";
import { AtalhosFixados } from "@/components/inicio/AtalhosFixados";

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

export default function MeuDia() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const primeiroNome =
    profile?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Você";
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
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
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      <div className="flex flex-col gap-6 py-4">
        {/* Faixa-herói de marca — cuidado primeiro */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          className="hero-band flex flex-col sm:flex-row items-start gap-6"
        >
          <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden shadow-e2 shrink-0 ring-1 ring-white/10">
            <img
              src={mafeAvatar}
              alt="Mafe"
              className="w-full h-full object-cover scale-[1.15]"
              style={{ objectPosition: "50% 20%" }}
              loading="eager"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="type-label">Meu Dia</span>
            <h1 className="type-h1 mt-1 mb-2">
              {saudacao()}, {primeiroNome}.
            </h1>
            <motion.p
              key={reflexao}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="type-body opacity-90 italic mb-4 max-w-2xl"
            >
              {reflexao}
            </motion.p>

            <form onSubmit={send} className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Pergunte algo à Mafe..."
                rows={1}
                className="flex-1 resize-none rounded-lg bg-white/10 backdrop-blur px-4 py-3 text-[15px] text-[color:var(--hero-band-fg)] placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/10"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleRec}
                className="rounded-lg h-11 w-11 shrink-0 text-[color:var(--hero-band-fg)] hover:bg-white/10"
              >
                {recording ? (
                  <Square className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!input.trim()}
                className="rounded-lg h-11 w-11 shrink-0 text-[color:var(--hero-band-fg)] hover:bg-white/10"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </motion.section>

        {/* Barra do launcher */}
        <div className="flex items-center justify-between">
          <span className="type-label">Painel do dia</span>
          <AreasLauncher />
        </div>

        {/* Grid principal */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
          }}
          className="grid gap-5 lg:grid-cols-3"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
            }}
            className="lg:col-span-2"
          >
            <MinhasTarefas />
          </motion.div>

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
            className="lg:col-span-2"
          >
            <AgendaDoDia />
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
            }}
          >
            <AtalhosFixados />
          </motion.div>
        </motion.div>

        {/* Placeholder Lembretes/Stickers (Passo 2) */}
        <div className="rounded-lg border border-dashed border-border/60 px-5 py-4 text-center text-muted-foreground text-[13px]">
          Lembretes e stickers virão em breve.
        </div>
      </div>
    </AppLayout>
  );
}
