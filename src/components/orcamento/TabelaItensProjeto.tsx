import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Plus,
  Check,
  ArrowDownUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronsDownUp,
  ChevronsUpDown,
  Pencil,
  GitMerge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ItemProjeto } from "@/pages/NovoOrcamento";

export interface AlternativaFornecedor {
  fornecedor_id: string;
  fornecedor_nome: string;
  porte?: string | null;
  preco?: number | null;
  unidade?: string | null;
  data?: string | null;
  estrelas?: number | null;
  mercado?: string | null;
  selecionado?: boolean;
}

type SortKey = "data" | "preco" | "nota" | "mercado" | "porte";
type Periodo = "3m" | "6m" | "1y" | "all";

interface FiltrosLinha {
  sort: SortKey;
  sortDir: "asc" | "desc";
  mercados: string[];
  porte: string;
  periodo: Periodo;
}

const filtroPadrao: FiltrosLinha = {
  sort: "data",
  sortDir: "desc",
  mercados: [],
  porte: "",
  periodo: "3m",
};

interface Props {
  itens: ItemProjeto[];
  getAlternativas?: (item: ItemProjeto) => AlternativaFornecedor[];
  onSelecionarFornecedor?: (item: ItemProjeto, alt: AlternativaFornecedor) => void;
  onAtualizarQuantidade?: (item: ItemProjeto, quantidade: number) => void;
  onEditarCotacao?: (item: ItemProjeto, alt: AlternativaFornecedor) => void;
  onMesclarFornecedores?: (item: ItemProjeto, alts: AlternativaFornecedor[]) => void;
  onAdicionarItem?: () => void;
}

const brl = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

const porteToNum = (s: string | null | undefined): number => {
  if (!s) return 0;
  const m = String(s).replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

function dentroPeriodo(data: string | null | undefined, periodo: Periodo): boolean {
  if (periodo === "all") return true;
  if (!data) return false;
  const d = new Date(data);
  if (isNaN(d.getTime())) return false;
  const hoje = new Date();
  const meses = periodo === "3m" ? 3 : periodo === "6m" ? 6 : 12;
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() - meses);
  return d >= limite;
}

