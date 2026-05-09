import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, FileCheck2, FileX2, Send, Files, Percent, DollarSign, Filter } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, subMonths, startOfMonth, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrcamentoRow {
  id: string;
  codigo: string | null;
  status: string;
  tipo_proposta_id: string | null;
  created_at: string | null;
  data_criacao: string | null;
  data_envio: string | null;
  data_aprovacao: string | null;
  data_nao_aprovacao: string | null;
  valor_negociado_final: number | null;
  cidade: string | null;
  estado: string | null;
}

interface TipoProposta { id: string; nome: string; sigla: string | null; }

const PERIODOS = [
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "180", label: "Últimos 6 meses" },
  { value: "365", label: "Últimos 12 meses" },
  { value: "all", label: "Todo o período" },
];

const isNaoAprovado = (s: string) => s === "nao_aprovado" || s === "cancelado";

// Paleta terracota monocromática
const PALETTE = [
  "hsl(10 65% 38%)",
  "hsl(10 65% 50%)",
  "hsl(22 50% 60%)",
  "hsl(10 65% 28%)",
  "hsl(22 40% 75%)",
  "hsl(10 50% 70%)",
];

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_cotacao: "Em Cotação",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovado: "Aprovado",
  expirado: "Expirado",
  cancelado: "Não Aprovado",
  nao_aprovado: "Não Aprovado",
  revisao: "Em Revisão",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}
function KpiCard({ label, value, hint, Icon, highlight }: KpiCardProps) {
  return (
    <Card className={`p-4 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`font-display text-2xl mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`rounded-lg p-2 ${highlight ? "bg-primary/15" : "bg-muted"}`}>
          <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
    </Card>
  );
}

