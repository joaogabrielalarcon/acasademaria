import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ItemProjeto } from "@/pages/NovoOrcamento";

interface AlternativaFornecedor {
  fornecedor_id: string;
  fornecedor_nome: string;
  porte?: string | null;
  preco?: number | null;
  data?: string | null;
  estrelas?: number | null;
  mercado?: string | null;
  selecionado?: boolean;
}

interface Props {
  itens: ItemProjeto[];
  /** Devolve alternativas (cotações) para o item — read-only nesta sub-fase */
  getAlternativas?: (item: ItemProjeto) => AlternativaFornecedor[];
  /** Ação de selecionar fornecedor (opcional nesta sub-fase) */
  onSelecionarFornecedor?: (item: ItemProjeto, fornecedorId: string) => void;
}

const brl = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

export function TabelaItensProjeto({ itens, getAlternativas, onSelecionarFornecedor }: Props) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "planta" | "insumo">("todos");
  const [soSemForn, setSoSemForn] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((it) => {
      if (tipoFiltro !== "todos" && it.tipo !== tipoFiltro) return false;
      if (soSemForn && it.fornecedor_id) return false;
      if (q && !it.nome.toLowerCase().includes(q) && !(it.categoria || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [itens, busca, tipoFiltro, soSemForn]);

  const semForn = itens.filter((i) => !i.fornecedor_id).length;

  const toggle = (chave: string) => setExpandidos((e) => ({ ...e, [chave]: !e[chave] }));

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

        {(busca || tipoFiltro !== "todos" || soSemForn) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setBusca("");
              setTipoFiltro("todos");
              setSoSemForn(false);
            }}
          >
            <X className="w-4 h-4" /> Limpar
          </Button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          {filtrados.length} de {itens.length} itens
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
              const alts = aberto && getAlternativas ? getAlternativas(it) : [];
              return (
                <FragmentRow
                  key={it.chave}
                  item={it}
                  aberto={aberto}
                  alts={alts}
                  toggle={() => toggle(it.chave)}
                  onSelecionarFornecedor={onSelecionarFornecedor}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FragmentRow({
  item,
  aberto,
  alts,
  toggle,
  onSelecionarFornecedor,
}: {
  item: ItemProjeto;
  aberto: boolean;
  alts: AlternativaFornecedor[];
  toggle: () => void;
  onSelecionarFornecedor?: (item: ItemProjeto, fornecedorId: string) => void;
}) {
  const semForn = !item.fornecedor_id;
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
            <span className="text-foreground text-xs">Selecionado</span>
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
            {alts.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Nenhuma cotação disponível para este item.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Cotações disponíveis
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-left py-1 pr-3">Fornecedor</th>
                        <th className="text-left py-1 pr-3">Mercado</th>
                        <th className="text-left py-1 pr-3">Porte</th>
                        <th className="text-right py-1 pr-3">Preço</th>
                        <th className="text-left py-1 pr-3">Data</th>
                        <th className="text-left py-1 pr-3">★</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {alts.map((a, i) => (
                        <tr key={`${a.fornecedor_id}-${i}`} className="border-t border-primary/10">
                          <td className="py-1.5 pr-3 font-medium text-foreground">{a.fornecedor_nome}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{a.mercado || "—"}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{a.porte || "—"}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{brl(a.preco)}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{fmtData(a.data)}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">
                            {a.estrelas != null ? `${a.estrelas.toFixed(1)}` : "—"}
                          </td>
                          <td className="py-1.5 text-right">
                            {a.selecionado ? (
                              <Badge variant="default" className="text-[10px]">Selecionado</Badge>
                            ) : onSelecionarFornecedor ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelecionarFornecedor(item, a.fornecedor_id);
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
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
