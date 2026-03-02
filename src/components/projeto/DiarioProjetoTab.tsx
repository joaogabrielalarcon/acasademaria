import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, isSameDay, isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Plus,
  FileText,
  Users,
  User,
  Package,
  Briefcase,
  Image as ImageIcon,
  Check,
  X,
  Clock,
  MessageSquare,
  AlertTriangle,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DiarioProjetoTabProps {
  projetoId: string;
  clienteId: string;
}

interface Registro {
  id: string;
  data_servico: string;
  tipo: string;
  status: string;
  descricao: string;
  trecho_nome: string | null;
  equipe_nomes: string[];
  executores_nomes: string[];
  solicitante: string | null;
  prioridade: string | null;
  status_solicitacao: string | null;
  proposta?: { codigo: string; titulo: string } | null;
}

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  manutencao: "Manutenção",
  implantação: "Implantação",
  implantacao: "Implantação",
  recebimento_materiais: "Recebimento de Materiais",
  recebimento: "Recebimento",
  visita_tecnica: "Visita Técnica",
  reuniao: "Reunião",
  solicitacao: "Solicitação",
  outro: "Outro",
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  realizado: {
    label: "Realizado",
    className: "bg-green-500/20 text-green-700 dark:text-green-300",
    icon: <Check className="w-3 h-3" />,
  },
  agendado: {
    label: "Agendado",
    className: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    icon: <Clock className="w-3 h-3" />,
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-500/20 text-red-700 dark:text-red-300",
    icon: <X className="w-3 h-3" />,
  },
};

export function DiarioProjetoTab({ projetoId, clienteId }: DiarioProjetoTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const today = startOfDay(new Date());

  // Fetch registros linked to this project
  const { data: rawRegistros = [], isLoading } = useQuery({
    queryKey: ["registros-projeto", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros")
        .select("id, data_servico, tipo, status, descricao, solicitante, prioridade, status_solicitacao, trecho_id, equipe_presente_ids, executores_ids, proposta_id")
        .eq("projeto_id", projetoId)
        .order("data_servico", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch colaboradores for names
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-basico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colaboradores_basico").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch trechos
  const { data: trechos = [] } = useQuery({
    queryKey: ["trechos", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trechos").select("id, nome").eq("cliente_id", clienteId);
      if (error) throw error;
      return data;
    },
  });

  const colabMap = new Map(colaboradores.map((c) => [c.id, c.nome]));
  const trechoMap = new Map(trechos.map((t) => [t.id, t.nome]));

  // Process registros
  const registros: Registro[] = useMemo(() => {
    return rawRegistros.map((r: any) => {
      const registroDate = parseISO(r.data_servico);
      const inferredStatus = r.status || (isAfter(registroDate, today) ? "agendado" : "realizado");
      return {
        id: r.id,
        data_servico: r.data_servico,
        tipo: r.tipo,
        status: inferredStatus,
        descricao: r.descricao,
        trecho_nome: r.trecho_id ? trechoMap.get(r.trecho_id) || null : null,
        equipe_nomes: (r.equipe_presente_ids || []).map((id: string) => colabMap.get(id)).filter(Boolean),
        executores_nomes: (r.executores_ids || []).map((id: string) => colabMap.get(id)).filter(Boolean),
        solicitante: r.solicitante,
        prioridade: r.prioridade,
        status_solicitacao: r.status_solicitacao,
      };
    });
  }, [rawRegistros, colabMap, trechoMap, today]);

  // Group by date
  const registrosPorData = useMemo(() => {
    const map = new Map<string, Registro[]>();
    registros.forEach((r) => {
      const existing = map.get(r.data_servico) || [];
      existing.push(r);
      map.set(r.data_servico, existing);
    });
    return map;
  }, [registros]);

  const registrosDoDia = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return registrosPorData.get(key) || [];
  }, [selectedDate, registrosPorData]);

  const datasComAtividade = useMemo(() => {
    const realizados: Date[] = [];
    const agendados: Date[] = [];
    registrosPorData.forEach((regs, dateStr) => {
      const date = parseISO(dateStr);
      if (regs.some((r) => r.status === "agendado")) agendados.push(date);
      if (regs.some((r) => r.status === "realizado")) realizados.push(date);
    });
    return { realizados, agendados };
  }, [registrosPorData]);

  const contadoresMes = useMemo(() => {
    let realizados = 0;
    let agendados = 0;
    registrosPorData.forEach((regs, dateStr) => {
      const date = parseISO(dateStr);
      if (isSameMonth(date, currentMonth)) {
        regs.forEach((r) => {
          if (r.status === "realizado") realizados++;
          if (r.status === "agendado") agendados++;
        });
      }
    });
    return { realizados, agendados };
  }, [registrosPorData, currentMonth]);

  const getDateIndicators = (date: Date) => ({
    hasRealizado: datasComAtividade.realizados.some((d) => isSameDay(d, date)),
    hasAgendado: datasComAtividade.agendados.some((d) => isSameDay(d, date)),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo do mês */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            {contadoresMes.realizados} realizado{contadoresMes.realizados !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">
            {contadoresMes.agendados} agendado{contadoresMes.agendados !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="card-botanical p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          locale={ptBR}
          modifiers={{ realizado: datasComAtividade.realizados, agendado: datasComAtividade.agendados }}
          modifiersClassNames={{ realizado: "", agendado: "" }}
          className="pointer-events-auto"
          components={{
            DayContent: ({ date }) => {
              const { hasRealizado, hasAgendado } = getDateIndicators(date);
              return (
                <div className="relative flex flex-col items-center">
                  <span>{date.getDate()}</span>
                  {(hasRealizado || hasAgendado) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasRealizado && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {hasAgendado && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      {/* Day detail */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/registros/novo?cliente=${clienteId}&projeto=${projetoId}&data=${format(selectedDate, "yyyy-MM-dd")}`}>
                <Plus className="w-4 h-4" />
                {isAfter(startOfDay(selectedDate), today) ? "Agendar" : "Registrar"}
              </Link>
            </Button>
          </div>

          {registrosDoDia.length === 0 ? (
            <div className="card-botanical p-6 text-center">
              <p className="text-muted-foreground mb-3">Nenhum registro neste dia</p>
              <Button variant="terracota" size="sm" asChild>
                <Link to={`/registros/novo?cliente=${clienteId}&projeto=${projetoId}&data=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Plus className="w-4 h-4" />
                  {isAfter(startOfDay(selectedDate), today) ? "Agendar Serviço" : "Adicionar Registro"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {registrosDoDia.map((registro) => {
                const st = statusConfig[registro.status] || statusConfig.realizado;
                const isSolicitacao = registro.tipo === "solicitacao";

                return (
                  <Link key={registro.id} to={`/registros/${registro.id}`} className="block">
                    <article className="card-botanical p-4 animate-fade-in hover:shadow-card transition-all">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className={cn("gap-1", st.className)}>
                          {st.icon}
                          {st.label}
                        </Badge>
                        <span className={cn("tag-primary text-xs", isSolicitacao && "bg-blue-500/10 text-blue-700 dark:text-blue-300")}>
                          {tipoLabels[registro.tipo] || registro.tipo}
                        </span>
                      </div>
                      {registro.trecho_nome && (
                        <p className="text-sm font-medium text-foreground mb-1">{registro.trecho_nome}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{registro.descricao}</p>
                      {!isSolicitacao && registro.equipe_nomes.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>{registro.equipe_nomes.join(", ")}</span>
                        </div>
                      )}
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
