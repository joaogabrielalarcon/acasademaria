import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, isSameDay, isSameMonth, parseISO, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, FileText, Users, User, Package, Briefcase, Image as ImageIcon, Check, X, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Registro {
  id: string;
  data: string;
  tipo: string;
  trecho: string;
  status?: string;
  proposta?: { codigo: string; titulo: string } | null;
  equipePresente: string[];
  executores: string[];
  solicitante: string | null;
  descricao: string;
  insumos: { nome: string; quantidade: number; unidade: string }[];
}

interface CalendarioDiarioProps {
  registros: Registro[];
  clienteId: string;
}

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  manutencao: "Manutenção",
  implantação: "Implantação",
  implantacao: "Implantação",
  recebimento_materiais: "Recebimento de Materiais",
  visita_tecnica: "Visita Técnica",
  reuniao: "Reunião",
  outro: "Outro",
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  realizado: { 
    label: "Realizado", 
    className: "bg-green-500/20 text-green-700 dark:text-green-300",
    icon: <Check className="w-3 h-3" />
  },
  agendado: { 
    label: "Agendado", 
    className: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    icon: <Clock className="w-3 h-3" />
  },
  cancelado: { 
    label: "Cancelado", 
    className: "bg-red-500/20 text-red-700 dark:text-red-300",
    icon: <X className="w-3 h-3" />
  },
};

