import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, RotateCcw, Loader2 } from "lucide-react";

interface Props {
  orcamentoId: string | undefined;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isFinite(v) ? v : 0);

type LinhaAjuste = {
  tabela: string;
  id: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  custoUnit: number;
  markupCategoriaPct: number;
  markupOverridePct: number | null;
  vendaOverride: number | null;
  ajustadoPor: string | null;
  ajustadoEm: string | null;
  ajusteObs: string | null;
};

export function Etapa6AjustesItem({ orcamentoId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const dataQuery = useQuery({
    queryKey: ["etapa6-ajuste-itens", orcamentoId],
    queryFn: async (): Promise<LinhaAjuste[]> => {
      if (!orcamentoId) return [];
      const [{ data: marks }, { data: itens }, { data: cotacoes }, { data: insumos }, { data: mo }, { data: fretes }, { data: transp }, { data: ind }] = await Promise.all([
        (supabase as any).from("orcamento_categorias_markup").select("categoria, markup_pct").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_itens").select("id, categoria, nome_popular, quantidade_orcar, quantidade_esperada, markup_override_pct, preco_venda_override, ajustado_por, ajustado_em, ajuste_obs").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_cotacoes").select("item_id, valor_unitario_cotado, status_selecao"),
        (supabase as any).from("orcamento_insumos").select("id, nome, quantidade_orcar, valor_unitario, calculado_automaticamente, markup_override_pct, ajustado_por, ajustado_em, ajuste_obs").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_mo").select("id, cargo_id, qtd_funcionarios, qtd_dias, valor_com_imposto, custo_total, markup_override_pct, ajustado_por, ajustado_em, ajuste_obs").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_fretes").select("id, transportador, percurso, qtd_orcar, valor_unitario, valor_total, markup_override_pct, ajustado_por, ajustado_em, ajuste_obs").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_transporte").select("id, tipo, subtotal, markup_override_pct, ajustado_por, ajustado_em, ajuste_obs").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_custos_indiretos").select("id, tipo, descricao, valor_unitario, quantidade, total, markup_override_pct, ajustado_por, ajustado_em, ajuste_obs").eq("orcamento_id", orcamentoId),
      ]);

      const markupMap = new Map<string, number>(
        ((marks || []) as any[]).map((m) => [m.categoria, Number(m.markup_pct) || 0]),
      );
      const cotPrincipal = new Map<string, number>(
        ((cotacoes || []) as any[])
          .filter((c) => c.status_selecao === "principal")
          .map((c) => [c.item_id, Number(c.valor_unitario_cotado) || 0]),
      );

      const linhas: LinhaAjuste[] = [];

      ((itens || []) as any[]).forEach((i) => {
        const qtd = Number(i.quantidade_orcar || i.quantidade_esperada) || 0;
        const custo = cotPrincipal.get(i.id) || 0;
        linhas.push({
          tabela: "orcamento_itens",
          id: i.id,
          descricao: i.nome_popular || "(sem nome)",
          categoria: i.categoria || "Sem categoria",
          quantidade: qtd,
          custoUnit: custo,
          markupCategoriaPct: markupMap.get(i.categoria) || 0,
          markupOverridePct: i.markup_override_pct != null ? Number(i.markup_override_pct) : null,
          vendaOverride: i.preco_venda_override != null ? Number(i.preco_venda_override) : null,
          ajustadoPor: i.ajustado_por,
          ajustadoEm: i.ajustado_em,
          ajusteObs: i.ajuste_obs,
        });
      });

      ((insumos || []) as any[])
        .filter((i) => !i.calculado_automaticamente)
        .forEach((i) => {
          linhas.push({
            tabela: "orcamento_insumos",
            id: i.id,
            descricao: i.nome || "(insumo)",
            categoria: "Insumos",
            quantidade: Number(i.quantidade_orcar) || 0,
            custoUnit: Number(i.valor_unitario) || 0,
            markupCategoriaPct: markupMap.get("Insumos") || 0,
            markupOverridePct: i.markup_override_pct != null ? Number(i.markup_override_pct) : null,
            vendaOverride: null,
            ajustadoPor: i.ajustado_por,
            ajustadoEm: i.ajustado_em,
            ajusteObs: i.ajuste_obs,
          });
        });

      ((mo || []) as any[]).forEach((m) => {
        const qtd = (Number(m.qtd_funcionarios) || 1) * (Number(m.qtd_dias) || 1);
        const total = Number(m.valor_com_imposto) || Number(m.custo_total) || 0;
        const unit = qtd > 0 ? total / qtd : total;
        linhas.push({
          tabela: "orcamento_mo",
          id: m.id,
          descricao: `Mão de obra (${m.qtd_funcionarios || 0} pessoa(s) × ${m.qtd_dias || 0} dia(s))`,
          categoria: "Mão de Obra",
          quantidade: qtd,
          custoUnit: unit,
          markupCategoriaPct: markupMap.get("Mão de Obra") || 0,
          markupOverridePct: m.markup_override_pct != null ? Number(m.markup_override_pct) : null,
          vendaOverride: null,
          ajustadoPor: m.ajustado_por,
          ajustadoEm: m.ajustado_em,
          ajusteObs: m.ajuste_obs,
        });
      });

      ((fretes || []) as any[]).forEach((f) => {
        linhas.push({
          tabela: "orcamento_fretes",
          id: f.id,
          descricao: `${f.transportador || "Frete"}${f.percurso ? ` · ${f.percurso}` : ""}`,
          categoria: "Fretes",
          quantidade: Number(f.qtd_orcar) || 0,
          custoUnit: Number(f.valor_unitario) || 0,
          markupCategoriaPct: markupMap.get("Fretes") || 0,
          markupOverridePct: f.markup_override_pct != null ? Number(f.markup_override_pct) : null,
          vendaOverride: null,
          ajustadoPor: f.ajustado_por,
          ajustadoEm: f.ajustado_em,
          ajusteObs: f.ajuste_obs,
        });
      });

      ((transp || []) as any[]).forEach((t) => {
        const sub = Number(t.subtotal) || 0;
        linhas.push({
          tabela: "orcamento_transporte",
          id: t.id,
          descricao: `Transporte ${t.tipo || ""}`,
          categoria: "Transporte",
          quantidade: 1,
          custoUnit: sub,
          markupCategoriaPct: markupMap.get("Transporte") || 0,
          markupOverridePct: t.markup_override_pct != null ? Number(t.markup_override_pct) : null,
          vendaOverride: null,
          ajustadoPor: t.ajustado_por,
          ajustadoEm: t.ajustado_em,
          ajusteObs: t.ajuste_obs,
        });
      });

      ((ind || []) as any[]).forEach((c) => {
        linhas.push({
          tabela: "orcamento_custos_indiretos",
          id: c.id,
          descricao: `${c.tipo || "Indireto"}${c.descricao ? ` · ${c.descricao}` : ""}`,
          categoria: "Custos Indiretos",
          quantidade: Number(c.quantidade) || 1,
          custoUnit: Number(c.valor_unitario) || 0,
          markupCategoriaPct: markupMap.get("Custos Indiretos") || 0,
          markupOverridePct: c.markup_override_pct != null ? Number(c.markup_override_pct) : null,
          vendaOverride: null,
          ajustadoPor: c.ajustado_por,
          ajustadoEm: c.ajustado_em,
          ajusteObs: c.ajuste_obs,
        });
      });

      return linhas;
    },
    enabled: !!orcamentoId,
  });

  const salvar = useMutation({
    mutationFn: async (args: {
      tabela: string;
      id: string;
      markup_override_pct: number | null;
      preco_venda_override?: number | null;
      ajuste_obs: string | null;
    }) => {
      const payload: any = {
        markup_override_pct: args.markup_override_pct,
        ajuste_obs: args.ajuste_obs,
      };
      if (args.tabela === "orcamento_itens") {
        payload.preco_venda_override = args.preco_venda_override ?? null;
      }
      const { error } = await (supabase as any).from(args.tabela).update(payload).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa6-ajuste-itens", orcamentoId] });
      toast({ title: "Ajuste salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const linhas = dataQuery.data || [];
  const porCategoria = useMemo(() => {
    const map = new Map<string, LinhaAjuste[]>();
    linhas.forEach((l) => {
      if (!map.has(l.categoria)) map.set(l.categoria, []);
      map.get(l.categoria)!.push(l);
    });
    return map;
  }, [linhas]);

  return (
    <TooltipProvider>
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="font-display text-lg text-foreground">Ajuste item a item (opcional)</h3>
          <p className="text-xs text-muted-foreground">
            Cada item usa o markup da sua categoria (Etapa 4) como padrão. Editar o markup recalcula
            o valor final, e editar o valor final recalcula o markup. Limpar restaura o padrão.
          </p>
        </div>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item para ajustar.</p>
        ) : (
          Array.from(porCategoria.entries()).map(([cat, rows]) => (
            <div key={cat} className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                {cat}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  · padrão {rows[0].markupCategoriaPct.toFixed(1)}%
                </span>
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Custo unit</TableHead>
                      <TableHead className="text-right w-32">Markup %</TableHead>
                      <TableHead className="text-right w-36">Venda unit</TableHead>
                      <TableHead className="text-right">Venda total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <LinhaRow key={`${row.tabela}-${row.id}`} row={row} onSalvar={salvar.mutate} saving={salvar.isPending} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </Card>
    </TooltipProvider>
  );
}

function LinhaRow({
  row,
  onSalvar,
  saving,
}: {
  row: LinhaAjuste;
  onSalvar: (args: {
    tabela: string;
    id: string;
    markup_override_pct: number | null;
    preco_venda_override?: number | null;
    ajuste_obs: string | null;
  }) => void;
  saving: boolean;
}) {
  const markupEfetivo = row.markupOverridePct ?? row.markupCategoriaPct;
  const vendaEfetiva = row.vendaOverride ?? row.custoUnit * (1 + markupEfetivo / 100);

  const [markupInput, setMarkupInput] = useState(markupEfetivo.toFixed(2));
  const [vendaInput, setVendaInput] = useState(vendaEfetiva.toFixed(2));
  const [obs, setObs] = useState(row.ajusteObs || "");
  const [popOpen, setPopOpen] = useState(false);

  // Reset inputs when source data changes
  useEffect(() => {
    setMarkupInput(markupEfetivo.toFixed(2));
    setVendaInput(vendaEfetiva.toFixed(2));
    setObs(row.ajusteObs || "");
  }, [row.markupOverridePct, row.vendaOverride, row.ajusteObs, row.markupCategoriaPct, row.custoUnit]);

  const onMarkupChange = (val: string) => {
    setMarkupInput(val);
    const n = Number(val);
    if (isFinite(n)) {
      setVendaInput((row.custoUnit * (1 + n / 100)).toFixed(2));
    }
  };
  const onVendaChange = (val: string) => {
    setVendaInput(val);
    const n = Number(val);
    if (isFinite(n) && row.custoUnit > 0) {
      setMarkupInput(((n / row.custoUnit - 1) * 100).toFixed(2));
    }
  };

  const ajustado = row.markupOverridePct != null || row.vendaOverride != null;
  const vendaNum = Number(vendaInput) || 0;
  const markupNum = Number(markupInput) || 0;
  const vendaTotal = vendaNum * row.quantidade;

  const aplicarOverride = () => {
    onSalvar({
      tabela: row.tabela,
      id: row.id,
      markup_override_pct: markupNum,
      preco_venda_override: row.tabela === "orcamento_itens" ? vendaNum : undefined,
      ajuste_obs: obs.trim() || null,
    });
    setPopOpen(false);
  };

  const limpar = () => {
    onSalvar({
      tabela: row.tabela,
      id: row.id,
      markup_override_pct: null,
      preco_venda_override: row.tabela === "orcamento_itens" ? null : undefined,
      ajuste_obs: null,
    });
    setPopOpen(false);
  };

  return (
    <TableRow className={ajustado ? "border-l-2 border-l-primary" : ""}>
      <TableCell className="font-medium">
        {row.descricao}
        {ajustado && row.ajustadoEm && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="inline size-3 ml-1.5 text-primary" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div>Ajustado em {new Date(row.ajustadoEm).toLocaleString("pt-BR")}</div>
                {row.ajusteObs && <div>Obs: {row.ajusteObs}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.quantidade}</TableCell>
      <TableCell className="text-right tabular-nums">{fmtBRL(row.custoUnit)}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="0.01"
          value={markupInput}
          onChange={(e) => onMarkupChange(e.target.value)}
          className="text-right h-8"
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="0.01"
          value={vendaInput}
          onChange={(e) => onVendaChange(e.target.value)}
          className="text-right h-8"
          disabled={row.tabela !== "orcamento_itens" && row.custoUnit === 0}
        />
      </TableCell>
      <TableCell className="text-right tabular-nums">{fmtBRL(vendaTotal)}</TableCell>
      <TableCell>
        <Popover open={popOpen} onOpenChange={setPopOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant={ajustado ? "default" : "outline"} className="h-7 text-xs">
              {ajustado ? "Editar" : "Aplicar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3">
            <div>
              <Label className="text-xs">Observação (opcional)</Label>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Motivo curto (opcional)"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">{obs.length}/200</p>
            </div>
            <div className="flex gap-2 justify-end">
              {ajustado && (
                <Button size="sm" variant="ghost" onClick={limpar} disabled={saving}>
                  <RotateCcw className="size-3" /> Limpar
                </Button>
              )}
              <Button size="sm" onClick={aplicarOverride} disabled={saving}>
                {saving && <Loader2 className="size-3 animate-spin" />}
                Salvar ajuste
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
    </TableRow>
  );
}
