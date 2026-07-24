import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Clock,
  PauseCircle,
  ChevronDown,
  X,
} from "lucide-react";
import {
  useProjetosPipeline,
  
  PIPELINE_STATUS_VALUES,
  TIPO_OPTIONS,
  TEMPERATURA_OPTIONS,
  tipoLabel,
  temperaturaLabel,
} from "@/hooks/useProjetosPipeline";
import { ProjetosKanban } from "@/components/projetos/ProjetosKanban";
import { ProjetosLista } from "@/components/projetos/ProjetosLista";
import { NovoProjetoDialog } from "@/components/projetos/NovoProjetoDialog";
import { cn } from "@/lib/utils";

type AlertaKind = null | "retorno_vencido" | "vencendo_semana" | "sem_contato" | "parado_semana";

function daysDiff(dt?: string | null) {
  if (!dt) return null;
  const d = new Date(dt); d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - d.getTime()) / 86400000);
}
const isPast = (dt?: string | null) => { const d = daysDiff(dt); return d != null && d > 0; };
const inNextDays = (dt?: string | null, n = 7) => { const d = daysDiff(dt); return d != null && d <= 0 && d >= -n; };

interface StatCardProps {
  count: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}
function StatCard({ count, label, Icon, active, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg bg-card px-4 py-3.5 text-left shadow-e1 transition-all hover:shadow-e2 hover:-translate-y-[1px] w-full",
        active && "ring-2 ring-primary/40 shadow-e2",
      )}
    >
      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="font-sans text-[24px] font-semibold text-foreground tabular-nums leading-none">{count}</span>
      <span className="flex-1 text-[12.5px] text-muted-foreground leading-tight">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
    </button>
  );
}

interface FilterPillProps {
  label: string;
  count?: number;
  children: React.ReactNode;
}
function FilterPill({ label, count, children }: FilterPillProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[12.5px] text-foreground shadow-e1 hover:shadow-e2 transition-shadow",
            count && "text-primary",
          )}
        >
          {label}
          {count ? (
            <span className="tabular-nums bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] font-semibold">{count}</span>
          ) : null}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">{children}</PopoverContent>
    </Popover>
  );
}