export function CalendarioDiario({ registros, clienteId }: CalendarioDiarioProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const today = startOfDay(new Date());
  
  // Processar registros por data
  const registrosPorData = useMemo(() => {
    const map = new Map<string, Registro[]>();
    registros.forEach(registro => {
      const dateKey = registro.data;
      const existing = map.get(dateKey) || [];
      // Determinar status baseado na data se não tiver status explícito
      const registroDate = parseISO(registro.data);
      const inferredStatus = registro.status || (isAfter(registroDate, today) ? 'agendado' : 'realizado');
      existing.push({ ...registro, status: inferredStatus });
      map.set(dateKey, existing);
    });
    return map;
  }, [registros, today]);
  
  // Registros do dia selecionado
  const registrosDoDia = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return registrosPorData.get(dateKey) || [];
  }, [selectedDate, registrosPorData]);
  
  // Datas com atividade para marcadores no calendário
  const datasComAtividade = useMemo(() => {
    const realizados: Date[] = [];
    const agendados: Date[] = [];
    
    registrosPorData.forEach((regs, dateStr) => {
      const date = parseISO(dateStr);
      const hasAgendado = regs.some(r => r.status === 'agendado');
      const hasRealizado = regs.some(r => r.status === 'realizado');
      
      if (hasAgendado) agendados.push(date);
      if (hasRealizado) realizados.push(date);
    });
    
    return { realizados, agendados };
  }, [registrosPorData]);
  
  // Contadores do mês
  const contadoresMes = useMemo(() => {
    let realizados = 0;
    let agendados = 0;
    
    registrosPorData.forEach((regs, dateStr) => {
      const date = parseISO(dateStr);
      if (isSameMonth(date, currentMonth)) {
        regs.forEach(r => {
          if (r.status === 'realizado') realizados++;
          if (r.status === 'agendado') agendados++;
        });
      }
    });
    
    return { realizados, agendados };
  }, [registrosPorData, currentMonth]);
  
  // Verificar se uma data tem atividade
  const getDateIndicators = (date: Date) => {
    const hasRealizado = datasComAtividade.realizados.some(d => isSameDay(d, date));
    const hasAgendado = datasComAtividade.agendados.some(d => isSameDay(d, date));
    return { hasRealizado, hasAgendado };
  };
  
  // Custom day render para mostrar indicadores
  const modifiers = {
    realizado: datasComAtividade.realizados,
    agendado: datasComAtividade.agendados,
  };
  
  const modifiersClassNames = {
    realizado: "",
    agendado: "",
  };
  
  return (
    <div className="space-y-6">
      {/* Resumo do mês */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-muted-foreground">
            {contadoresMes.realizados} realizado{contadoresMes.realizados !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-muted-foreground">
            {contadoresMes.agendados} agendado{contadoresMes.agendados !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {/* Calendário */}
      <div className="card-botanical p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          locale={ptBR}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="pointer-events-auto"
          components={{
            DayContent: ({ date }) => {
              const { hasRealizado, hasAgendado } = getDateIndicators(date);
              return (
                <div className="relative flex flex-col items-center">
                  <span>{date.getDate()}</span>
                  {(hasRealizado || hasAgendado) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasRealizado && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      )}
                      {hasAgendado && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </div>
      
      {/* Seção do dia selecionado */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/recebimentos/novo?cliente=${clienteId}&data=${format(selectedDate, 'yyyy-MM-dd')}`}>
                  <Package className="w-4 h-4" />
                  Recebimento
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/registros/novo?cliente=${clienteId}&data=${format(selectedDate, 'yyyy-MM-dd')}`}>
                  <Plus className="w-4 h-4" />
                  {isAfter(startOfDay(selectedDate), today) ? "Agendar" : "Registro"}
                </Link>
              </Button>
            </div>
          </div>
          
          {registrosDoDia.length === 0 ? (
            <div className="card-botanical p-6 text-center">
              <p className="text-muted-foreground mb-3">
                Nenhum registro neste dia
              </p>
              <Button variant="terracota" size="sm" asChild>
                <Link to={`/registros/novo?cliente=${clienteId}&data=${format(selectedDate, 'yyyy-MM-dd')}`}>
                  <Plus className="w-4 h-4" />
                  {isAfter(startOfDay(selectedDate), today) ? "Agendar Serviço" : "Adicionar Registro"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {registrosDoDia.map((registro) => {
                const statusInfo = statusConfig[registro.status || 'realizado'];
                return (
                  <Link 
                    key={registro.id} 
                    to={`/registros/${registro.id}`}
                    className="block"
                  >
                    <article className="card-botanical p-4 animate-fade-in hover:shadow-card transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Photo Placeholder */}
                        <div className="w-full sm:w-24 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("gap-1", statusInfo.className)}>
                                {statusInfo.icon}
                                {statusInfo.label}
                              </Badge>
                              <span className="tag-primary text-xs">
                                {tipoLabels[registro.tipo] || registro.tipo}
                              </span>
                              {registro.proposta && (
                                <Badge variant="outline" className="text-xs">
                                  {registro.proposta.codigo}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm font-medium text-foreground mb-1">
                            {registro.trecho}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {registro.descricao}
                          </p>

                          {/* Proposta */}
                          {registro.proposta && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span className="text-primary font-medium">
                                {registro.proposta.codigo} / {registro.proposta.titulo}
                              </span>
                            </div>
                          )}

                          {/* Equipe do Dia */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>Equipe: </span>
                            <span className="text-foreground">{registro.equipePresente.join(", ")}</span>
                          </div>

                          {/* Executores */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <User className="w-3.5 h-3.5" />
                            <span>Executores: </span>
                            <span className="text-foreground">{registro.executores.join(", ")}</span>
                          </div>

                          {/* Solicitante */}
                          {registro.solicitante && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Solicitante: </span>
                              <span className="text-foreground">{registro.solicitante}</span>
                            </div>
                          )}

                          {/* Insumos */}
                          {registro.insumos.length > 0 && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Package className="w-3.5 h-3.5 mt-0.5" />
                              <span className="text-foreground">
                                {registro.insumos.map(i => `${i.nome} (${i.quantidade} ${i.unidade})`).join(", ")}
                              </span>
                            </div>
                          )}
                          
                          {/* Ações para serviços agendados */}
                          {registro.status === 'agendado' && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                              <Button variant="success" size="sm" className="gap-1" onClick={(e) => e.preventDefault()}>
                                <Check className="w-3.5 h-3.5" />
                                Marcar Realizado
                              </Button>
                              <Button variant="outline" size="sm" onClick={(e) => e.preventDefault()}>
                                Editar
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => e.preventDefault()}>
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
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
