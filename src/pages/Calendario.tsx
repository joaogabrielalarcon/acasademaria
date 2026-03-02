import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, Gift, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventoCalendario {
  data: string; // MM-DD format for recurrence
  dataOriginal: string; // full date
  descricao: string;
  clienteNome: string;
  clienteId: string;
  tipo: "aniversario" | "data_importante";
}

export default function Calendario() {
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes-calendario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, status, proprietarios, funcionarios_casa, assessores, datas_importantes")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
  const [mesAtual, setMesAtual] = useState(new Date());

  // Consolidate all important dates from all active clients
  const eventos = useMemo(() => {
    const result: EventoCalendario[] = [];

    clientes
      .forEach((cliente: any) => {
        // Birthdays from proprietários
        if (cliente.proprietarios?.length) {
          cliente.proprietarios.forEach((p: any) => {
            if (p.dataNascimento) {
              result.push({
                data: p.dataNascimento.substring(5), // MM-DD
                dataOriginal: p.dataNascimento,
                descricao: `🎂 Aniversário de ${p.nome} (Proprietário)`,
                clienteNome: cliente.nome,
                clienteId: cliente.id,
                tipo: "aniversario",
              });
            }
          });
        }

        // Birthdays from funcionários
        if (cliente.funcionarios_casa?.length) {
          cliente.funcionarios_casa.forEach((f: any) => {
            if (f.dataNascimento) {
              result.push({
                data: f.dataNascimento.substring(5),
                dataOriginal: f.dataNascimento,
                descricao: `🎂 Aniversário de ${f.nome} (Funcionário)`,
                clienteNome: cliente.nome,
                clienteId: cliente.id,
                tipo: "aniversario",
              });
            }
          });
        }

        // Birthdays from assessores
        if (cliente.assessores?.length) {
          cliente.assessores.forEach((a: any) => {
            if (a.dataNascimento) {
              result.push({
                data: a.dataNascimento.substring(5),
                dataOriginal: a.dataNascimento,
                descricao: `🎂 Aniversário de ${a.nome} (Assessor)`,
                clienteNome: cliente.nome,
                clienteId: cliente.id,
                tipo: "aniversario",
              });
            }
          });
        }

        // Other important dates
        if (cliente.datas_importantes?.length) {
          cliente.datas_importantes.forEach((d: any) => {
            if (d.data && !d.descricao?.startsWith("Aniversário - ")) {
              result.push({
                data: d.data.substring(5),
                dataOriginal: d.data,
                descricao: d.descricao || "Data importante",
                clienteNome: cliente.nome,
                clienteId: cliente.id,
                tipo: "data_importante",
              });
            }
          });
        }
      });

    return result;
  }, [clientes]);

  // Filter events for the current month view
  const eventosMes = useMemo(() => {
    const mesStr = format(mesAtual, "MM");
    return eventos
      .filter((e) => e.data.startsWith(mesStr + "-"))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos, mesAtual]);

  // Get upcoming events (next 30 days from today)
  const proximosEventos = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    
    return eventos
      .map((e) => {
        // Create date in current year for comparison
        const dateThisYear = new Date(`${anoAtual}-${e.data}T12:00:00`);
        const diffDays = Math.ceil((dateThisYear.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check next year too
        const dateNextYear = new Date(`${anoAtual + 1}-${e.data}T12:00:00`);
        const diffDaysNext = Math.ceil((dateNextYear.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        const finalDiff = diffDays >= 0 && diffDays <= 30 ? diffDays : 
                          diffDaysNext >= 0 && diffDaysNext <= 30 ? diffDaysNext : -1;
        
        return { ...e, diasRestantes: finalDiff };
      })
      .filter((e) => e.diasRestantes >= 0)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [eventos]);

  // Generate calendar grid
  const diasDoMes = useMemo(() => {
    const year = mesAtual.getFullYear();
    const month = mesAtual.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    
    const days: { day: number; eventos: EventoCalendario[] }[] = [];
    
    // Pad start
    for (let i = 0; i < startPad; i++) {
      days.push({ day: 0, eventos: [] });
    }
    
    const mesStr = format(mesAtual, "MM");
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dayStr = d.toString().padStart(2, "0");
      const key = `${mesStr}-${dayStr}`;
      const dayEvents = eventos.filter((e) => e.data === key);
      days.push({ day: d, eventos: dayEvents });
    }
    
    return days;
  }, [mesAtual, eventos]);

  const hoje = new Date();
  const isHoje = (day: number) => {
    return day === hoje.getDate() && 
           mesAtual.getMonth() === hoje.getMonth() && 
           mesAtual.getFullYear() === hoje.getFullYear();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar className="w-7 h-7 text-primary" />
            Calendário da Empresa
          </h1>
          <p className="text-muted-foreground mt-1">
            Datas importantes de todos os clientes ativos
          </p>
        </div>

        {/* Próximos eventos */}
        {proximosEventos.length > 0 && (
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Próximas Datas (30 dias)
            </h2>
            <div className="space-y-2">
              {proximosEventos.slice(0, 10).map((e, i) => (
                <Link
                  key={i}
                  to={`/clientes/${e.clienteId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.descricao}</p>
                    <p className="text-xs text-muted-foreground">{e.clienteNome}</p>
                  </div>
                  <Badge variant="outline" className={
                    e.diasRestantes === 0 
                      ? "bg-primary/20 text-primary border-primary/30" 
                      : e.diasRestantes <= 7 
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30" 
                        : ""
                  }>
                    {e.diasRestantes === 0 ? "Hoje!" : `em ${e.diasRestantes} dia${e.diasRestantes > 1 ? "s" : ""}`}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Calendar Grid */}
        <section className="card-botanical p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon-sm" onClick={() => setMesAtual(subMonths(mesAtual, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="font-display text-lg font-semibold text-foreground capitalize">
              {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={() => setMesAtual(addMonths(mesAtual, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {diasDoMes.map((d, i) => (
              <div
                key={i}
                className={`min-h-[60px] lg:min-h-[80px] p-1 rounded-lg text-sm ${
                  d.day === 0
                    ? ""
                    : isHoje(d.day)
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                {d.day > 0 && (
                  <>
                    <span className={`text-xs font-medium ${isHoje(d.day) ? "text-primary" : "text-foreground"}`}>
                      {d.day}
                    </span>
                    {d.eventos.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {d.eventos.slice(0, 2).map((ev, j) => (
                          <Link
                            key={j}
                            to={`/clientes/${ev.clienteId}`}
                            className="block text-[10px] leading-tight truncate px-1 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                            title={`${ev.descricao} — ${ev.clienteNome}`}
                          >
                            {ev.tipo === "aniversario" ? "🎂" : "📌"} {ev.descricao.replace(/🎂 |📌 /, "").split("(")[0].trim()}
                          </Link>
                        ))}
                        {d.eventos.length > 2 && (
                          <span className="text-[10px] text-muted-foreground px-1">+{d.eventos.length - 2}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Events list for current month */}
        {eventosMes.length > 0 && (
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Eventos de {format(mesAtual, "MMMM", { locale: ptBR })}
            </h2>
            <div className="space-y-2">
              {eventosMes.map((e, i) => (
                <Link
                  key={i}
                  to={`/clientes/${e.clienteId}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium text-primary whitespace-nowrap">
                    {e.data.split("-")[1]}/{e.data.split("-")[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.descricao}</p>
                    <p className="text-xs text-muted-foreground">{e.clienteNome}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {eventos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma data importante cadastrada ainda.</p>
            <p className="text-sm mt-1">Adicione datas de nascimento nos cadastros dos clientes.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
