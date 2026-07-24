import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { Chip } from "@/components/primitives/Chip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Demanda = {
  id: string;
  titulo: string;
  codigo: string | null;
  prazo_final: string | null;
  cliente_id: string | null;
  projeto_id: string | null;
  arquivada: boolean | null;
  status_saida: string | null;
  etapa_atual_id: string | null;
  notas: string | null;
  clientes?: { nome: string | null } | null;
  projetos?: { titulo: string | null } | null;
  etapa?: { nome: string | null } | null;
};

function useColaboradorId(userId?: string) {
  return useQuery({
    queryKey: ["colaborador-by-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function farolDoPrazo(prazo: string | null): { tone: "ok" | "warn" | "attention" | "danger"; label: string } {
  if (!prazo) return { tone: "ok", label: "Sem prazo" };
  const dias = differenceInCalendarDays(parseISO(prazo), new Date());
  if (dias < 0) return { tone: "danger", label: `Atrasada ${Math.abs(dias)}d` };
  if (dias === 0) return { tone: "attention", label: "Hoje" };
  if (dias <= 2) return { tone: "warn", label: `Em ${dias}d` };
  return { tone: "ok", label: `Em ${dias}d` };
}

export function MinhasTarefas() {
  const { user } = useAuth();
  const { data: colab } = useColaboradorId(user?.id);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["minhas-tarefas", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select(
          "id, codigo, titulo, prazo_final, cliente_id, projeto_id, arquivada, status_saida, etapa_atual_id, notas, clientes(nome), projetos(titulo)"
        )
        .eq("responsavel_atual_id", colab!.id)
        .eq("arquivada", false)
        .order("prazo_final", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as unknown as Demanda[]) || [];
    },
  });

  // Dependências para calcular % de evolução
  const { data: deps = [] } = useQuery({
    queryKey: ["deps", tarefas.map((t) => t.id).join(",")],
    enabled: tarefas.length > 0,
    queryFn: async () => {
      const ids = tarefas.map((t) => t.id);
      const { data, error } = await supabase
        .from("demanda_dependencias")
        .select("demanda_id, depende_de_id, dep:depende_de_id(arquivada)")
        .in("demanda_id", ids);
      if (error) throw error;
      return data as any[];
    },
  });

  const progressoPara = (id: string): number => {
    const linhas = deps.filter((d) => d.demanda_id === id);
    if (linhas.length === 0) return 25; // sem deps: iniciada
    const concluidas = linhas.filter((d) => d.dep?.arquivada).length;
    return Math.round((concluidas / linhas.length) * 100);
  };

  return (
    <SurfaceCard padded>
      <SurfaceCardHeader label="Suas tarefas" />
      {isLoading ? (
        <p className="type-body text-muted-foreground">Carregando…</p>
      ) : tarefas.length === 0 ? (
        <div className="flex items-center gap-3 py-6 text-muted-foreground">
          <Sprout className="w-5 h-5 text-sage" />
          <span className="type-body">Nada aguardando você agora.</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tarefas.map((t) => {
            const farol = farolDoPrazo(t.prazo_final);
            const pct = progressoPara(t.id);
            const isOpen = expanded === t.id;
            const vinculo = t.projetos?.titulo || t.clientes?.nome || "";
            return (
              <li key={t.id}>
                <motion.button
                  layout
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  className={cn(
                    "w-full text-left rounded-lg card-filete bg-surface-elevated hover:shadow-e2 transition-shadow px-4 py-3"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-foreground truncate">
                        {t.titulo}
                      </p>
                      {vinculo && (
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                          {vinculo}
                        </p>
                      )}
                    </div>
                    <Chip tone={farol.tone === "danger" ? "danger" : farol.tone === "attention" ? "attention" : farol.tone === "warn" ? "warn" : "ok"}>
                      {farol.label}
                    </Chip>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-[12px] font-sans tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                </motion.button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-3 mt-1 mb-1 px-4 py-3 rounded-lg bg-surface-sunken">
                        {t.codigo && (
                          <p className="text-[12px] type-label mb-1">{t.codigo}</p>
                        )}
                        {t.prazo_final && (
                          <p className="text-[13px] text-muted-foreground">
                            Prazo: {format(parseISO(t.prazo_final), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        )}
                        {t.notas && (
                          <p className="text-[13px] text-foreground mt-2 whitespace-pre-wrap">
                            {t.notas}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceCard>
  );
}