export default function Indicadores() {
  const [periodo, setPeriodo] = useState<string>("180");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-proposta"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("tipos_proposta").select("id, nome, sigla").order("nome");
      return (data || []) as TipoProposta[];
    },
  });

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamentos-indicadores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orcamentos")
        .select("id, codigo, status, tipo_proposta_id, created_at, data_criacao, data_envio, data_aprovacao, data_nao_aprovacao, valor_negociado_final, cidade, estado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrcamentoRow[];
    },
  });

  const dataLimite = useMemo(() => {
    if (periodo === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(periodo));
    return d;
  }, [periodo]);

  const filtrados = useMemo(() => {
    return orcamentos.filter((o) => {
      if (tipoFiltro !== "todos" && o.tipo_proposta_id !== tipoFiltro) return false;
      if (dataLimite) {
        const ref = o.data_criacao || o.created_at;
        if (!ref) return false;
        if (!isAfter(parseISO(ref), dataLimite)) return false;
      }
      return true;
    });
  }, [orcamentos, dataLimite, tipoFiltro]);

  // KPIs
  const total = filtrados.length;
  const enviados = filtrados.filter((o) =>
    ["aguardando_aprovacao", "aprovado", "nao_aprovado", "cancelado", "expirado"].includes(o.status),
  ).length;
  const aprovados = filtrados.filter((o) => o.status === "aprovado").length;
  const naoAprovados = filtrados.filter((o) => isNaoAprovado(o.status)).length;
  const decididos = aprovados + naoAprovados;
  const taxaConversao = decididos > 0 ? (aprovados / decididos) * 100 : 0;
  const valorAprovado = filtrados
    .filter((o) => o.status === "aprovado")
    .reduce((s, o) => s + (Number(o.valor_negociado_final) || 0), 0);
  const ticketMedio = aprovados > 0 ? valorAprovado / aprovados : 0;

  // Distribuição por status
  const distribStatus = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach((o) => {
      const k = isNaoAprovado(o.status) ? "nao_aprovado" : o.status;
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }));
  }, [filtrados]);

  // Volume mensal (últimos 6 meses do filtro ou data atual)
  const volumeMensal = useMemo(() => {
    const meses = 6;
    const buckets: { key: string; label: string; criados: number; aprovados: number; nao_aprovados: number }[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.push({
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM/yy", { locale: ptBR }),
        criados: 0,
        aprovados: 0,
        nao_aprovados: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    filtrados.forEach((o) => {
      const ref = o.data_criacao || o.created_at;
      if (!ref) return;
      const k = format(parseISO(ref), "yyyy-MM");
      const i = idx.get(k);
      if (i == null) return;
      buckets[i].criados++;
      if (o.status === "aprovado") buckets[i].aprovados++;
      else if (isNaoAprovado(o.status)) buckets[i].nao_aprovados++;
    });
    return buckets;
  }, [filtrados]);

  // Conversão mensal
  const conversaoMensal = useMemo(() => {
    return volumeMensal.map((b) => {
      const dec = b.aprovados + b.nao_aprovados;
      return { label: b.label, taxa: dec > 0 ? Number(((b.aprovados / dec) * 100).toFixed(1)) : 0 };
    });
  }, [volumeMensal]);

  // Top tipos de proposta
  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach((o) => {
      const t = tipos.find((x) => x.id === o.tipo_proposta_id);
      const nome = t?.nome || t?.sigla || "Sem tipo";
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtrados, tipos]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-foreground">Indicadores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Painel executivo — visão consolidada de performance e conversão
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </div>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Tipo de proposta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(periodo !== "180" || tipoFiltro !== "todos") && (
              <Button variant="ghost" size="sm" onClick={() => { setPeriodo("180"); setTipoFiltro("todos"); }}>
                Limpar
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtrados.length} de {orcamentos.length} orçamentos
            </span>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPIs Orçamentos */}
            <section className="space-y-3">
              <h2 className="font-display text-lg text-foreground">Orçamentos</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <KpiCard label="Total" value={String(total)} Icon={Files} />
                <KpiCard label="Enviados" value={String(enviados)} Icon={Send} />
                <KpiCard label="Aprovados" value={String(aprovados)} Icon={FileCheck2} />
                <KpiCard label="Não aprovados" value={String(naoAprovados)} Icon={FileX2} />
                <KpiCard
                  label="Conversão"
                  value={`${taxaConversao.toFixed(1)}%`}
                  hint={`${aprovados} de ${decididos} decididos`}
                  Icon={Percent}
                  highlight
                />
                <KpiCard label="Valor aprovado" value={formatCurrency(valorAprovado)} Icon={DollarSign} />
                <KpiCard label="Ticket médio" value={formatCurrency(ticketMedio)} Icon={TrendingUp} />
              </div>
            </section>

            {/* Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-display text-base text-foreground mb-3">Volume mensal</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(10 65% 38% / 0.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(10 65% 38%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(10 65% 38%)" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(27 100% 97%)",
                          border: "1px solid hsl(10 65% 38% / 0.2)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="criados" name="Criados" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="aprovados" name="Aprovados" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="nao_aprovados" name="Não aprov." fill={PALETTE[3]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-display text-base text-foreground mb-3">Taxa de conversão (mensal)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversaoMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(10 65% 38% / 0.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(10 65% 38%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(10 65% 38%)" }} domain={[0, 100]} />
                      <Tooltip
                        formatter={(v: number) => `${v}%`}
                        contentStyle={{
                          background: "hsl(27 100% 97%)",
                          border: "1px solid hsl(10 65% 38% / 0.2)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="taxa" stroke={PALETTE[0]} strokeWidth={3} dot={{ r: 4, fill: PALETTE[0] }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-display text-base text-foreground mb-3">Distribuição por status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribStatus}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(e: any) => `${e.value}`}
                      >
                        {distribStatus.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(27 100% 97%)",
                          border: "1px solid hsl(10 65% 38% / 0.2)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-display text-base text-foreground mb-3">Top tipos de proposta</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porTipo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(10 65% 38% / 0.1)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(10 65% 38%)" }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(10 65% 38%)" }} width={120} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(27 100% 97%)",
                          border: "1px solid hsl(10 65% 38% / 0.2)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" name="Orçamentos" fill={PALETTE[0]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>

            <p className="text-xs text-muted-foreground text-center pt-4">
              Mais indicadores serão adicionados aqui conforme novos dados se tornarem mensuráveis.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
