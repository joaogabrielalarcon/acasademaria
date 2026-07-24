import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/primitives/Chip";
import { AlertBar } from "@/components/blocks/AlertBar";
import {
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  useProjetosPipeline,
  PIPELINE_STATUS_VALUES,
  TIPO_OPTIONS,
  TEMPERATURA_OPTIONS,
  tipoLabel,
  temperaturaLabel,
  type ProjetoPipeline,
} from "@/hooks/useProjetosPipeline";
import { ProjetosKanban } from "@/components/projetos/ProjetosKanban";
import { ProjetosLista } from "@/components/projetos/ProjetosLista";
import { NovoProjetoDialog } from "@/components/projetos/NovoProjetoDialog";
import { cn } from "@/lib/utils";

type AlertaKind = null | "retorno_vencido" | "sem_contato" | "propostas_paradas";

function isPast(dt?: string | null) {
  if (!dt) return false;
  const d = new Date(dt); d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return d.getTime() < hoje.getTime();
}

export default function Projetos() {
  const { data: projetos = [], isLoading, error, refetch } = useProjetosPipeline();
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [showNovo, setShowNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);
  const [tempFiltro, setTempFiltro] = useState<string[]>([]);
  const [respFiltro, setRespFiltro] = useState<string[]>([]);
  const [alerta, setAlerta] = useState<AlertaKind>(null);

  const projetosVisiveis = useMemo(
    () => projetos.filter((p) => PIPELINE_STATUS_VALUES.includes(p.status ?? "prospeccao")),
    [projetos],
  );

  const responsaveis = useMemo(() => {
    const map = new Map<string, string>();
    projetos.forEach((p) => {
      if (p.responsavel_id && p.responsavel_nome) map.set(p.responsavel_id, p.responsavel_nome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [projetos]);

  const retornoVencidoCount = useMemo(
    () => projetosVisiveis.filter((p) => isPast(p.data_retorno_prometida)).length,
    [projetosVisiveis],
  );
  const semContatoCount = useMemo(
    () => projetosVisiveis.filter((p) => isPast(p.proximo_contato_em)).length,
    [projetosVisiveis],
  );
  const propostasParadasCount = useMemo(
    () => projetosVisiveis.filter((p) => p.status === "proposta" && isPast(p.updated_at)).length,
    [projetosVisiveis],
  );

  const filtrados = useMemo(() => {
    return projetosVisiveis.filter((p) => {
      if (busca) {
        const q = busca.toLowerCase();
        if (!p.titulo?.toLowerCase().includes(q) && !p.cliente_nome?.toLowerCase().includes(q)) return false;
      }
      if (tipoFiltro.length && !tipoFiltro.includes(p.tipo)) return false;
      if (tempFiltro.length && (!p.temperatura || !tempFiltro.includes(p.temperatura))) return false;
      if (respFiltro.length && (!p.responsavel_id || !respFiltro.includes(p.responsavel_id))) return false;
      if (alerta === "retorno_vencido" && !isPast(p.data_retorno_prometida)) return false;
      if (alerta === "sem_contato" && !isPast(p.proximo_contato_em)) return false;
      if (alerta === "propostas_paradas" && !(p.status === "proposta" && isPast(p.updated_at))) return false;
      return true;
    });
  }, [projetosVisiveis, busca, tipoFiltro, tempFiltro, respFiltro, alerta]);

  const toggle = (arr: string[], v: string, setter: (a: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtrosAtivos = tipoFiltro.length + tempFiltro.length + respFiltro.length + (alerta ? 1 : 0);
  const limparFiltros = () => { setTipoFiltro([]); setTempFiltro([]); setRespFiltro([]); setAlerta(null); };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 py-4">
        {/* Cabeçalho */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-serif text-[36px] leading-none text-foreground">Projetos</h1>
            <p className="text-[13px] text-muted-foreground mt-1.5 tabular-nums">
              {isLoading ? "carregando…" : `${projetosVisiveis.length} ${projetosVisiveis.length === 1 ? "projeto ativo" : "projetos ativos"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/60 rounded-md p-0.5 border border-border/50">
              <Button
                size="sm"
                variant={view === "kanban" ? "default" : "ghost"}
                onClick={() => setView("kanban")}
                className="gap-1.5 h-8"
              >
                <LayoutGrid className="w-4 h-4" /> Kanban
              </Button>
              <Button
                size="sm"
                variant={view === "lista" ? "default" : "ghost"}
                onClick={() => setView("lista")}
                className="gap-1.5 h-8"
              >
                <ListIcon className="w-4 h-4" /> Lista
              </Button>
            </div>
            <Button onClick={() => setShowNovo(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo projeto
            </Button>
          </div>
        </div>

        {/* Alertas */}
        {!isLoading && (retornoVencidoCount + semContatoCount + propostasParadasCount) > 0 && (
          <div className="grid gap-2 md:grid-cols-3">
            {retornoVencidoCount > 0 && (
              <AlertBar
                tone="attention"
                count={retornoVencidoCount}
                title="com retorno atrasado"
                onClick={() => setAlerta(alerta === "retorno_vencido" ? null : "retorno_vencido")}
              />
            )}
            {semContatoCount > 0 && (
              <AlertBar
                tone="warn"
                count={semContatoCount}
                title="sem próximo contato agendado"
                onClick={() => setAlerta(alerta === "sem_contato" ? null : "sem_contato")}
              />
            )}
            {propostasParadasCount > 0 && (
              <AlertBar
                tone="attention"
                count={propostasParadasCount}
                title="propostas paradas há tempo"
                onClick={() => setAlerta(alerta === "propostas_paradas" ? null : "propostas_paradas")}
              />
            )}
          </div>
        )}

        {/* Busca + filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por projeto ou cliente…"
              className="pl-9 h-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <SlidersHorizontal className="w-4 h-4" /> Filtros
                {filtrosAtivos > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 tabular-nums">
                    {filtrosAtivos}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Tipo</p>
                  <div className="space-y-1.5">
                    {TIPO_OPTIONS.map((t) => (
                      <label key={t.value} className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <Checkbox checked={tipoFiltro.includes(t.value)} onCheckedChange={() => toggle(tipoFiltro, t.value, setTipoFiltro)} />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Temperatura</p>
                  <div className="space-y-1.5">
                    {TEMPERATURA_OPTIONS.map((t) => (
                      <label key={t.value} className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <Checkbox checked={tempFiltro.includes(t.value)} onCheckedChange={() => toggle(tempFiltro, t.value, setTempFiltro)} />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
                {responsaveis.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Responsável</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {responsaveis.map((r) => (
                        <label key={r.id} className="flex items-center gap-2 text-[13px] cursor-pointer">
                          <Checkbox checked={respFiltro.includes(r.id)} onCheckedChange={() => toggle(respFiltro, r.id, setRespFiltro)} />
                          {r.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {filtrosAtivos > 0 && (
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="w-full">Limpar filtros</Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Chips ativos */}
          {tipoFiltro.map((v) => (
            <Chip key={"t" + v} variant="active" onClick={() => toggle(tipoFiltro, v, setTipoFiltro)}>
              {tipoLabel(v)} <X className="w-3 h-3 ml-1" />
            </Chip>
          ))}
          {tempFiltro.map((v) => (
            <Chip key={"tp" + v} variant="active" onClick={() => toggle(tempFiltro, v, setTempFiltro)}>
              {temperaturaLabel(v) ?? v} <X className="w-3 h-3 ml-1" />
            </Chip>
          ))}
          {respFiltro.map((v) => {
            const r = responsaveis.find((x) => x.id === v);
            return (
              <Chip key={"r" + v} variant="active" onClick={() => toggle(respFiltro, v, setRespFiltro)}>
                {r?.nome ?? "—"} <X className="w-3 h-3 ml-1" />
              </Chip>
            );
          })}
          {alerta && (
            <Chip variant="active" onClick={() => setAlerta(null)}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {alerta === "retorno_vencido" && "Retorno atrasado"}
              {alerta === "sem_contato" && "Sem contato"}
              {alerta === "propostas_paradas" && "Proposta parada"}
              <X className="w-3 h-3 ml-1" />
            </Chip>
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
          <div className="rounded-lg border border-danger/40 bg-danger-soft p-6 text-center">
            <p className="font-serif text-[18px] text-danger">Algo deu errado ao carregar</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">Tentar de novo</Button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-card p-10 text-center shadow-e1">
            <p className="font-serif text-[20px] text-foreground">Nada por aqui ainda</p>
            <p className="text-[13.5px] text-muted-foreground mt-1.5">
              {filtrosAtivos > 0 ? "Ajuste os filtros para ver mais projetos." : "Crie o primeiro projeto para começar."}
            </p>
            {filtrosAtivos === 0 && (
              <Button onClick={() => setShowNovo(true)} className="mt-4 gap-1.5">
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
