import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2,
  Settings,
  Wand2,
  Lock,
  Pencil,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  GerenciarPerfisMarkupDialog,
  CATEGORIAS_MARKUP,
  markupToMargem,
  margemToMarkup,
} from "./GerenciarPerfisMarkupDialog";

interface Props {
  orcamentoId: string | undefined;
  perfilSelecionadoId: string;
  onPerfilSelecionado: (id: string) => void;
  tipoNf?: string;
  aliquotaPct?: number;
  areaM2?: number;
  onMissingFaturamento?: () => void;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isFinite(v) ? v : 0);

const fmtPct = (v: number) => `${(isFinite(v) ? v : 0).toFixed(2)}%`;

export function Etapa4MarkupBlocoA(props: Props) {
  const { orcamentoId, perfilSelecionadoId, onPerfilSelecionado, tipoNf, aliquotaPct, areaM2 } = props;
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: roles = [] } = useUserRoles(user?.id);
  const podeGerenciar = roles.some((r) =>
    ["admin", "administrativo", "diretor" as any].includes(r.role as any),
  );

  const [gerenciarOpen, setGerenciarOpen] = useState(false);
  const [editar, setEditar] = useState<{
    open: boolean;
    categoria: string;
    markupAnterior: number;
    margemAnterior: number;
    markupNovo: number;
    margemNova: number;
    fonte: "markup" | "margem";
    motivo: string;
  } | null>(null);

  const perfisQuery = useQuery({
    queryKey: ["perfis-markup-ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("perfis_markup")
        .select("id, nome")
        .eq("ativo", true)
        .eq("arquivado", false)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const markupsQuery = useQuery({
    queryKey: ["orcamento-categorias-markup", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data, error } = await (supabase as any)
        .from("orcamento_categorias_markup")
        .select("*")
        .eq("orcamento_id", orcamentoId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orcamentoId,
  });

  // Custo por categoria — agora cobre todas as fontes de custo do orçamento
  const custosQuery = useQuery({
    queryKey: ["orcamento-custos-categoria", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return {} as Record<string, number>;
      const out: Record<string, number> = {};

      // Material (plantas e similares) — soma por categoria via cotação principal
      const { data: itens } = await (supabase as any)
        .from("orcamento_itens")
        .select("id, categoria, quantidade_esperada")
        .eq("orcamento_id", orcamentoId);
      const lista = itens || [];
      const ids = lista.map((i: any) => i.id);
      let cotacoes: any[] = [];
      if (ids.length > 0) {
        const { data: cot } = await (supabase as any)
          .from("orcamento_cotacoes")
          .select("item_id, valor_unitario_cotado, status_selecao")
          .in("item_id", ids)
          .eq("status_selecao", "principal");
        cotacoes = cot || [];
      }
      const cotMap = new Map(cotacoes.map((c) => [c.item_id, Number(c.valor_unitario_cotado) || 0]));
      lista.forEach((i: any) => {
        const cat = i.categoria || "Sem categoria";
        const qtd = Number(i.quantidade_esperada) || 0;
        const preco = cotMap.get(i.id) || 0;
        out[cat] = (out[cat] || 0) + qtd * preco;
      });

      // Insumos adicionais (não calculados)
      const { data: insumos } = await (supabase as any)
        .from("orcamento_insumos")
        .select("valor_total, calculado_automaticamente")
        .eq("orcamento_id", orcamentoId);
      const totIns = (insumos || [])
        .filter((i: any) => !i.calculado_automaticamente)
        .reduce((s: number, i: any) => s + (Number(i.valor_total) || 0), 0);
      if (totIns > 0) out["Insumos"] = (out["Insumos"] || 0) + totIns;

      // Mão de Obra
      const { data: mo } = await (supabase as any)
        .from("orcamento_mo")
        .select("valor_com_imposto, custo_total")
        .eq("orcamento_id", orcamentoId);
      const totMo = (mo || []).reduce(
        (s: number, m: any) => s + (Number(m.valor_com_imposto) || Number(m.custo_total) || 0),
        0,
      );
      if (totMo > 0) out["Mão de Obra"] = (out["Mão de Obra"] || 0) + totMo;

      // Fretes
      const { data: fretes } = await (supabase as any)
        .from("orcamento_fretes")
        .select("valor_total")
        .eq("orcamento_id", orcamentoId);
      const totFr = (fretes || []).reduce((s: number, f: any) => s + (Number(f.valor_total) || 0), 0);
      if (totFr > 0) out["Fretes"] = (out["Fretes"] || 0) + totFr;

      // Transporte
      const { data: transp } = await (supabase as any)
        .from("orcamento_transporte")
        .select("subtotal")
        .eq("orcamento_id", orcamentoId);
      const totTr = (transp || []).reduce((s: number, t: any) => s + (Number(t.subtotal) || 0), 0);
      if (totTr > 0) out["Transporte"] = (out["Transporte"] || 0) + totTr;

      // Custos indiretos
      const { data: ind } = await (supabase as any)
        .from("orcamento_custos_indiretos")
        .select("total")
        .eq("orcamento_id", orcamentoId);
      const totInd = (ind || []).reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);
      if (totInd > 0) out["Custos Indiretos"] = (out["Custos Indiretos"] || 0) + totInd;

      return out;
    },
    enabled: !!orcamentoId,
  });

  const aplicacao = useMemo(() => {
    const list = (markupsQuery.data as any[]) || [];
    if (list.length === 0) return { tipo: "nenhum" as const, perfilId: null as string | null };
    const algumManual = list.some((l) => l.ajustado_manualmente);
    if (algumManual) return { tipo: "customizado" as const, perfilId: null };
    const perfilIds = Array.from(new Set(list.map((l) => l.perfil_id_aplicado).filter(Boolean)));
    if (perfilIds.length === 1) return { tipo: "perfil" as const, perfilId: perfilIds[0] as string };
    return { tipo: "customizado" as const, perfilId: null };
  }, [markupsQuery.data]);

  const perfilAtualNome =
    aplicacao.tipo === "perfil"
      ? (perfisQuery.data || []).find((p: any) => p.id === aplicacao.perfilId)?.nome
      : null;

  // Map markup por categoria (lookup rápido)
  const markupMap = useMemo(() => {
    const map = new Map<string, any>();
    ((markupsQuery.data as any[]) || []).forEach((m) => map.set(m.categoria, m));
    return map;
  }, [markupsQuery.data]);

  // Categorias presentes no orçamento (com custo > 0 ou já com markup definido)
  const categoriasPresentes = useMemo(() => {
    const custos = custosQuery.data || {};
    const set = new Set<string>();
    Object.keys(custos).forEach((c) => set.add(c));
    markupMap.forEach((_, k) => set.add(k));
    // Ordem canônica primeiro, depois extras
    const ordenadas: string[] = [];
    CATEGORIAS_MARKUP.forEach((c) => {
      if (set.has(c)) {
        ordenadas.push(c);
        set.delete(c);
      }
    });
    Array.from(set).sort().forEach((c) => ordenadas.push(c));
    return ordenadas;
  }, [custosQuery.data, markupMap]);

  const aplicarPerfil = useMutation({
    mutationFn: async (perfilId: string) => {
      if (!orcamentoId) throw new Error("Salve o orçamento primeiro (Etapa 1).");
      const { data: cats, error } = await (supabase as any)
        .from("perfis_markup_categorias")
        .select("categoria, markup_pct, margem_pct")
        .eq("perfil_id", perfilId);
      if (error) throw error;
      if (!cats || cats.length === 0) throw new Error("Perfil sem categorias configuradas.");

      await (supabase as any).from("orcamento_categorias_markup").delete().eq("orcamento_id", orcamentoId);

      const rows = cats.map((c: any) => {
        const mk = Number(c.markup_pct) || 0;
        const mg = c.margem_pct != null ? Number(c.margem_pct) : markupToMargem(mk);
        return {
          orcamento_id: orcamentoId,
          categoria: c.categoria,
          markup_pct: mk,
          margem_pct: mg,
          perfil_id_aplicado: perfilId,
          ajustado_manualmente: false,
        };
      });
      const { error: insErr } = await (supabase as any)
        .from("orcamento_categorias_markup")
        .insert(rows);
      if (insErr) throw insErr;

      await (supabase as any)
        .from("orcamentos")
        .update({ perfil_markup_id: perfilId })
        .eq("id", orcamentoId);

      onPerfilSelecionado(perfilId);
    },
    onSuccess: () => {
      toast({ title: "Perfil aplicado", description: "Markups das categorias atualizados." });
      qc.invalidateQueries({ queryKey: ["orcamento-categorias-markup", orcamentoId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const ajustarMutation = useMutation({
    mutationFn: async () => {
      if (!editar || !orcamentoId) return;
      const { error } = await (supabase as any).rpc("ajustar_markup_categoria", {
        p_orcamento_id: orcamentoId,
        p_categoria: editar.categoria,
        p_markup_pct: editar.markupNovo,
        p_margem_pct: editar.margemNova,
        p_motivo: editar.motivo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Markup ajustado" });
      qc.invalidateQueries({ queryKey: ["orcamento-categorias-markup", orcamentoId] });
      setEditar(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const abrirEdicao = (categoria: string) => {
    if (!podeGerenciar) return;
    const atual = markupMap.get(categoria);
    const mk = atual ? Number(atual.markup_pct) : 0;
    const mg = atual ? Number(atual.margem_pct) : 0;
    setEditar({
      open: true,
      categoria,
      markupAnterior: mk,
      margemAnterior: mg,
      markupNovo: mk,
      margemNova: mg,
      fonte: "markup",
      motivo: "",
    });
  };

  const atualizarValor = (campo: "markup" | "margem", valor: string) => {
    setEditar((prev) => {
      if (!prev) return prev;
      const v = Number(valor);
      if (!isFinite(v) || v < 0) return prev;
      if (campo === "markup") {
        return { ...prev, markupNovo: v, margemNova: markupToMargem(v), fonte: "markup" };
      }
      if (v >= 100) return prev;
      return { ...prev, margemNova: v, markupNovo: margemToMarkup(v), fonte: "margem" };
    });
  };

  // Resumo / cards
  const resumo = useMemo(() => {
    const custos = custosQuery.data || {};
    const aliq = (aliquotaPct ?? 0) / 100;
    const linhas = categoriasPresentes.map((cat) => {
      const custo = custos[cat] || 0;
      const m = markupMap.get(cat);
      const markup = m ? Number(m.markup_pct) : 0;
      const margem = m ? Number(m.margem_pct) : 0;
      const venda = custo * (1 + markup / 100);
      const imposto = venda * aliq;
      const margemRs = venda - custo - imposto;
      return { categoria: cat, custo, markup, margem, venda, imposto, margemRs };
    });
    const totalCusto = linhas.reduce((a, b) => a + b.custo, 0);
    const totalVenda = linhas.reduce((a, b) => a + b.venda, 0);
    const totalImposto = linhas.reduce((a, b) => a + b.imposto, 0);
    const totalMargemRs = linhas.reduce((a, b) => a + b.margemRs, 0);
    const margemPct = totalVenda > 0 ? (totalMargemRs / totalVenda) * 100 : 0;
    const markupMedio =
      totalCusto > 0
        ? linhas.reduce((a, b) => a + b.markup * b.custo, 0) / totalCusto
        : 0;
    const custoPorM2 = areaM2 && areaM2 > 0 ? totalCusto / areaM2 : 0;
    return {
      linhas,
      totalCusto,
      totalVenda,
      totalImposto,
      totalMargemRs,
      margemPct,
      markupMedio,
      custoPorM2,
    };
  }, [categoriasPresentes, custosQuery.data, markupMap, aliquotaPct, areaM2]);

  return (
    <TooltipProvider>
      {/* BLOCO A */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl text-foreground">Markup e Margens</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione um perfil de markup ou ajuste manualmente por categoria.
            </p>
          </div>
          {podeGerenciar && (
            <Button variant="outline" size="sm" onClick={() => setGerenciarOpen(true)}>
              <Settings className="size-4" /> Gerenciar perfis
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label className="text-xs">Perfil de markup</Label>
            <Select value={perfilSelecionadoId || ""} onValueChange={onPerfilSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                {(perfisQuery.data || []).length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum perfil cadastrado.
                  </div>
                ) : (
                  (perfisQuery.data || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => aplicarPerfil.mutate(perfilSelecionadoId)}
            disabled={!perfilSelecionadoId || !orcamentoId || aplicarPerfil.isPending}
          >
            {aplicarPerfil.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Aplicar perfil
          </Button>
        </div>

        <div className="text-sm">
          {aplicacao.tipo === "nenhum" && (
            <span className="text-muted-foreground">
              Nenhum markup aplicado ainda. Selecione um perfil para começar.
            </span>
          )}
          {aplicacao.tipo === "perfil" && perfilAtualNome && (
            <span className="text-foreground">
              Perfil atual: <span className="font-semibold text-primary">{perfilAtualNome}</span>
            </span>
          )}
          {aplicacao.tipo === "customizado" && (
            <span className="text-foreground">
              <span className="font-semibold text-primary">Markup customizado</span> (ajustado
              manualmente, sem perfil)
            </span>
          )}
        </div>

        {!podeGerenciar && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="size-3" />
            Apenas Diretoria e Administrativo podem editar perfis e ajustar markup manualmente.
          </div>
        )}
      </Card>

      {/* BLOCO B — Tabela editável por categoria */}
      <Card className="p-6 mt-4">
        <h3 className="font-display text-lg text-foreground mb-3">Ajuste por categoria</h3>

        {categoriasPresentes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma categoria com itens selecionados ainda. Volte à Etapa 3 e escolha um fornecedor
            principal por item.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Custo total</TableHead>
                  <TableHead className="text-right w-28">Markup %</TableHead>
                  <TableHead className="text-right w-28">Margem %</TableHead>
                  <TableHead className="text-right">Valor de venda</TableHead>
                  <TableHead className="text-right">Impacto</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.linhas.map((l) => {
                  const m = markupMap.get(l.categoria);
                  const ajustado = m?.ajustado_manualmente;
                  const semItens = l.custo === 0;
                  return (
                    <TableRow
                      key={l.categoria}
                      className={ajustado ? "border-l-2 border-l-primary" : ""}
                    >
                      <TableCell className="font-medium">
                        {l.categoria}
                        {semItens && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                            sem itens
                          </span>
                        )}
                        {ajustado && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="inline size-3 ml-1.5 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Markup ajustado manualmente — ver motivo no histórico.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.custo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(l.markup)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(l.margem)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.venda)}</TableCell>
                      <TableCell className="text-right tabular-nums text-primary">
                        {fmtBRL(l.venda - l.custo)}
                      </TableCell>
                      <TableCell>
                        {podeGerenciar ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={semItens}
                            onClick={() => abrirEdicao(l.categoria)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="size-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Apenas Diretoria e Administrativo podem ajustar markup.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* BLOCO C — Resumo financeiro */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 mt-4">
        <Card className="p-6">
          <h3 className="font-display text-lg text-foreground mb-3">Resumo por categoria</h3>
          {!aliquotaPct && (
            <div className="flex items-start gap-2 mb-3 p-2 rounded border border-primary/40 bg-primary/5 text-xs">
              <AlertTriangle className="size-4 text-primary shrink-0 mt-0.5" />
              <span>
                Defina a empresa de faturamento na Etapa 1 para cálculo correto de impostos.
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Markup %</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">
                    Imposto
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="inline size-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Calculado conforme empresa de faturamento{tipoNf ? ` (${tipoNf.toUpperCase()})` : ""}: alíquota {fmtPct(aliquotaPct ?? 0)}
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">Margem R$</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.linhas.map((l) => {
                  const margemPctLinha = l.venda > 0 ? (l.margemRs / l.venda) * 100 : 0;
                  return (
                    <TableRow key={l.categoria}>
                      <TableCell className="font-medium">{l.categoria}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.custo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(l.markup)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.venda)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.imposto)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(l.margemRs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(margemPctLinha)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-muted">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(resumo.totalCusto)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(resumo.markupMedio)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(resumo.totalVenda)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(resumo.totalImposto)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(resumo.totalMargemRs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(resumo.margemPct)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 content-start">
          <CardIndicador
            label="Total ao cliente"
            valor={fmtBRL(resumo.totalVenda)}
            destaque
            full
          />
          <CardIndicador label="Custo total" valor={fmtBRL(resumo.totalCusto)} />
          <CardIndicador
            label="Margem bruta"
            valor={fmtBRL(resumo.totalMargemRs)}
            extra={fmtPct(resumo.margemPct)}
          />
          <CardIndicador
            label="Impostos totais"
            valor={fmtBRL(resumo.totalImposto)}
            extra={
              resumo.totalVenda > 0
                ? `${((resumo.totalImposto / resumo.totalVenda) * 100).toFixed(1)}% do total`
                : undefined
            }
          />
          <CardIndicador
            label="Custo por m²"
            valor={areaM2 && areaM2 > 0 ? fmtBRL(resumo.custoPorM2) : "—"}
            extra={areaM2 && areaM2 > 0 ? `${areaM2} m²` : "Área não informada"}
          />
          <CardIndicador label="Markup médio ponderado" valor={fmtPct(resumo.markupMedio)} />
        </div>
      </div>

      <GerenciarPerfisMarkupDialog open={gerenciarOpen} onOpenChange={setGerenciarOpen} />

      {/* Modal de motivo */}
      <Dialog open={!!editar?.open} onOpenChange={(o) => !o && setEditar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Ajustar markup — {editar?.categoria}</DialogTitle>
          </DialogHeader>
          {editar && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Markup %</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editar.markupNovo.toFixed(2)}
                    onChange={(e) => atualizarValor("markup", e.target.value)}
                    className={editar.fonte === "markup" ? "border-primary" : ""}
                  />
                </div>
                <div>
                  <Label className="text-xs">Margem %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99.99}
                    step={0.01}
                    value={editar.margemNova.toFixed(2)}
                    onChange={(e) => atualizarValor("margem", e.target.value)}
                    className={editar.fonte === "margem" ? "border-primary" : ""}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                {editar.categoria} passa de markup {fmtPct(editar.markupAnterior)} para{" "}
                {fmtPct(editar.markupNovo)} (margem de {fmtPct(editar.margemAnterior)} para{" "}
                {fmtPct(editar.margemNova)})
              </div>
              <div>
                <Label className="text-xs">Motivo do ajuste *</Label>
                <Textarea
                  value={editar.motivo}
                  onChange={(e) => setEditar((p) => (p ? { ...p, motivo: e.target.value } : p))}
                  placeholder="Ex: cliente recorrente, projeto piloto com margem reduzida..."
                  maxLength={500}
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mínimo 10 caracteres ({editar.motivo.trim().length}/500)
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => ajustarMutation.mutate()}
              disabled={
                !editar ||
                editar.motivo.trim().length < 10 ||
                ajustarMutation.isPending ||
                (editar.markupNovo === editar.markupAnterior && editar.margemNova === editar.margemAnterior)
              }
            >
              {ajustarMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function CardIndicador({
  label,
  valor,
  extra,
  destaque,
  full,
}: {
  label: string;
  valor: string;
  extra?: string;
  destaque?: boolean;
  full?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${full ? "col-span-2" : ""} ${
        destaque ? "border-primary bg-primary/5" : ""
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`font-display mt-1 ${
          destaque ? "text-2xl text-primary" : "text-lg text-foreground"
        }`}
      >
        {valor}
      </p>
      {extra && <p className="text-[10px] text-muted-foreground mt-0.5">{extra}</p>}
    </Card>
  );
}

// Helper exportado para a tela pai validar avanço
export function useEtapa4Validacao(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: ["etapa4-validacao", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return { ok: false, motivo: "Orçamento não salvo" };
      const [{ data: orc }, { data: marks }, { data: itens }] = await Promise.all([
        (supabase as any).from("orcamentos").select("aliquota_mes_pct, tipo_nf").eq("id", orcamentoId).maybeSingle(),
        (supabase as any).from("orcamento_categorias_markup").select("categoria, markup_pct").eq("orcamento_id", orcamentoId),
        (supabase as any).from("orcamento_itens").select("categoria").eq("orcamento_id", orcamentoId),
      ]);
      if (!orc?.aliquota_mes_pct) return { ok: false, motivo: "Defina a empresa de faturamento na Etapa 1." };
      const cats = new Set((itens || []).map((i: any) => i.categoria).filter(Boolean));
      const comMarkup = new Set((marks || []).filter((m: any) => m.markup_pct != null).map((m: any) => m.categoria));
      const faltando = Array.from(cats).filter((c) => !comMarkup.has(c));
      if (faltando.length > 0) return { ok: false, motivo: `Defina markup para: ${faltando.join(", ")}` };
      return { ok: true, motivo: "" };
    },
    enabled: !!orcamentoId,
  });
}
