import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X, Plus, Check, ArrowDownUp } from "lucide-react";
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
  mercados: string[]; // vazio = todos
  porte: string; // "" = todos
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
  onAdicionarItem,
}: Props) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "planta" | "insumo">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [soSemForn, setSoSemForn] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [filtrosPorLinha, setFiltrosPorLinha] = useState<Record<string, FiltrosLinha>>({});

  const categorias = useMemo(() => {
    const set = new Set<string>();
    itens.forEach((i) => i.categoria && set.add(i.categoria));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

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

  const semForn = itens.filter((i) => !i.fornecedor_id).length;

  const toggle = (chave: string) =>
    setExpandidos((e) => {
      const next = { ...e, [chave]: !e[chave] };
      return next;
    });

  const collapse = (chave: string) =>
    setExpandidos((e) => ({ ...e, [chave]: false }));

  const setFiltros = (chave: string, patch: Partial<FiltrosLinha>) =>
    setFiltrosPorLinha((prev) => ({
      ...prev,
      [chave]: { ...filtroPadrao, ...(prev[chave] || {}), ...patch },
    }));

  return (
    <Card className="p-0 overflow-hidden border-primary/20">
      <div className="p-3 border-b border-primary/20 bg-secondary/40 flex flex-wrap gap-2 items-center">
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

        <Button
          type="button"
          variant={soSemForn ? "default" : "outline"}
          size="sm"
          onClick={() => setSoSemForn((v) => !v)}
          className="h-9"
          disabled={semForn === 0}
        >
          {semForn} sem fornecedor
        </Button>

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

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filtrados.length} de {itens.length} itens
          </span>
          {onAdicionarItem && (
            <Button type="button" size="sm" variant="terracota" onClick={onAdicionarItem} className="h-9">
              <Plus className="w-4 h-4" /> Adicionar item
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-foreground">
            <tr className="border-b border-primary/20">
              <th className="w-8" />
              <th className="text-left px-3 py-2 font-semibold">Item</th>
              <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Categoria</th>
              <th className="text-right px-3 py-2 font-semibold">Qtd</th>
              <th className="text-left px-3 py-2 font-semibold">Un</th>
              <th className="text-left px-3 py-2 font-semibold hidden lg:table-cell">Fornecedor</th>
              <th className="text-right px-3 py-2 font-semibold">Valor unit.</th>
              <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum item corresponde aos filtros.
                </td>
              </tr>
            )}
            {filtrados.map((it) => {
              const aberto = !!expandidos[it.chave];
              return (
                <LinhaItem
                  key={it.chave}
                  item={it}
                  aberto={aberto}
                  toggle={() => toggle(it.chave)}
                  filtros={filtrosPorLinha[it.chave] || filtroPadrao}
                  setFiltros={(p) => setFiltros(it.chave, p)}
                  getAlternativas={getAlternativas}
                  onSelecionarFornecedor={(alt) => {
                    onSelecionarFornecedor?.(it, alt);
                    collapse(it.chave);
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LinhaItem({
  item,
  aberto,
  toggle,
  filtros,
  setFiltros,
  getAlternativas,
  onSelecionarFornecedor,
}: {
  item: ItemProjeto;
  aberto: boolean;
  toggle: () => void;
  filtros: FiltrosLinha;
  setFiltros: (patch: Partial<FiltrosLinha>) => void;
  getAlternativas?: (item: ItemProjeto) => AlternativaFornecedor[];
  onSelecionarFornecedor?: (alt: AlternativaFornecedor) => void;
}) {
  const semForn = !item.fornecedor_id;

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
    // Selecionado sempre no topo
    arr.sort((a, b) => (b.selecionado ? 1 : 0) - (a.selecionado ? 1 : 0));
    return arr;
  }, [altsBrutas, filtros]);

  return (
    <>
      <tr
        className={cn(
          "border-b border-primary/10 cursor-pointer hover:bg-accent/40 transition-colors",
          aberto && "bg-accent/30",
        )}
        onClick={toggle}
      >
        <td className="px-2 py-2 align-middle text-muted-foreground">
          {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="px-3 py-2 align-middle">
          <div className="font-medium text-foreground">{item.nome}</div>
          {item.tipo === "planta" && item.nome_cientifico && (
            <div className="text-xs text-muted-foreground italic">{item.nome_cientifico}</div>
          )}
          {item.porte && <div className="text-xs text-muted-foreground">Porte {item.porte}</div>}
          <div className="md:hidden text-xs text-muted-foreground mt-0.5">{item.categoria || "—"}</div>
        </td>
        <td className="px-3 py-2 align-middle hidden md:table-cell text-muted-foreground">
          {item.categoria || "—"}
        </td>
        <td className="px-3 py-2 align-middle text-right tabular-nums">
          {item.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
        </td>
        <td className="px-3 py-2 align-middle text-muted-foreground">{item.unidade || "—"}</td>
        <td className="px-3 py-2 align-middle hidden lg:table-cell">
          {semForn ? (
            <span className="text-destructive text-xs font-medium">Sem fornecedor</span>
          ) : (
            <span className="text-foreground text-xs">{item.fornecedor_nome || "Selecionado"}</span>
          )}
        </td>
        <td className="px-3 py-2 align-middle text-right tabular-nums">{brl(item.valor_unitario)}</td>
        <td className="px-3 py-2 align-middle hidden md:table-cell">
          <div className="flex flex-wrap gap-1">
            <Badge variant={item.tipo === "planta" ? "default" : "secondary"} className="text-[10px]">
              {item.tipo}
            </Badge>
            {item.badges.map((b) => (
              <Badge
                key={b}
                variant={b === "sem fornecedor" ? "destructive" : "outline"}
                className="text-[10px] capitalize"
              >
                {b}
              </Badge>
            ))}
          </div>
        </td>
      </tr>
      {aberto && (
        <tr className="bg-secondary/30 border-b border-primary/20">
          <td colSpan={8} className="px-4 py-3">
            <div className="space-y-2">
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
                    onClick={() =>
                      setFiltros({ sortDir: filtros.sortDir === "asc" ? "desc" : "asc" })
                    }
                    title={filtros.sortDir === "asc" ? "Crescente" : "Decrescente"}
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
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
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
                </div>
              </div>

              {altsBrutas.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  Nenhuma cotação disponível para este item.
                </div>
              ) : altsFiltradas.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  Nenhuma cotação no período/filtros selecionados.
                  <Button
                    variant="link"
                    size="sm"
                    className="h-6 px-1 text-xs"
                    onClick={() => setFiltros({ periodo: "all", mercados: [], porte: "" })}
                  >
                    Ver tudo
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-left py-1 pr-3">Fornecedor</th>
                        <th className="text-left py-1 pr-3">Mercado</th>
                        <th className="text-left py-1 pr-3">Porte</th>
                        <th className="text-right py-1 pr-3">Preço</th>
                        <th className="text-left py-1 pr-3">Un</th>
                        <th className="text-left py-1 pr-3">Última cotação</th>
                        <th className="text-left py-1 pr-3">★</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {altsFiltradas.map((a, i) => (
                        <tr
                          key={`${a.fornecedor_id}-${i}`}
                          className={cn(
                            "border-t border-primary/10",
                            a.selecionado && "bg-primary/5",
                          )}
                        >
                          <td className="py-1.5 pr-3 font-medium text-foreground">
                            {a.fornecedor_nome}
                          </td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{a.mercado || "—"}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{a.porte || "—"}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{brl(a.preco)}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{a.unidade || "—"}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{fmtData(a.data)}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">
                            {a.estrelas != null ? a.estrelas.toFixed(1) : "—"}
                          </td>
                          <td className="py-1.5 text-right">
                            {a.selecionado ? (
                              <Badge variant="default" className="text-[10px]">
                                Selecionado
                              </Badge>
                            ) : onSelecionarFornecedor ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="terracota"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelecionarFornecedor(a);
                                }}
                              >
                                Selecionar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
