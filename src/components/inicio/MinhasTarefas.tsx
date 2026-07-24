import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sprout, Check, ExternalLink, ArrowUpDown, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { Progress } from "@/components/ui/progress";
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
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  etapa_atual_id: string | null;
  notas: string | null;
  clientes?: { nome: string | null } | null;
  projetos?: { titulo: string | null } | null;
};

type TarefaView = {
  id: string;
  titulo: string;
  vinculo: string;
  cliente?: string;
  tipo?: string;
  prazo_final: string | null;
  pct: number;
  statusLabel: string;
  codigo?: string | null;
  notas?: string | null;
  demo?: boolean;
};

function inDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DEMO: TarefaView[] = [
  {
    id: "demo-1",
    titulo: "Enviar proposta revisada",
    vinculo: "Dario Guarita · Residência Alto de Pinheiros",
    cliente: "Dario Guarita",
    tipo: "Proposta",
    prazo_final: inDias(1),
    pct: 60,
    statusLabel: "Em andamento",
    demo: true,
  },
  {
    id: "demo-2",
    titulo: "Aprovar orçamento",
    vinculo: "Juliana Falconi · Cobertura Jardins",
    cliente: "Juliana Falconi",
    tipo: "Orçamento",
    prazo_final: inDias(0),
    pct: 0,
    statusLabel: "Aguardando você",
    demo: true,
  },
  {
    id: "demo-3",
    titulo: "Retornar contato",
    vinculo: "Nina Ranieri · Prospecção",
    cliente: "Nina Ranieri",
    tipo: "Contato",
    prazo_final: inDias(2),
    pct: 10,
    statusLabel: "A fazer",
    demo: true,
  },
  {
    id: "demo-4",
    titulo: "Revisar memorial descritivo",
    vinculo: "Thais e Renato · Casa de campo Cotia",
    cliente: "Thais e Renato",
    tipo: "Projeto",
    prazo_final: inDias(4),
    pct: 30,
    statusLabel: "Em andamento",
    demo: true,
  },
  {
    id: "demo-5",
    titulo: "Fechar escala da semana",
    vinculo: "Time de campo",
    cliente: "Time de campo",
    tipo: "Operação",
    prazo_final: inDias(3),
    pct: 80,
    statusLabel: "Em andamento",
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
  urgencia: "Prazo (urgência)",
  prioridade: "Prioridade",
  status: "Status",
};

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
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
  const { data: colab } = useColaboradorId(user?.id);
  const [expanded, setExpanded] = useState<string | null>(null);
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
          "id, codigo, titulo, prazo_final, cliente_id, projeto_id, arquivada, status_saida, etapa_atual_id, notas, clientes(nome), projetos(titulo)",
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
          vinculo: t.projetos?.titulo || t.clientes?.nome || "",
          cliente: t.clientes?.nome || undefined,
          tipo: t.projetos?.titulo ? "Projeto" : "Cliente",
          prazo_final: t.prazo_final,
          pct: 25,
          statusLabel: "Em andamento",
          codigo: t.codigo,
          notas: t.notas,
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

  const filtered = useMemo(() => {
    return tarefasBase.filter((t) => {
      if (selStatus.length && !selStatus.includes(t.statusLabel)) return false;
      if (selCliente.length && !(t.cliente && selCliente.includes(t.cliente))) return false;
      if (selTipo.length && !(t.tipo && selTipo.includes(t.tipo))) return false;
      return true;
    });
  }, [tarefasBase, selStatus, selCliente, selTipo]);

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
  const clearFilters = () => {
    setSelStatus([]);
    setSelCliente([]);
    setSelTipo([]);
  };
  const toggle = (setter: (v: string[]) => void, cur: string[], v: string) =>
    setter(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);

  const activeChips: { label: string; onRemove: () => void }[] = [
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
                <button
                  className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors"
                  aria-label="Ordenar tarefas"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="font-sans">{SORT_LABELS[sortMode]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Ordenar por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => setSortMode(m)}
                    className={cn(sortMode === m && "text-primary font-medium")}
                  >
                    {SORT_LABELS[m]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors"
                  aria-label="Filtrar tarefas"
                >
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
                <FilterGroup
                  label="Status"
                  options={optsStatus}
                  selected={selStatus}
                  onToggle={(v) => toggle(setSelStatus, selStatus, v)}
                />
                <FilterGroup
                  label="Cliente"
                  options={optsCliente}
                  selected={selCliente}
                  onToggle={(v) => toggle(setSelCliente, selCliente, v)}
                />
                <FilterGroup
                  label="Tipo"
                  options={optsTipo}
                  selected={selTipo}
                  onToggle={(v) => toggle(setSelTipo, selTipo, v)}
                />
                {totalFilters > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full h-7 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-sunken transition-colors"
                  >
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

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 -mt-1">
          {activeChips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-primary-soft/40 text-primary text-[11px]"
            >
              {c.label}
              <button
                onClick={c.onRemove}
                aria-label={`Remover filtro ${c.label}`}
                className="h-4 w-4 rounded-full hover:bg-primary/10 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="type-body text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 -mr-1 max-h-[62vh]">

          {tarefas.map((t, idx) => {
            const farol = farolDoPrazo(t.prazo_final);
            const isOpen = expanded === t.id;
            return (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.22 }}
              >
                <motion.div
                  whileHover={{ y: -2, scale: 1.005 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className={cn(
                    "group relative rounded-lg card-filete bg-card shadow-e2 hover:shadow-e3 transition-shadow px-4 py-3 cursor-pointer",
                  )}
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[15px] font-semibold text-foreground truncate">
                          {t.titulo}
                        </p>
                        {t.demo && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-px text-[9px] uppercase tracking-wider bg-surface-sunken text-muted-foreground border border-border/50">
                            exemplo
                          </span>
                        )}
                      </div>
                      {t.vinculo && (
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                          {t.vinculo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          farol.tone === "danger" && "bg-danger-soft text-danger",
                          farol.tone === "attention" && "bg-attention-soft text-attention",
                          farol.tone === "warn" && "bg-warn-soft text-warn",
                          farol.tone === "ok" && "bg-ok-soft text-ok",
                        )}
                      >
                        {farol.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                      {t.statusLabel}
                    </span>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.1 + idx * 0.04, duration: 0.45 }}
                      style={{ transformOrigin: "left" }}
                      className="flex-1"
                    >
                      <Progress value={t.pct} className="h-1.5" />
                    </motion.div>
                    <span className="text-[12px] font-sans tabular-nums text-muted-foreground w-9 text-right">
                      {t.pct}%
                    </span>
                  </div>

                  {/* Ações rápidas revelam no hover */}
                  <div className="absolute right-3 -top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 w-6 rounded-full bg-card shadow-e1 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary"
                      title="Concluir"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 w-6 rounded-full bg-card shadow-e1 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary"
                      title="Abrir"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
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
                            Prazo:{" "}
                            {format(parseISO(t.prazo_final), "dd 'de' MMMM", {
                              locale: ptBR,
                            })}
                          </p>
                        )}
                        {t.notas && (
                          <p className="text-[13px] text-foreground mt-2 whitespace-pre-wrap">
                            {t.notas}
                          </p>
                        )}
                        {t.demo && !t.notas && (
                          <p className="text-[12px] text-muted-foreground italic">
                            Cartão de exemplo — dados reais aparecem aqui assim que
                            houver demandas atribuídas a você.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
          {tarefas.length === 0 && (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <Sprout className="w-5 h-5 text-sage" />
              <span className="type-body">Nada aguardando você agora.</span>
            </div>
          )}
        </ul>
      )}
    </SurfaceCard>
  );
}
