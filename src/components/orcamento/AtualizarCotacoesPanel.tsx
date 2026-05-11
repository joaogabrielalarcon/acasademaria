import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageCircle, Search, Sparkles, Lock, Filter, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/list-states";
import {
  GerarMensagemDialog,
  type ItemCotacaoDisparo,
} from "@/components/orcamento/GerarMensagemDialog";
import { mergeMercadosSugestoes } from "@/lib/mercados";

export interface FornecedorAtualizacaoItem {
  fornecedorId: string;
  fornecedorNome: string;
  mercado?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  itens: ItemCotacaoDisparo[];
}

interface AtualizarCotacoesPanelProps {
  orcamentoId?: string | null;
  fornecedoresEnvolvidos: FornecedorAtualizacaoItem[];
  /** sugestões adicionais de mercado (cadastradas em outros fornecedores) */
  sugestoesMercado?: string[];
  /** quando o operador acionar IA (placeholder até 2C) */
  onIAClick?: () => void;
}

type FiltroIdade = "todos" | "30d" | "60d" | "180d";
type Categoria = "todos" | "planta" | "insumo" | "condicionador_solo";

function mesesDesde(iso?: string | null): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60 * 24 * 30.44);
}

function diasDesde(iso?: string | null): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function semaforoIdade(maisVelhaIso: string | null | undefined) {
  const meses = mesesDesde(maisVelhaIso);
  if (meses === Infinity) return { cls: "bg-muted text-muted-foreground border", label: "sem data" };
  if (meses < 3) return { cls: "bg-primary/15 text-primary border-primary/30", label: "recente" };
  if (meses < 6) return { cls: "bg-amber-500/10 text-amber-700 border-amber-500/30", label: "média" };
  return { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "desatualizada" };
}

