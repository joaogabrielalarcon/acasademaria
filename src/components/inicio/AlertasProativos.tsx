import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type Alerta = {
  id: string;
  icon: typeof AlertTriangle;
  tone: "danger" | "attention" | "warn";
  title: string;
  countdown: string;
  onClick?: () => void;
  demo?: boolean;
};

function inDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function contagemLabel(d: string): string {
  const dias = differenceInCalendarDays(parseISO(d), new Date());
  if (dias < 0) return `vencido há ${Math.abs(dias)}d`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "falta 1 dia";
  return `faltam ${dias} dias`;
}

export function AlertasProativos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const { data: colab } = useQuery({
    queryKey: ["colab-me-alertas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ["alertas-liberacoes", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const in15 = new Date();
      in15.setDate(in15.getDate() + 15);
      const { data } = await supabase
        .from("colaborador_liberacoes")
        .select("id, data_validade, condominios(nome)")
        .eq("colaborador_id", colab!.id)
        .lte("data_validade", in15.toISOString().slice(0, 10))
        .gte("data_validade", today.toISOString().slice(0, 10));
      return (data as any[]) || [];
    },
  });

  const { data: retornos = [] } = useQuery({
    queryKey: ["alertas-retornos", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const { data } = await supabase
        .from("projetos")
        .select("id, titulo, data_retorno_prometida, clientes(nome)")
        .eq("responsavel_id", colab!.id)
        .not("data_retorno_prometida", "is", null)
        .lte("data_retorno_prometida", in7.toISOString().slice(0, 10))
        .gte("data_retorno_prometida", today.toISOString().slice(0, 10));
      return (data as any[]) || [];
    },
  });

  const { data: prazos = [] } = useQuery({
    queryKey: ["alertas-prazos", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const in3 = new Date();
      in3.setDate(in3.getDate() + 3);
      const { data } = await supabase
        .from("demandas")
        .select("id, titulo, prazo_final")
        .eq("responsavel_atual_id", colab!.id)
        .eq("arquivada", false)
        .not("prazo_final", "is", null)
        .lte("prazo_final", in3.toISOString().slice(0, 10))
        .gte("prazo_final", today.toISOString().slice(0, 10));
      return (data as any[]) || [];
    },
  });

  const alertasReais: Alerta[] = [
    ...liberacoes.map((l) => {
      const dias = differenceInCalendarDays(parseISO(l.data_validade), today);
      return {
        id: "lib-" + l.id,
        icon: AlertTriangle,
        tone: (dias === 0 ? "danger" : "attention") as "danger" | "attention",
        title: `Liberação em ${l.condominios?.nome || "condomínio"}`,
        countdown: contagemLabel(l.data_validade),
        onClick: () => navigate("/equipe"),
      };
    }),
    ...retornos.map((p) => ({
      id: "ret-" + p.id,
      icon: Clock,
      tone: "warn" as const,
      title: `Retorno prometido: ${p.clientes?.nome || p.titulo}`,
      countdown: contagemLabel(p.data_retorno_prometida),
      onClick: () => navigate("/crm"),
    })),
    ...prazos.map((d) => ({
      id: "prz-" + d.id,
      icon: MessageCircle,
      tone: "attention" as const,
      title: `Prazo interno: ${d.titulo}`,
      countdown: contagemLabel(d.prazo_final),
      onClick: () => navigate("/agenda"),
    })),
  ];

  const DEMO: Alerta[] = [
    {
      id: "demo-a1",
      icon: AlertTriangle,
      tone: "attention",
      title: "Liberação Baroneza — Wellington",
      countdown: contagemLabel(inDias(3)),
      onClick: () => navigate("/equipe"),
      demo: true,
    },
    {
      id: "demo-a2",
      icon: Clock,
      tone: "warn",
      title: "Retorno prometido: Marcelo Lyrio",
      countdown: contagemLabel(inDias(1)),
      onClick: () => navigate("/crm"),
      demo: true,
    },
    {
      id: "demo-a3",
      icon: MessageCircle,
      tone: "danger",
      title: "Proposta parada há 5 dias: Bettina Gut",
      countdown: "5 dias sem retorno",
      onClick: () => navigate("/orcamentos"),
      demo: true,
    },
  ];

  const alertas = alertasReais.length > 0 ? alertasReais : DEMO;

  return (
    <SurfaceCard padded>
      <SurfaceCardHeader
        label="Precisa da sua atenção"
        action={
          <span className="text-[12px] font-sans tabular-nums text-muted-foreground">
            {alertas.length}
          </span>
        }
      />
      <div className="flex flex-col gap-2">
        {alertas.map((a, idx) => {
          const Icon = a.icon;
          const isDanger = a.tone === "danger";
          return (
            <motion.button
              key={a.id}
              type="button"
              onClick={a.onClick}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.22 }}
              whileHover={{ y: -1 }}
              className="flex items-center gap-3 rounded-lg bg-card border border-border/60 shadow-e1 hover:shadow-e2 px-3 py-2.5 text-left transition-shadow"
            >
              <motion.div
                animate={isDanger ? { scale: [1, 1.05, 1] } : undefined}
                transition={{ repeat: Infinity, duration: 2.2 }}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  a.tone === "danger" && "bg-danger-soft text-danger",
                  a.tone === "attention" && "bg-attention-soft text-attention",
                  a.tone === "warn" && "bg-warn-soft text-warn",
                )}
              >
                <Icon className="w-4 h-4" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-medium text-foreground truncate">
                    {a.title}
                  </p>
                  {a.demo && (
                    <span className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] uppercase tracking-wider bg-surface-sunken text-muted-foreground border border-border/50">
                      ex.
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-sans tabular-nums text-muted-foreground">
                  {a.countdown}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </SurfaceCard>
  );
}