export function TabelaItensProjeto({
  itens,
  getAlternativas,
  onSelecionarFornecedor,
  onAtualizarQuantidade,
  onEditarCotacao,
  onMesclarFornecedores,
  onAdicionarItem,
}: Props) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "planta" | "insumo">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [soSemForn, setSoSemForn] = useState(false);
  // override: true=forçar aberto, false=forçar fechado, undefined=default por status
  const [override, setOverride] = useState<Record<string, boolean | undefined>>({});
  const [filtrosPorLinha, setFiltrosPorLinha] = useState<Record<string, FiltrosLinha>>({});

  const categorias = useMemo(() => {
    const set = new Set<string>();
    itens.forEach((i) => i.categoria && set.add(i.categoria));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  const totalResolvido = useMemo(() => itens.filter((i) => i.fornecedor_id).length, [itens]);
  const totalFaltam = itens.length - totalResolvido;
  const progresso = itens.length ? Math.round((totalResolvido / itens.length) * 100) : 0;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((it) => {
      if (tipoFiltro !== "todos" && it.tipo !== tipoFiltro) return false;
      if (categoriaFiltro !== "todas" && (it.categoria || "") !== categoriaFiltro) return false;
      if (soSemForn && it.fornecedor_id) return false;
      if (
        q &&
        !it.nome.toLowerCase().includes(q) &&
        !(it.categoria || "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [itens, busca, tipoFiltro, categoriaFiltro, soSemForn]);

  const isAberto = (it: ItemProjeto) => {
    const ov = override[it.chave];
    if (ov !== undefined) return ov;
    // default: pendentes abertos, resolvidos fechados
    return !it.fornecedor_id;
  };

  const setAberto = (chave: string, valor: boolean) =>
    setOverride((o) => ({ ...o, [chave]: valor }));

  const abrirTodos = () => {
    const next: Record<string, boolean> = {};
    filtrados.forEach((i) => (next[i.chave] = true));
    setOverride(next);
  };
  const fecharTodos = () => {
    const next: Record<string, boolean> = {};
    filtrados.forEach((i) => (next[i.chave] = false));
    setOverride(next);
  };
  const abrirSoPendentes = () => {
    const next: Record<string, boolean> = {};
    filtrados.forEach((i) => (next[i.chave] = !i.fornecedor_id));
    setOverride(next);
  };
  const fecharResolvidos = () => {
    setOverride((prev) => {
      const next = { ...prev };
      filtrados.forEach((i) => {
        if (i.fornecedor_id) next[i.chave] = false;
      });
      return next;
    });
  };

  const setFiltros = (chave: string, patch: Partial<FiltrosLinha>) =>
    setFiltrosPorLinha((prev) => ({
      ...prev,
      [chave]: { ...filtroPadrao, ...(prev[chave] || {}), ...patch },
    }));

  return (
    <Card className="p-0 overflow-hidden border-primary/20">
      {/* Barra superior — Progresso + ações */}
      <div className="p-3 border-b border-primary/20 bg-secondary/40 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-3 min-w-[220px]">
        <div className="text-sm">
          <span className="text-sm font-medium text-foreground">{totalResolvido}</span>
          <span className="text-muted-foreground"> de {itens.length} com fornecedor</span>
          <span className="text-sm font-medium text-primary"> · {progresso}%</span>
        </div>
          <div className="h-2 w-32 rounded-full bg-background border border-primary/20 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        {totalFaltam > 0 && (
          <Button
            type="button"
            variant={soSemForn ? "default" : "terracota"}
            size="sm"
            onClick={() => setSoSemForn((v) => !v)}
            className="h-9"
          >
            <AlertCircle className="w-4 h-4" />
            {soSemForn ? "Ver tudo" : `Itens em aberto (${totalFaltam})`}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {onAdicionarItem && (
            <Button type="button" size="sm" variant="terracota" onClick={onAdicionarItem} className="h-9">
              <Plus className="w-4 h-4" /> Adicionar item
            </Button>
          )}
        </div>
      </div>

      {/* Filtros + controles de expansão */}
      <div className="p-3 border-b border-primary/20 bg-background flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar item ou categoria"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 h-9 bg-background"
          />
        </div>

        <div className="flex gap-1">
          {(["todos", "planta", "insumo"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={tipoFiltro === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoFiltro(t)}
              className="h-9 capitalize"
            >
              {t === "todos" ? "Todos" : t === "planta" ? "Plantas" : "Insumos"}
            </Button>
          ))}
        </div>

        {categorias.length > 0 && (
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="h-9 w-[180px] bg-background">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(busca || tipoFiltro !== "todos" || categoriaFiltro !== "todas" || soSemForn) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setBusca("");
              setTipoFiltro("todos");
              setCategoriaFiltro("todas");
              setSoSemForn(false);
            }}
          >
            <X className="w-4 h-4" /> Limpar
          </Button>
        )}

        <div className="ml-auto flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1">
            {filtrados.length} de {itens.length}
          </span>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={abrirSoPendentes} title="Abrir só os sem fornecedor">
            <AlertCircle className="w-3.5 h-3.5" /> Abrir pendentes
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={fecharResolvidos} title="Fechar os já resolvidos">
            Fechar resolvidos
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2" onClick={abrirTodos} title="Abrir todos">
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2" onClick={fecharTodos} title="Fechar todos">
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-foreground hidden md:table-header-group">
            <tr className="border-b border-primary/20">
              <th className="w-8" />
              <th className="text-left px-3 py-2 font-semibold">Item</th>
              <th className="text-right px-3 py-2 font-semibold w-[120px]">Quantidade</th>
              <th className="text-left px-3 py-2 font-semibold w-[80px]">Un</th>
              <th className="text-right px-3 py-2 font-semibold w-[120px]">Valor unit.</th>
              <th className="text-left px-3 py-2 font-semibold w-[260px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum item corresponde aos filtros.
                </td>
              </tr>
            )}
            {filtrados.map((it) => (
              <LinhaItem
                key={it.chave}
                item={it}
                aberto={isAberto(it)}
                setAberto={(v) => setAberto(it.chave, v)}
                filtros={filtrosPorLinha[it.chave] || filtroPadrao}
                setFiltros={(p) => setFiltros(it.chave, p)}
                getAlternativas={getAlternativas}
                onSelecionarFornecedor={(alt) => {
                  onSelecionarFornecedor?.(it, alt);
                  setAberto(it.chave, false);
                }}
                onAtualizarQuantidade={
                  onAtualizarQuantidade ? (q) => onAtualizarQuantidade(it, q) : undefined
                }
                onEditarCotacao={onEditarCotacao ? (alt) => onEditarCotacao(it, alt) : undefined}
                onMesclarFornecedores={
                  onMesclarFornecedores ? (alts) => onMesclarFornecedores(it, alts) : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LinhaItem({
  item,
  aberto,
  setAberto,
  filtros,
  setFiltros,
  getAlternativas,
  onSelecionarFornecedor,
  onAtualizarQuantidade,
  onEditarCotacao,
  onMesclarFornecedores,
}: {
  item: ItemProjeto;
  aberto: boolean;
  setAberto: (v: boolean) => void;
  filtros: FiltrosLinha;
  setFiltros: (patch: Partial<FiltrosLinha>) => void;
  getAlternativas?: (item: ItemProjeto) => AlternativaFornecedor[];
  onSelecionarFornecedor?: (alt: AlternativaFornecedor) => void;
  onAtualizarQuantidade?: (q: number) => void;
  onEditarCotacao?: (alt: AlternativaFornecedor) => void;
  onMesclarFornecedores?: (alts: AlternativaFornecedor[]) => void;
}) {
  const resolvido = !!item.fornecedor_id;
  const [qtdLocal, setQtdLocal] = useState<string>(String(item.quantidade ?? 0));

  // Sincroniza quando muda externamente (raro)
  const itemQtdStr = String(item.quantidade ?? 0);
  if (itemQtdStr !== qtdLocal && document.activeElement?.getAttribute("data-qtd-chave") !== item.chave) {
    // sync silencioso fora do foco
    queueMicrotask(() => setQtdLocal(itemQtdStr));
  }

  const altsBrutas = useMemo(
    () => (aberto && getAlternativas ? getAlternativas(item) : []),
    [aberto, getAlternativas, item],
  );

  const mercadosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    altsBrutas.forEach((a) => {
      const m = (a.mercado || "").trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [altsBrutas]);

  const portesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    altsBrutas.forEach((a) => {
      const p = (a.porte || "").trim();
      if (p) set.add(p);
    });
    return Array.from(set).sort((a, b) => porteToNum(a) - porteToNum(b));
  }, [altsBrutas]);

  const altsFiltradas = useMemo(() => {
    let arr = altsBrutas.filter((a) => {
      if (filtros.mercados.length && !filtros.mercados.includes((a.mercado || "").trim()))
        return false;
      if (filtros.porte && (a.porte || "").trim() !== filtros.porte) return false;
      if (!dentroPeriodo(a.data, filtros.periodo)) return false;
      return true;
    });
    const dir = filtros.sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (filtros.sort) {
        case "preco":
          cmp = (a.preco ?? Infinity) - (b.preco ?? Infinity);
          break;
        case "nota":
          cmp = (a.estrelas ?? -Infinity) - (b.estrelas ?? -Infinity);
          break;
        case "mercado":
          cmp = (a.mercado || "").localeCompare(b.mercado || "", "pt-BR");
          break;
        case "porte":
          cmp = porteToNum(a.porte) - porteToNum(b.porte);
          break;
        case "data":
        default: {
          const da = a.data ? new Date(a.data).getTime() : 0;
          const db = b.data ? new Date(b.data).getTime() : 0;
          cmp = da - db;
        }
      }
      return cmp * dir;
    });
    arr.sort((a, b) => (b.selecionado ? 1 : 0) - (a.selecionado ? 1 : 0));
    return arr;
  }, [altsBrutas, filtros]);

  // Melhores destaques
  const menorPrecoId = useMemo(() => {
    const comPreco = altsFiltradas.filter((a) => a.preco != null);
    if (comPreco.length === 0) return null;
    const min = comPreco.reduce((m, a) => ((a.preco ?? Infinity) < (m.preco ?? Infinity) ? a : m), comPreco[0]);
    return `${min.fornecedor_id}-${min.preco}`;
  }, [altsFiltradas]);

  const maisRecenteId = useMemo(() => {
    const comData = altsFiltradas.filter((a) => a.data);
    if (comData.length === 0) return null;
    const max = comData.reduce((m, a) =>
      new Date(a.data!).getTime() > new Date(m.data!).getTime() ? a : m,
    comData[0]);
    return `${max.fornecedor_id}-${max.data}`;
  }, [altsFiltradas]);

  const fornecedoresDuplicados = useMemo(() => {
    const seen: Record<string, number> = {};
    altsBrutas.forEach((a) => {
      const k = (a.fornecedor_nome || "").trim().toLowerCase();
      if (!k) return;
      seen[k] = (seen[k] || 0) + 1;
    });
    return Object.entries(seen).filter(([, n]) => n > 1).map(([k]) => k);
  }, [altsBrutas]);

  const editavelQtd = !!onAtualizarQuantidade && item.tipo === "insumo";

  return (
    <>
      <tr
        className={cn(
          "border-b border-primary/10 transition-colors",
          aberto ? "bg-accent/30" : "hover:bg-accent/20",
          !resolvido && "bg-primary/5",
        )}
      >
        <td
          className={cn("px-2 py-3 align-middle text-muted-foreground cursor-pointer w-8 border-l-2", resolvido ? "border-l-marinho" : "border-l-primary")}
          onClick={() => setAberto(!aberto)}
        >
          {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="px-3 py-3 align-middle cursor-pointer" onClick={() => setAberto(!aberto)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{item.nome}</span>
            <Badge variant={item.tipo === "planta" ? "default" : "secondary"} className="text-[10px] capitalize">
              {item.tipo}
            </Badge>
            {item.badges.includes("baixa confiança") && (
              <Badge variant="outline" className="text-[10px]">conferir</Badge>
            )}
          </div>
          {item.tipo === "planta" && item.nome_cientifico && (
            <div className="text-xs text-muted-foreground italic">{item.nome_cientifico}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {item.categoria || "—"}
            {item.porte ? ` · Porte ${item.porte}` : ""}
          </div>
        </td>
        <td className="px-3 py-3 align-middle text-right">
          {editavelQtd ? (
            <Input
              type="number"
              min={0}
              step="0.01"
              value={qtdLocal}
              data-qtd-chave={item.chave}
              onChange={(e) => setQtdLocal(e.target.value)}
              onBlur={() => {
                const n = Number(qtdLocal);
                if (!isNaN(n) && n !== Number(item.quantidade)) onAtualizarQuantidade!(n);
              }}
              className="h-9 w-24 text-right tabular-nums bg-background inline-block"
            />
          ) : (
            <span className="tabular-nums">
              {item.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            </span>
          )}
        </td>
        <td className="px-3 py-3 align-middle text-muted-foreground">{item.unidade || "—"}</td>
        <td className="px-3 py-3 align-middle text-right tabular-nums">{brl(item.valor_unitario)}</td>
        <td className="px-3 py-3 align-middle">
          <div className="flex items-center gap-2 flex-wrap">
            {resolvido ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-marinho/10 text-marinho text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-marinho" /> Pronto
                </span>
                <span className="text-xs text-foreground truncate max-w-[140px]">{item.fornecedor_nome || ""}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setAberto(!aberto)}
                >
                  Trocar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="terracota"
                className="h-9"
                onClick={() => setAberto(true)}
              >
                <AlertCircle className="w-4 h-4" />
                Escolher fornecedor
              </Button>
            )}
          </div>
        </td>
      </tr>
      {aberto && (
        <tr className="bg-secondary/30 border-b border-primary/20">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Cotações disponíveis
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Select value={filtros.sort} onValueChange={(v) => setFiltros({ sort: v as SortKey })}>
                    <SelectTrigger className="h-8 w-[150px] bg-background text-xs">
                      <ArrowDownUp className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data">Mais recentes</SelectItem>
                      <SelectItem value="preco">Menor preço</SelectItem>
                      <SelectItem value="nota">Melhor nota</SelectItem>
                      <SelectItem value="mercado">Mercado</SelectItem>
                      <SelectItem value="porte">Porte</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => setFiltros({ sortDir: filtros.sortDir === "asc" ? "desc" : "asc" })}
                  >
                    {filtros.sortDir === "asc" ? "↑" : "↓"}
                  </Button>

                  {portesDisponiveis.length > 0 && (
                    <Select
                      value={filtros.porte || "_todos"}
                      onValueChange={(v) => setFiltros({ porte: v === "_todos" ? "" : v })}
                    >
                      <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                        <SelectValue placeholder="Porte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_todos">Todos os portes</SelectItem>
                        {portesDisponiveis.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {mercadosDisponiveis.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs">
                          Mercado
                          {filtros.mercados.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                              {filtros.mercados.length}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="end">
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {mercadosDisponiveis.map((m) => {
                            const ativo = filtros.mercados.includes(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() =>
                                  setFiltros({
                                    mercados: ativo
                                      ? filtros.mercados.filter((x) => x !== m)
                                      : [...filtros.mercados, m],
                                  })
                                }
                                className={cn(
                                  "w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 hover:bg-accent",
                                  ativo && "bg-accent",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-3.5 h-3.5 border border-primary rounded-sm flex items-center justify-center",
                                    ativo && "bg-primary text-primary-foreground",
                                  )}
                                >
                                  {ativo && <Check className="w-3 h-3" />}
                                </span>
                                {m}
                              </button>
                            );
                          })}
                          {filtros.mercados.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-full text-xs"
                              onClick={() => setFiltros({ mercados: [] })}
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  <Select
                    value={filtros.periodo}
                    onValueChange={(v) => setFiltros({ periodo: v as Periodo })}
                  >
                    <SelectTrigger className="h-8 w-[140px] bg-background text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3m">Últimos 3 meses</SelectItem>
                      <SelectItem value="6m">Últimos 6 meses</SelectItem>
                      <SelectItem value="1y">Último ano</SelectItem>
                      <SelectItem value="all">Tudo</SelectItem>
                    </SelectContent>
                  </Select>

                  {fornecedoresDuplicados.length > 0 && onMesclarFornecedores && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => onMesclarFornecedores(altsBrutas)}
                      title="Fornecedores aparecem repetidos. Mesclar?"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> Mesclar duplicados
                    </Button>
                  )}
                </div>
              </div>

              {altsBrutas.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3 px-2 rounded bg-background border border-dashed border-primary/20">
                  Nenhuma cotação cadastrada para este item ainda. Use o botão de Atualizar Cotações ou registre uma cotação no histórico.
                </div>
              ) : altsFiltradas.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3 px-2 rounded bg-background border border-dashed border-primary/20 flex items-center gap-2 flex-wrap">
                  <span>Nenhuma cotação no período/filtros selecionados.</span>
                  <Button
                    variant="terracota"
                    size="sm"
                    className="h-8"
                    onClick={() => setFiltros({ periodo: "all", mercados: [], porte: "" })}
                  >
                    Ver tudo
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  {altsFiltradas.map((a, i) => {
                    const ehMenor = menorPrecoId === `${a.fornecedor_id}-${a.preco}`;
                    const ehRecente = maisRecenteId === `${a.fornecedor_id}-${a.data}`;
                    return (
                      <div
                        key={`${a.fornecedor_id}-${i}`}
                        className={cn(
                          "rounded-lg border p-3 bg-background flex flex-wrap items-center gap-3",
                          a.selecionado
                            ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                            : ehMenor
                            ? "border-primary/50"
                            : "border-primary/15",
                        )}
                      >
                        <div className="min-w-[180px] flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{a.fornecedor_nome}</span>
                            {ehMenor && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                                <Sparkles className="w-3 h-3" /> melhor preço
                              </span>
                            )}
                            {ehRecente && !ehMenor && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold">
                                mais recente
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {[a.mercado, a.porte && `porte ${a.porte}`, `cotado em ${fmtData(a.data)}`]
                              .filter(Boolean)
                              .join(" · ")}
                            {a.estrelas != null && ` · ★ ${a.estrelas.toFixed(1)}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-medium text-foreground tabular-nums">{brl(a.preco)}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{a.unidade || ""}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {onEditarCotacao && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-9 px-2"
                              title="Editar cotação"
                              onClick={() => onEditarCotacao(a)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {a.selecionado ? (
                            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                            </span>
                          ) : onSelecionarFornecedor ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="terracota"
                              className="h-9"
                              onClick={() => onSelecionarFornecedor(a)}
                            >
                              <Check className="w-4 h-4" />
                              Selecionar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
