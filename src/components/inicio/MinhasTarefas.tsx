import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Filter,
  X,
  Sprout,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";

type SortMode = "urgencia" | "prioridade" | "status";

type Demanda = {
  id: string;
  titulo: string;
  codigo: string | null;
  prazo_final: string | null;
  cliente_id: string | null;
  projeto_id: string | null;
  arquivada: boolean | null;
  status_saida: string | null;
  notas: string | null;
  clientes?: { nome: string | null } | null;
  projetos?: { titulo: string | null } | null;
};

type TarefaView = {
  id: string;
  titulo: string;
  cliente?: string;
  projeto?: string;
  tipo?: string;
  prazo_final: string | null;
  pct: number;
  statusLabel: string;
  temNotas?: boolean;
  anexos?: number;
  demo?: boolean;
};

function inDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DEMO: TarefaView[] = [
  {
    id: "demo-1", titulo: "Enviar proposta revisada",
    cliente: "Dario Guarita", projeto: "Residência Alto de Pinheiros",
    tipo: "Proposta", prazo_final: inDias(1), pct: 60, statusLabel: "Em andamento",
    temNotas: true, anexos: 2, demo: true,
  },
  {
    id: "demo-2", titulo: "Aprovar orçamento",
    cliente: "Juliana Falconi", projeto: "Cobertura Jardins",
    tipo: "Orçamento", prazo_final: inDias(0), pct: 0, statusLabel: "Aguardando você",
    anexos: 1, demo: true,
  },
  {
    id: "demo-3", titulo: "Retornar contato",
    cliente: "Nina Ranieri", projeto: "Prospecção inicial",
    tipo: "Contato", prazo_final: inDias(-1), pct: 10, statusLabel: "A fazer",
    demo: true,
  },
  {
    id: "demo-4", titulo: "Revisar memorial descritivo",
    cliente: "Thais e Renato", projeto: "Casa de campo Cotia",
    tipo: "Projeto", prazo_final: inDias(4), pct: 30, statusLabel: "Em andamento",
    temNotas: true, demo: true,
  },
  {
    id: "demo-5", titulo: "Fechar escala da semana",
    cliente: "Time de campo", projeto: "Operação",
    tipo: "Operação", prazo_final: inDias(3), pct: 80, statusLabel: "Em andamento",
    demo: true,
  },
];

function useColaboradorId(userId?: string) {
  return useQuery({
    queryKey: ["colaborador-by-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores")
        .select("id, nome")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });
}

function farolDoPrazo(prazo: string | null): {
  tone: "ok" | "warn" | "attention" | "danger";
  label: string;
} {
  if (!prazo) return { tone: "ok", label: "Sem prazo" };
  const dias = differenceInCalendarDays(parseISO(prazo), new Date());
  if (dias < 0) return { tone: "danger", label: `Atrasada ${Math.abs(dias)}d` };
  if (dias === 0) return { tone: "attention", label: "Hoje" };
  if (dias === 1) return { tone: "warn", label: "Amanhã" };
  if (dias <= 3) return { tone: "warn", label: `Em ${dias}d` };
  return { tone: "ok", label: `Em ${dias}d` };
}

const SORT_LABELS: Record<SortMode, string> = {
  urgencia: "Prazo",
  prioridade: "Prioridade",
  status: "Status",
};

