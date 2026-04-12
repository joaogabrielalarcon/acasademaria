import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, Gift, Loader2, Plus, Trash2, Flag, MapPin, Building2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getFeriados, type Feriado } from "@/lib/feriados";
import { useAuth, useUserRoles } from "@/hooks/useAuth";

interface EventoCalendario {
  data: string; // MM-DD
  dataOriginal: string;
  descricao: string;
  clienteNome: string;
  clienteId: string;
  tipo: "aniversario" | "aniversario_colaborador" | "data_importante" | "evento_manual" | "feriado_nacional" | "feriado_estadual" | "feriado_municipal";
  eventoId?: string; // for manual events (deletable)
}

export default function Calendario() {
  const { user } = useAuth();
  const { data: roles = [] } = useUserRoles(user?.id);
  const queryClient = useQueryClient();
  const canManage = roles.some(r => r.role === "admin" || r.role === "administrativo" || r.role === "gestao_campo");

  const [mesAtual, setMesAtual] = useState(new Date());
  const [novoEvento, setNovoEvento] = useState({ titulo: "", descricao: "", data: "", recorrente: false });
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
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

  const { data: colaboradores = [], isLoading: loadingColaboradores } = useQuery({
    queryKey: ["colaboradores-calendario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, data_nascimento, ativo, cargo, area_id")
        .not("data_nascimento", "is", null)
        .eq("ativo", true)
        .order("nome");
      if (error) {
        if (error.code === "42501") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: eventosManuals = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["calendario-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendario_eventos")
        .select("*")
        .order("data");
      if (error) throw error;
      return data;
    },
  });

  const addEvento = useMutation({
    mutationFn: async (evt: typeof novoEvento) => {
      const { error } = await supabase.from("calendario_eventos").insert({
        titulo: evt.titulo,
        descricao: evt.descricao || null,
        data: evt.data,
        recorrente: evt.recorrente,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendario-eventos"] });
      setNovoEvento({ titulo: "", descricao: "", data: "", recorrente: false });
      setDialogOpen(false);
      toast.success("Evento adicionado ao calendário");
    },
    onError: () => toast.error("Erro ao adicionar evento"),
  });

  const deleteEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendario_eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendario-eventos"] });
      toast.success("Evento removido");
    },
    onError: () => toast.error("Erro ao remover evento"),
  });

  const isLoading = loadingClientes || loadingEventos || loadingColaboradores;

  // Build all events
  const eventos = useMemo(() => {
    const result: EventoCalendario[] = [];
    const anoAtual = mesAtual.getFullYear();

    // Client birthdays and important dates
    clientes.forEach((cliente: any) => {
      const addBirthdays = (arr: any[], label: string) => {
        arr?.forEach((p: any) => {
          if (p.dataNascimento) {
            result.push({
              data: p.dataNascimento.substring(5),
              dataOriginal: p.dataNascimento,
              descricao: `🎂 Aniversário de ${p.nome} (${label})`,
              clienteNome: cliente.nome,
              clienteId: cliente.id,
              tipo: "aniversario",
            });
          }
        });
      };
      addBirthdays(cliente.proprietarios, "Proprietário");
      addBirthdays(cliente.funcionarios_casa, "Funcionário");
      addBirthdays(cliente.assessores, "Assessor");

      cliente.datas_importantes?.forEach((d: any) => {
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
    });

    // Colaboradores birthdays
    colaboradores.forEach((col: any) => {
      if (col.data_nascimento) {
        result.push({
          data: col.data_nascimento.substring(5), // MM-DD
          dataOriginal: col.data_nascimento,
          descricao: `🎂 Aniversário de ${col.nome}${col.cargo ? ` (${col.cargo})` : ""}`,
          clienteNome: "Equipe",
          clienteId: "",
          tipo: "aniversario_colaborador",
        });
      }
    });

    // Manual events
    eventosManuals.forEach((evt: any) => {
      const mmdd = evt.recorrente
        ? evt.data.substring(5)
        : evt.data.substring(5);
      result.push({
        data: mmdd,
        dataOriginal: evt.data,
        descricao: `📋 ${evt.titulo}`,
        clienteNome: evt.descricao || "Evento da empresa",
        clienteId: "",
        tipo: "evento_manual",
        eventoId: evt.id,
      });
    });

    // Feriados
    const feriados = getFeriados(anoAtual);
    feriados.forEach((f: Feriado) => {
      const tipoMap = { nacional: "feriado_nacional", estadual: "feriado_estadual", municipal: "feriado_municipal" } as const;
      result.push({
        data: f.data,
        dataOriginal: `${anoAtual}-${f.data}`,
        descricao: f.nome,
        clienteNome: f.tipo === "nacional" ? "Feriado Nacional" : f.tipo === "estadual" ? "Feriado Estadual (SP)" : "Feriado Municipal (Jarinu)",
        clienteId: "",
        tipo: tipoMap[f.tipo],
      });
    });

    return result;
  }, [clientes, colaboradores, eventosManuals, mesAtual]);

  // Filter for current month
  const eventosMes = useMemo(() => {
    const mesStr = format(mesAtual, "MM");
    return eventos
      .filter((e) => e.data.startsWith(mesStr + "-"))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos, mesAtual]);

  // Next 30 days
  const proximosEventos = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();

    return eventos
      .map((e) => {
        const dateThisYear = new Date(`${anoAtual}-${e.data}T12:00:00`);
        const diffDays = Math.ceil((dateThisYear.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const dateNextYear = new Date(`${anoAtual + 1}-${e.data}T12:00:00`);
        const diffDaysNext = Math.ceil((dateNextYear.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const finalDiff = diffDays >= 0 && diffDays <= 30 ? diffDays : diffDaysNext >= 0 && diffDaysNext <= 30 ? diffDaysNext : -1;
        return { ...e, diasRestantes: finalDiff };
      })
      .filter((e) => e.diasRestantes >= 0)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [eventos]);

  // Calendar grid
  const diasDoMes = useMemo(() => {
    const year = mesAtual.getFullYear();
    const month = mesAtual.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { day: number; eventos: EventoCalendario[] }[] = [];
    for (let i = 0; i < startPad; i++) days.push({ day: 0, eventos: [] });
    const mesStr = format(mesAtual, "MM");
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dayStr = d.toString().padStart(2, "0");
      const key = `${mesStr}-${dayStr}`;
      days.push({ day: d, eventos: eventos.filter((e) => e.data === key) });
    }
    return days;
  }, [mesAtual, eventos]);

  const hoje = new Date();
  const isHoje = (day: number) =>
    day === hoje.getDate() && mesAtual.getMonth() === hoje.getMonth() && mesAtual.getFullYear() === hoje.getFullYear();

  const getEventIcon = (tipo: string) => {
    if (tipo === "aniversario" || tipo === "aniversario_colaborador") return "🎂";
    if (tipo === "data_importante") return "📌";
    if (tipo === "evento_manual") return "📋";
    if (tipo === "feriado_nacional") return "🇧🇷";
    if (tipo === "feriado_estadual") return "🏛️";
    if (tipo === "feriado_municipal") return "📍";
    return "📌";
  };

  const getEventColor = (tipo: string) => {
    if (tipo.startsWith("feriado")) return "bg-destructive/10 text-destructive";
    if (tipo === "evento_manual") return "bg-accent/50 text-accent-foreground";
    if (tipo === "aniversario_colaborador") return "bg-secondary text-secondary-foreground";
    return "bg-primary/15 text-primary";
  };

  const getBadgeForTipo = (tipo: string) => {
    if (tipo === "feriado_nacional") return <Badge variant="outline" className="text-[10px] px-1 py-0 border-destructive/30 text-destructive"><Flag className="w-3 h-3 mr-0.5 inline" />Nacional</Badge>;
    if (tipo === "feriado_estadual") return <Badge variant="outline" className="text-[10px] px-1 py-0 border-destructive/30 text-destructive"><Building2 className="w-3 h-3 mr-0.5 inline" />SP</Badge>;
    if (tipo === "feriado_municipal") return <Badge variant="outline" className="text-[10px] px-1 py-0 border-destructive/30 text-destructive"><MapPin className="w-3 h-3 mr-0.5 inline" />Jarinu</Badge>;
    if (tipo === "evento_manual") return <Badge variant="outline" className="text-[10px] px-1 py-0">Evento</Badge>;
    return null;
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <Calendar className="w-7 h-7 text-primary" />
              Calendário da Empresa
            </h1>
            <p className="text-muted-foreground mt-1">
              Datas importantes, feriados e eventos da empresa
            </p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Evento ao Calendário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input
                      value={novoEvento.titulo}
                      onChange={(e) => setNovoEvento((p) => ({ ...p, titulo: e.target.value }))}
                      placeholder="Ex: Reunião de planejamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={novoEvento.data}
                      onChange={(e) => setNovoEvento((p) => ({ ...p, data: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={novoEvento.descricao}
                      onChange={(e) => setNovoEvento((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Detalhes do evento (opcional)"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={novoEvento.recorrente}
                      onCheckedChange={(v) => setNovoEvento((p) => ({ ...p, recorrente: v }))}
                    />
                    <Label>Repetir todo ano</Label>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </DialogClose>
                  <Button
                    onClick={() => addEvento.mutate(novoEvento)}
                    disabled={!novoEvento.titulo || !novoEvento.data || addEvento.isPending}
                  >
                    {addEvento.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Upcoming events */}
        {proximosEventos.length > 0 && (
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Próximas Datas (30 dias)
            </h2>
            <div className="space-y-2">
              {proximosEventos.slice(0, 12).map((e, i) => {
                const isLink = !!e.clienteId;
                const content = (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-base">{getEventIcon(e.tipo)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {e.descricao.replace(/^🎂 |^📌 |^📋 /, "")}
                        </p>
                        <p className="text-xs text-muted-foreground">{e.clienteNome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getBadgeForTipo(e.tipo)}
                      <Badge
                        variant="outline"
                        className={
                          e.diasRestantes === 0
                            ? "bg-primary/20 text-primary border-primary/30"
                            : e.diasRestantes <= 7
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : ""
                        }
                      >
                        {e.diasRestantes === 0 ? "Hoje!" : `em ${e.diasRestantes} dia${e.diasRestantes > 1 ? "s" : ""}`}
                      </Badge>
                    </div>
                  </div>
                );
                return isLink ? (
                  <Link key={i} to={`/clientes/${e.clienteId}`}>{content}</Link>
                ) : (
                  <div key={i}>{content}</div>
                );
              })}
            </div>
          </section>
        )}

        {/* Calendar Grid */}
        <section className="card-botanical p-5">
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

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {diasDoMes.map((d, i) => (
              <div
                key={i}
                className={`min-h-[60px] lg:min-h-[80px] p-1 rounded-lg text-sm ${
                  d.day === 0
                    ? ""
                    : isHoje(d.day)
                    ? "bg-primary/10 border border-primary/30"
                    : d.eventos.some((e) => e.tipo.startsWith("feriado"))
                    ? "bg-destructive/5 border border-destructive/15"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                {d.day > 0 && (
                  <>
                    <span className={`text-xs font-medium ${isHoje(d.day) ? "text-primary" : d.eventos.some((e) => e.tipo.startsWith("feriado")) ? "text-destructive" : "text-foreground"}`}>
                      {d.day}
                    </span>
                    {d.eventos.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {d.eventos.slice(0, 2).map((ev, j) => {
                          const label = ev.descricao.replace(/^🎂 |^📌 |^📋 /, "").split("(")[0].trim();
                          const colorClass = getEventColor(ev.tipo);
                          return ev.clienteId ? (
                            <Link
                              key={j}
                              to={`/clientes/${ev.clienteId}`}
                              className={`block text-[10px] leading-tight truncate px-1 py-0.5 rounded ${colorClass} hover:opacity-80 transition-colors`}
                              title={`${ev.descricao} — ${ev.clienteNome}`}
                            >
                              {getEventIcon(ev.tipo)} {label}
                            </Link>
                          ) : (
                            <span
                              key={j}
                              className={`block text-[10px] leading-tight truncate px-1 py-0.5 rounded ${colorClass}`}
                              title={`${ev.descricao} — ${ev.clienteNome}`}
                            >
                              {getEventIcon(ev.tipo)} {label}
                            </span>
                          );
                        })}
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
              {eventosMes.map((e, i) => {
                const isLink = !!e.clienteId;
                const row = (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <span className="text-sm font-medium text-primary whitespace-nowrap">
                      {e.data.split("-")[1]}/{e.data.split("-")[0]}
                    </span>
                    <span className="text-base">{getEventIcon(e.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.descricao.replace(/^🎂 |^📌 |^📋 /, "")}</p>
                      <p className="text-xs text-muted-foreground">{e.clienteNome}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getBadgeForTipo(e.tipo)}
                      {e.eventoId && canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            deleteEvento.mutate(e.eventoId!);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
                return isLink ? (
                  <Link key={i} to={`/clientes/${e.clienteId}`}>{row}</Link>
                ) : (
                  <div key={i}>{row}</div>
                );
              })}
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