export function AtualizarCotacoesPanel({
  orcamentoId,
  fornecedoresEnvolvidos,
  sugestoesMercado = [],
  onIAClick,
}: AtualizarCotacoesPanelProps) {
  const [busca, setBusca] = useState("");
  const [filtroMercado, setFiltroMercado] = useState<string>("todos");
  const [filtroIdade, setFiltroIdade] = useState<FiltroIdade>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria>("todos");
  const [dispatchTarget, setDispatchTarget] = useState<FornecedorAtualizacaoItem | null>(null);

  const mercadosOpcoes = useMemo(() => {
    const cadastradosNoOrcamento = fornecedoresEnvolvidos
      .map((f) => f.mercado)
      .filter((m): m is string => !!m && !!m.trim());
    return mergeMercadosSugestoes([...cadastradosNoOrcamento, ...sugestoesMercado]);
  }, [fornecedoresEnvolvidos, sugestoesMercado]);

  // Para cada fornecedor: cotação mais antiga entre os itens do orçamento
  const enriched = useMemo(
    () =>
      fornecedoresEnvolvidos.map((f) => {
        const datas = f.itens.map((i) => i.ultima_cotacao).filter(Boolean) as string[];
        const maisVelha = datas.length
          ? datas.reduce((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? a : b))
          : null;
        return { ...f, maisVelha };
      }),
    [fornecedoresEnvolvidos],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return enriched.filter((f) => {
      if (q && !f.fornecedorNome.toLowerCase().includes(q)) return false;
      if (filtroMercado !== "todos") {
        const m = String(f.mercado || "").toLowerCase();
        if (!m.includes(filtroMercado.toLowerCase())) return false;
      }
      if (filtroIdade !== "todos") {
        const d = diasDesde(f.maisVelha);
        if (filtroIdade === "30d" && d <= 30) return false;
        if (filtroIdade === "60d" && d <= 60) return false;
        if (filtroIdade === "180d" && d <= 180) return false;
      }
      if (filtroCategoria !== "todos") {
        const tem = f.itens.some((i) => i.item_tipo === filtroCategoria);
        if (!tem) return false;
      }
      return true;
    });
  }, [enriched, busca, filtroMercado, filtroIdade, filtroCategoria]);

  // Agrupamento por mercado (com bucket "Sem mercado")
  const grupos = useMemo(() => {
    const map = new Map<string, typeof filtrados>();
    filtrados.forEach((f) => {
      const k = (f.mercado || "Sem mercado").trim() || "Sem mercado";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(f);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filtrados]);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar fornecedor..."
              className="pl-8 h-9"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={filtroMercado} onValueChange={setFiltroMercado}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Mercado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os mercados</SelectItem>
                {mercadosOpcoes.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroIdade} onValueChange={(v) => setFiltroIdade(v as FiltroIdade)}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Idade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer idade</SelectItem>
                <SelectItem value="30d">Mais de 30 dias</SelectItem>
                <SelectItem value="60d">Mais de 60 dias</SelectItem>
                <SelectItem value="180d">Mais de 6 meses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v as Categoria)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas categorias</SelectItem>
                <SelectItem value="planta">Plantas</SelectItem>
                <SelectItem value="insumo">Insumos</SelectItem>
                <SelectItem value="condicionador_solo">Condicionadores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={onIAClick}
                    disabled={!onIAClick}
                  >
                    <Sparkles className="w-4 h-4" />
                    Atualizar via IA
                    {!onIAClick && <Lock className="w-3 h-3 ml-1" />}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {onIAClick
                  ? "Cole texto, mensagens ou imagens para a IA extrair preços e propor atualizações."
                  : "Disponível em breve — Sub-PR 2C."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>

      {grupos.length === 0 && (
        <EmptyState
          title="Nenhum fornecedor para atualizar"
          description="Selecione fornecedores na aba Comparativo para que apareçam aqui, ou ajuste os filtros."
        />
      )}

      {grupos.map(([mercado, lista]) => (
        <div key={mercado} className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground px-1">
            {mercado} <span className="text-muted-foreground/70">({lista.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lista.map((f) => {
              const sem = semaforoIdade(f.maisVelha);
              const totalItens = f.itens.length;
              return (
                <Card key={f.fornecedorId} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{f.fornecedorNome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.mercado || "Sem mercado"} · {totalItens} {totalItens === 1 ? "item" : "itens"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center gap-1",
                        sem.cls,
                      )}
                      title={f.maisVelha ? `Cotação mais antiga: ${new Date(f.maisVelha).toLocaleDateString("pt-BR")}` : undefined}
                    >
                      <Clock className="w-3 h-3" /> {sem.label}
                    </span>
                  </div>

                  <ul className="text-xs space-y-0.5 max-h-24 overflow-y-auto pr-1">
                    {f.itens.slice(0, 6).map((i, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {i.nome_popular}
                          {i.porte ? ` · ${i.porte}` : ""}
                        </span>
                        <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                          {i.preco_atual != null ? `R$ ${i.preco_atual.toFixed(2)}` : "—"}
                        </span>
                      </li>
                    ))}
                    {f.itens.length > 6 && (
                      <li className="text-[10px] text-muted-foreground italic">
                        + {f.itens.length - 6} item(ns)…
                      </li>
                    )}
                  </ul>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="terracota"
                      onClick={() => setDispatchTarget(f)}
                      disabled={f.itens.length === 0}
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Gerar mensagem
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {dispatchTarget && (
        <GerarMensagemDialog
          open={!!dispatchTarget}
          onOpenChange={(o) => !o && setDispatchTarget(null)}
          orcamentoId={orcamentoId || null}
          fornecedorId={dispatchTarget.fornecedorId}
          fornecedorNome={dispatchTarget.fornecedorNome}
          fornecedorTelefone={dispatchTarget.telefone}
          fornecedorWhatsapp={dispatchTarget.whatsapp}
          itens={dispatchTarget.itens}
        />
      )}
    </div>
  );
}