function FilterGroup({
  label, options, selected, onToggle,
}: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <label
              key={o}
              className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-surface-sunken cursor-pointer text-[13px]"
            >
              <Checkbox checked={on} onCheckedChange={() => onToggle(o)} />
              <span className="flex-1 truncate">{o}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function MinhasTarefas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: colab } = useColaboradorId(user?.id);
  const [sortMode, setSortMode] = useState<SortMode>("urgencia");
  const [selStatus, setSelStatus] = useState<string[]>([]);
  const [selCliente, setSelCliente] = useState<string[]>([]);
  const [selTipo, setSelTipo] = useState<string[]>([]);

  const { data: tarefasReais = [], isLoading } = useQuery({
    queryKey: ["minhas-tarefas", colab?.id],
    enabled: !!colab?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select(
          "id, codigo, titulo, prazo_final, cliente_id, projeto_id, arquivada, status_saida, notas, clientes(nome), projetos(titulo)",
        )
        .eq("responsavel_atual_id", colab!.id)
        .eq("arquivada", false)
        .order("prazo_final", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as unknown as Demanda[]) || [];
    },
  });

  const tarefasBase: TarefaView[] =
    tarefasReais.length > 0
      ? tarefasReais.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          cliente: t.clientes?.nome || undefined,
          projeto: t.projetos?.titulo || undefined,
          tipo: t.projetos?.titulo ? "Projeto" : "Cliente",
          prazo_final: t.prazo_final,
          pct: 25,
          statusLabel: "Em andamento",
          temNotas: !!t.notas,
        }))
      : DEMO;

  const optsStatus = useMemo(
    () => Array.from(new Set(tarefasBase.map((t) => t.statusLabel))).sort(),
    [tarefasBase],
  );
  const optsCliente = useMemo(
    () => Array.from(new Set(tarefasBase.map((t) => t.cliente).filter(Boolean) as string[])).sort(),
    [tarefasBase],
  );
  const optsTipo = useMemo(
    () => Array.from(new Set(tarefasBase.map((t) => t.tipo).filter(Boolean) as string[])).sort(),
    [tarefasBase],
  );

  const filtered = useMemo(() => tarefasBase.filter((t) => {
    if (selStatus.length && !selStatus.includes(t.statusLabel)) return false;
    if (selCliente.length && !(t.cliente && selCliente.includes(t.cliente))) return false;
    if (selTipo.length && !(t.tipo && selTipo.includes(t.tipo))) return false;
    return true;
  }), [tarefasBase, selStatus, selCliente, selTipo]);

  const tarefas = useMemo(() => {
    const arr = [...filtered];
    if (sortMode === "urgencia") {
      arr.sort((a, b) => {
        const da = a.prazo_final ? parseISO(a.prazo_final).getTime() : Infinity;
        const db = b.prazo_final ? parseISO(b.prazo_final).getTime() : Infinity;
        return da - db;
      });
    } else if (sortMode === "prioridade") {
      const weight = (t: TarefaView) => {
        const f = farolDoPrazo(t.prazo_final).tone;
        return f === "danger" ? 0 : f === "attention" ? 1 : f === "warn" ? 2 : 3;
      };
      arr.sort((a, b) => weight(a) - weight(b));
    } else {
      arr.sort((a, b) => a.statusLabel.localeCompare(b.statusLabel, "pt-BR"));
    }
    return arr;
  }, [filtered, sortMode]);

  const totalFilters = selStatus.length + selCliente.length + selTipo.length;
  const clearFilters = () => { setSelStatus([]); setSelCliente([]); setSelTipo([]); };
  const toggle = (setter: (v: string[]) => void, cur: string[], v: string) =>
    setter(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);

  const chips = [
    ...selStatus.map((v) => ({ label: v, onRemove: () => setSelStatus(selStatus.filter((x) => x !== v)) })),
    ...selCliente.map((v) => ({ label: v, onRemove: () => setSelCliente(selCliente.filter((x) => x !== v)) })),
    ...selTipo.map((v) => ({ label: v, onRemove: () => setSelTipo(selTipo.filter((x) => x !== v)) })),
  ];

  return (
    <SurfaceCard padded className="flex flex-col h-full">
      <SurfaceCardHeader
        label="Suas tarefas"
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors" aria-label="Ordenar tarefas">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="font-sans">{SORT_LABELS[sortMode]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Ordenar por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
                  <DropdownMenuItem key={m} onClick={() => setSortMode(m)} className={cn(sortMode === m && "text-primary font-medium")}>
                    {SORT_LABELS[m]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors" aria-label="Filtrar tarefas">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="font-sans">Filtros</span>
                  {totalFilters > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
                      {totalFilters}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3 space-y-3">
                <FilterGroup label="Status" options={optsStatus} selected={selStatus} onToggle={(v) => toggle(setSelStatus, selStatus, v)} />
                <FilterGroup label="Cliente" options={optsCliente} selected={selCliente} onToggle={(v) => toggle(setSelCliente, selCliente, v)} />
                <FilterGroup label="Tipo" options={optsTipo} selected={selTipo} onToggle={(v) => toggle(setSelTipo, selTipo, v)} />
                {totalFilters > 0 && (
                  <button onClick={clearFilters} className="w-full h-7 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors">
                    Limpar filtros
                  </button>
                )}
              </PopoverContent>
            </Popover>

            <span className="text-[12px] font-sans tabular-nums text-muted-foreground">
              {tarefas.length} {tarefas.length === 1 ? "item" : "itens"}
            </span>
          </div>
        }
      />

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 -mt-1">
          {chips.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-primary-soft/40 text-primary text-[11px]">
              {c.label}
              <button onClick={c.onRemove} aria-label={`Remover filtro ${c.label}`} className="h-4 w-4 rounded-full hover:bg-primary/10 flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : tarefas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-ok-soft text-ok flex items-center justify-center mb-3">
            <Sprout className="w-6 h-6" />
          </div>
          <p className="text-[14px] text-foreground">Nada aguardando você agora.</p>
          <p className="text-[12.5px] text-muted-foreground">Que tal adiantar um retorno?</p>
        </div>
      ) : (
        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Tarefa</TableHead>
                <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Cliente</TableHead>
                <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Projeto</TableHead>
                <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold w-[220px]">Status</TableHead>
                <TableHead className="h-9 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold text-right w-[130px]">Prazo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarefas.map((t, idx) => {
                const farol = farolDoPrazo(t.prazo_final);
                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 8) * 0.04, duration: 0.2 }}
                    onClick={() => navigate(`/agenda?tarefa=${t.id}`)}
                    className="h-11 cursor-pointer border-b border-border/40 last:border-0 hover:bg-surface-sunken/60 transition-colors"
                  >
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13.5px] font-medium text-foreground truncate">{t.titulo}</span>
                        {t.temNotas && (
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" aria-label="Tem observação" />
                        )}
                        {typeof t.anexos === "number" && t.anexos > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/80 shrink-0" aria-label={`${t.anexos} anexos`}>
                            <Paperclip className="w-3 h-3" />
                            <span className="font-sans tabular-nums">{t.anexos}</span>
                          </span>
                        )}
                        {t.demo && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] uppercase tracking-wider bg-surface-sunken text-muted-foreground border border-border/50 shrink-0">
                            exemplo
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[13px] text-foreground/85">
                      {t.cliente ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <span className="hover:text-primary transition-colors cursor-pointer truncate">{t.cliente}</span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64 text-[12.5px]">
                            <p className="font-medium">{t.cliente}</p>
                            <p className="text-muted-foreground mt-1">{t.tipo || "Cliente"}</p>
                          </HoverCardContent>
                        </HoverCard>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="py-2 text-[13px] text-foreground/85">
                      {t.projeto ? (
                        <HoverCard openDelay={200}>
                          <HoverCardTrigger asChild>
                            <span className="hover:text-primary transition-colors cursor-pointer truncate">{t.projeto}</span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64 text-[12.5px]">
                            <p className="font-medium">{t.projeto}</p>
                            <p className="text-muted-foreground mt-1">{t.cliente}</p>
                          </HoverCardContent>
                        </HoverCard>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-muted-foreground shrink-0 min-w-[92px]">
                          {t.statusLabel}
                        </span>
                        <Progress value={t.pct} className="h-1.5 flex-1" />
                        <span className="text-[11.5px] font-sans tabular-nums text-muted-foreground w-9 text-right">
                          {t.pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          farol.tone === "danger" && "bg-danger-soft text-danger",
                          farol.tone === "attention" && "bg-attention-soft text-attention",
                          farol.tone === "warn" && "bg-warn-soft text-warn",
                          farol.tone === "ok" && "bg-ok-soft text-ok",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            farol.tone === "danger" && "bg-danger",
                            farol.tone === "attention" && "bg-attention",
                            farol.tone === "warn" && "bg-warn",
                            farol.tone === "ok" && "bg-ok",
                          )}
                        />
                        <span className="font-sans tabular-nums">{farol.label}</span>
                      </span>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SurfaceCard>
  );
}
