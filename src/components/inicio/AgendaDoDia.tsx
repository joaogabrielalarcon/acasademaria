import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isSameDay,
  eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type Modo = "semana" | "mes";

type Evento = { id: string; titulo: string; data: string; tipo?: string | null; demo?: boolean };

export function AgendaDoDia() {
  const [modo, setModo] = useState<Modo>("semana");
  const hoje = new Date();

  const intervalo = useMemo(() => {
    if (modo === "semana") {
      return {
        ini: startOfWeek(hoje, { weekStartsOn: 1 }),
        fim: endOfWeek(hoje, { weekStartsOn: 1 }),
      };
    }
    return { ini: startOfMonth(hoje), fim: endOfMonth(hoje) };
  }, [modo]);

  const { data: eventosReais = [] } = useQuery({
    queryKey: ["agenda-inicio", modo, intervalo.ini.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("calendario_eventos")
        .select("id, titulo, data, tipo")
        .gte("data", intervalo.ini.toISOString().slice(0, 10))
        .lte("data", intervalo.fim.toISOString().slice(0, 10))
        .order("data", { ascending: true });
      return (data as Evento[]) || [];
    },
  });

  const hojeIso = hoje.toISOString().slice(0, 10);
  const DEMO: Evento[] = [
    { id: "demo-e1", titulo: "10h — Visita técnica Dario Guarita", data: hojeIso, tipo: "visita", demo: true },
    { id: "demo-e2", titulo: "15h — Reunião de alinhamento Juliana", data: hojeIso, tipo: "reunião", demo: true },
  ];

  const eventos: Evento[] =
    eventosReais.length > 0 ? eventosReais : DEMO;

  const hojeEventos = eventos.filter((e) => isSameDay(parseISO(e.data), hoje));
  const dias = eachDayOfInterval({ start: intervalo.ini, end: intervalo.fim });

  return (
    <SurfaceCard padded>
      <SurfaceCardHeader
        label="Sua agenda"
        action={
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-surface-sunken">
            <button
              onClick={() => setModo("semana")}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded font-medium transition-all",
                modo === "semana"
                  ? "bg-card text-foreground shadow-e1"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setModo("mes")}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded font-medium transition-all",
                modo === "mes"
                  ? "bg-card text-foreground shadow-e1"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mês
            </button>
          </div>
        }
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={modo}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "grid gap-1 mb-4",
            modo === "semana" ? "grid-cols-7" : "grid-cols-7",
          )}
        >
          {(modo === "semana" ? dias : dias.slice(0, 14)).map((d) => {
            const hasEvt = eventos.some((e) => isSameDay(parseISO(e.data), d));
            const eHoje = isSameDay(d, hoje);
            return (
              <motion.div
                key={d.toISOString()}
                whileHover={{ y: -1 }}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-colors",
                  eHoje && "bg-primary text-primary-foreground shadow-e1",
                  !eHoje && hasEvt && "bg-primary-soft text-primary",
                  !eHoje && !hasEvt && "hover:bg-surface-sunken",
                )}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  {format(d, "EEE", { locale: ptBR }).slice(0, 3)}
                </span>
                <span className="text-[13px] font-sans font-semibold tabular-nums">
                  {format(d, "d")}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div>
        <p className="type-label mb-2">
          Hoje · {format(hoje, "dd 'de' MMMM", { locale: ptBR })}
        </p>
        {hojeEventos.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span className="type-body">Sem compromissos marcados.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {hojeEventos.map((e, idx) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-sunken hover:bg-primary-soft transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="flex-1 text-[13.5px] text-foreground truncate">
                  {e.titulo}
                </span>
                {e.demo && (
                  <span className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] uppercase tracking-wider bg-card text-muted-foreground border border-border/50">
                    ex.
                  </span>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link to="/calendario">
            Abrir calendário <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </SurfaceCard>
  );
}
