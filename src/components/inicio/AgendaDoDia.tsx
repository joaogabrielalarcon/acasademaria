import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  addDays,
  eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type Modo = "semana" | "mes";

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

  const { data: eventos = [] } = useQuery({
    queryKey: ["agenda-inicio", modo, intervalo.ini.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendario_eventos")
        .select("id, titulo, data, tipo")
        .gte("data", intervalo.ini.toISOString().slice(0, 10))
        .lte("data", intervalo.fim.toISOString().slice(0, 10))
        .order("data", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  const hojeEventos = eventos.filter((e) => isSameDay(parseISO(e.data), hoje));
  const dias = eachDayOfInterval({ start: intervalo.ini, end: intervalo.fim });

  return (
    <SurfaceCard padded>
      <SurfaceCardHeader
        label="Sua agenda"
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModo("semana")}
              className={cn(
                "text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors",
                modo === "semana"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-primary-soft"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setModo("mes")}
              className={cn(
                "text-[12px] px-2.5 py-1 rounded-md font-medium transition-colors",
                modo === "mes"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-primary-soft"
              )}
            >
              Mês
            </button>
          </div>
        }
      />

      {/* Faixa do período */}
      <div
        className={cn(
          "grid gap-1 mb-4",
          modo === "semana" ? "grid-cols-7" : "grid-cols-7 sm:grid-cols-7"
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
                "flex flex-col items-center gap-0.5 py-1.5 rounded-md",
                eHoje && "bg-primary text-primary-foreground",
                !eHoje && hasEvt && "bg-navy-soft text-accent"
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
      </div>

      {/* Eventos de hoje */}
      <div>
        <p className="type-label mb-2">Hoje · {format(hoje, "dd 'de' MMMM", { locale: ptBR })}</p>
        {hojeEventos.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span className="type-body">Sem compromissos marcados.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {hojeEventos.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-elevated"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="flex-1 text-[14px] text-foreground">{e.titulo}</span>
                {e.tipo && (
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {e.tipo}
                  </span>
                )}
              </li>
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