export default function Projetos() {
  const { data: projetos = [], isLoading, error, refetch } = useProjetosPipeline();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [showNovo, setShowNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);
  const [tempFiltro, setTempFiltro] = useState<string[]>([]);
  const [respFiltro, setRespFiltro] = useState<string[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState<string[]>([]);
  const [alerta, setAlerta] = useState<AlertaKind>(null);

  const projetosVisiveis = useMemo(
    () => projetos.filter((p) => PIPELINE_STATUS_VALUES.includes(p.status ?? "prospeccao")),
    [projetos],
  );

  const responsaveis = useMemo(() => {
    const map = new Map<string, string>();
    projetos.forEach((p) => { if (p.responsavel_id && p.responsavel_nome) map.set(p.responsavel_id, p.responsavel_nome); });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [projetos]);

  const clientesOpts = useMemo(() => {
    const map = new Map<string, string>();
    projetos.forEach((p) => { if (p.cliente_id && p.cliente_nome) map.set(p.cliente_id, p.cliente_nome); });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [projetos]);

  const retornoVencido = useMemo(() => projetosVisiveis.filter((p) => isPast(p.data_retorno_prometida)).length, [projetosVisiveis]);
  const vencendoSemana = useMemo(() => projetosVisiveis.filter((p) => inNextDays(p.data_retorno_prometida, 7)).length, [projetosVisiveis]);
  const semContato = useMemo(() => projetosVisiveis.filter((p) => !p.proximo_contato_em && !p.data_retorno_prometida).length, [projetosVisiveis]);
  const paradoSemana = useMemo(() => {
    return projetosVisiveis.filter((p) => { const d = daysDiff(p.updated_at); return d != null && d >= 7; }).length;
  }, [projetosVisiveis]);
  const aguardandoRetorno = retornoVencido + vencendoSemana;

  const filtrados = useMemo(() => {
    return projetosVisiveis.filter((p) => {
      if (busca) {
        const q = busca.toLowerCase();
        if (!p.titulo?.toLowerCase().includes(q) && !p.cliente_nome?.toLowerCase().includes(q)) return false;
      }
      if (tipoFiltro.length && !tipoFiltro.includes(p.tipo)) return false;
      if (tempFiltro.length && (!p.temperatura || !tempFiltro.includes(p.temperatura))) return false;
      if (respFiltro.length && (!p.responsavel_id || !respFiltro.includes(p.responsavel_id))) return false;
      if (clienteFiltro.length && !clienteFiltro.includes(p.cliente_id)) return false;
      if (alerta === "retorno_vencido" && !isPast(p.data_retorno_prometida)) return false;
      if (alerta === "vencendo_semana" && !inNextDays(p.data_retorno_prometida, 7)) return false;
      if (alerta === "sem_contato" && (p.proximo_contato_em || p.data_retorno_prometida)) return false;
      if (alerta === "parado_semana") { const d = daysDiff(p.updated_at); if (d == null || d < 7) return false; }
      return true;
    });
  }, [projetosVisiveis, busca, tipoFiltro, tempFiltro, respFiltro, clienteFiltro, alerta]);

  const toggle = (arr: string[], v: string, setter: (a: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtrosAtivos = tipoFiltro.length + tempFiltro.length + respFiltro.length + clienteFiltro.length + (alerta ? 1 : 0);
  const limparFiltros = () => { setTipoFiltro([]); setTempFiltro([]); setRespFiltro([]); setClienteFiltro([]); setAlerta(null); };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 py-6 max-w-[1400px]">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-serif text-[44px] leading-none text-foreground">Projetos</h1>
            <p className="text-[13px] text-muted-foreground mt-2 tabular-nums">
              {isLoading
                ? "carregando…"
                : `${projetosVisiveis.length} ${projetosVisiveis.length === 1 ? "projeto ativo" : "projetos ativos"}${aguardandoRetorno ? ` · ${aguardandoRetorno} aguardando retorno` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full bg-primary-soft p-1">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  view === "kanban" ? "bg-primary text-primary-foreground shadow-e1" : "text-primary/80 hover:text-primary",
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
              <button
                onClick={() => setView("lista")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  view === "lista" ? "bg-primary text-primary-foreground shadow-e1" : "text-primary/80 hover:text-primary",
                )}
              >
                <ListIcon className="w-3.5 h-3.5" /> Lista
              </button>
            </div>
            <Button onClick={() => setShowNovo(true)} className="gap-1.5 rounded-full">
              <Plus className="w-4 h-4" /> Novo projeto
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {!isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard count={retornoVencido} label="com retorno vencido" Icon={AlertCircle}
              active={alerta === "retorno_vencido"}
              onClick={() => setAlerta(alerta === "retorno_vencido" ? null : "retorno_vencido")} />
            <StatCard count={vencendoSemana} label="retornos vencendo esta semana" Icon={AlertTriangle}
              active={alerta === "vencendo_semana"}
              onClick={() => setAlerta(alerta === "vencendo_semana" ? null : "vencendo_semana")} />
            <StatCard count={semContato} label="sem próximo contato definido" Icon={Clock}
              active={alerta === "sem_contato"}
              onClick={() => setAlerta(alerta === "sem_contato" ? null : "sem_contato")} />
            <StatCard count={paradoSemana} label="parado há mais de uma semana" Icon={PauseCircle}
              active={alerta === "parado_semana"}
              onClick={() => setAlerta(alerta === "parado_semana" ? null : "parado_semana")} />
          </div>
        )}


        {/* Busca + filtros */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por projeto ou cliente…"
                className="pl-10 h-10 rounded-full bg-card border-transparent shadow-e1 focus-visible:ring-primary/30"
              />
            </div>
            <FilterPill label="Tipo" count={tipoFiltro.length}>
              <div className="space-y-1.5">
                {TIPO_OPTIONS.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
                    <Checkbox checked={tipoFiltro.includes(t.value)} onCheckedChange={() => toggle(tipoFiltro, t.value, setTipoFiltro)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </FilterPill>
            <FilterPill label="Temperatura" count={tempFiltro.length}>
              <div className="space-y-1.5">
                {TEMPERATURA_OPTIONS.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
                    <Checkbox checked={tempFiltro.includes(t.value)} onCheckedChange={() => toggle(tempFiltro, t.value, setTempFiltro)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </FilterPill>
            <FilterPill label="Responsável" count={respFiltro.length}>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {responsaveis.length ? responsaveis.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
                    <Checkbox checked={respFiltro.includes(r.id)} onCheckedChange={() => toggle(respFiltro, r.id, setRespFiltro)} />
                    <span className="truncate">{r.nome}</span>
                  </label>
                )) : <p className="text-[12px] text-muted-foreground italic">Nenhum responsável</p>}
              </div>
            </FilterPill>
            <FilterPill label="Cliente" count={clienteFiltro.length}>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {clientesOpts.length ? clientesOpts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
                    <Checkbox checked={clienteFiltro.includes(c.id)} onCheckedChange={() => toggle(clienteFiltro, c.id, setClienteFiltro)} />
                    <span className="truncate">{c.nome}</span>
                  </label>
                )) : <p className="text-[12px] text-muted-foreground italic">Nenhum cliente</p>}
              </div>
            </FilterPill>
          </div>

          {filtrosAtivos > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Filtros ativos</span>
              {tipoFiltro.map((v) => (
                <button key={"t" + v} onClick={() => toggle(tipoFiltro, v, setTipoFiltro)}
                  className="inline-flex items-center gap-1 rounded-full bg-card text-foreground text-[12px] px-2.5 py-1 shadow-e1 hover:shadow-e2">
                  Tipo: {tipoLabel(v).toLowerCase()} <X className="w-3 h-3 opacity-60" />
                </button>
              ))}
              {tempFiltro.map((v) => (
                <button key={"tp" + v} onClick={() => toggle(tempFiltro, v, setTempFiltro)}
                  className="inline-flex items-center gap-1 rounded-full bg-card text-foreground text-[12px] px-2.5 py-1 shadow-e1 hover:shadow-e2">
                  Temperatura: {(temperaturaLabel(v) ?? v).toLowerCase()} <X className="w-3 h-3 opacity-60" />
                </button>
              ))}
              {respFiltro.map((v) => {
                const r = responsaveis.find((x) => x.id === v);
                return (
                  <button key={"r" + v} onClick={() => toggle(respFiltro, v, setRespFiltro)}
                    className="inline-flex items-center gap-1 rounded-full bg-card text-foreground text-[12px] px-2.5 py-1 shadow-e1 hover:shadow-e2">
                    Responsável: {r?.nome ?? "—"} <X className="w-3 h-3 opacity-60" />
                  </button>
                );
              })}
              {clienteFiltro.map((v) => {
                const c = clientesOpts.find((x) => x.id === v);
                return (
                  <button key={"c" + v} onClick={() => toggle(clienteFiltro, v, setClienteFiltro)}
                    className="inline-flex items-center gap-1 rounded-full bg-card text-foreground text-[12px] px-2.5 py-1 shadow-e1 hover:shadow-e2">
                    Cliente: {c?.nome ?? "—"} <X className="w-3 h-3 opacity-60" />
                  </button>
                );
              })}
              {alerta && (
                <button onClick={() => setAlerta(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-card text-foreground text-[12px] px-2.5 py-1 shadow-e1 hover:shadow-e2">
                  {alerta === "retorno_vencido" && "Retorno vencido"}
                  {alerta === "vencendo_semana" && "Vencendo esta semana"}
                  {alerta === "sem_contato" && "Sem próximo contato"}
                  {alerta === "parado_semana" && "Parado há +7d"}
                  <X className="w-3 h-3 opacity-60" />
                </button>
              )}
              <button onClick={limparFiltros} className="text-[12px] font-medium text-primary hover:underline underline-offset-2 ml-1">
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg bg-card shadow-e1 p-6 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-foreground">Não conseguimos carregar os projetos agora</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">A conexão falhou no meio do caminho. Seus dados estão salvos.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Ver detalhes</Button>
            <Button size="sm" onClick={() => refetch()}>Tentar de novo</Button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-lg bg-card p-10 text-center shadow-e1">
            <p className="text-[17px] font-semibold text-foreground">Nada por aqui ainda</p>
            <p className="text-[13.5px] text-muted-foreground mt-1.5">
              {filtrosAtivos > 0 ? "Ajuste os filtros para ver mais projetos." : "Crie o primeiro projeto para começar."}
            </p>
            {filtrosAtivos === 0 && (
              <Button onClick={() => setShowNovo(true)} className="mt-4 gap-1.5 rounded-full">
                <Plus className="w-4 h-4" /> Novo projeto
              </Button>
            )}
          </div>
        ) : view === "kanban" ? (
          <ProjetosKanban projetos={filtrados} />
        ) : (
          <ProjetosLista projetos={filtrados} />
        )}
      </div>

      <NovoProjetoDialog open={showNovo} onOpenChange={setShowNovo} />
    </AppLayout>
  );
}
