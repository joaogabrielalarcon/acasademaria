import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { OrcamentoItem, tipoItemLabels, tipoItemOrder } from "@/hooks/useOrcamento";

interface DashboardTabProps {
  itens: OrcamentoItem[];
  projetoStatus: string;
  dataCriacao: string;
  dataPrevisao?: string | null;
}

const COLORS = ["hsl(11, 66%, 38%)", "hsl(18, 68%, 70%)", "hsl(25, 80%, 60%)", "hsl(142, 60%, 40%)"];

export function DashboardTab({ itens, projetoStatus, dataCriacao, dataPrevisao }: DashboardTabProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const data = useMemo(() => {
    // By type chart
    const byType = tipoItemOrder
      .map((tipo) => {
        const filtered = itens.filter((i) => i.tipo === tipo);
        return {
          name: tipoItemLabels[tipo],
          custo: filtered.reduce((s, i) => s + (i.preco_custo || 0) * (i.quantidade || 1), 0),
          venda: filtered.reduce((s, i) => s + (i.preco_venda || 0) * (i.quantidade || 1), 0),
          count: filtered.length,
        };
      })
      .filter((d) => d.count > 0);

    // Pie data
    const pie = byType.map((d) => ({ name: d.name, value: d.venda }));

    // Totals
    const totalCusto = itens.reduce((s, i) => s + (i.preco_custo || 0) * (i.quantidade || 1), 0);
    const totalVenda = itens.reduce((s, i) => s + (i.preco_venda || 0) * (i.quantidade || 1), 0);
    const semCotacao = itens.filter((i) => (i.preco_custo || 0) === 0).length;
    const comCotacao = itens.length - semCotacao;
    const completude = itens.length > 0 ? (comCotacao / itens.length) * 100 : 0;

    return { byType, pie, totalCusto, totalVenda, semCotacao, comCotacao, completude };
  }, [itens]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-md">
          <p className="font-medium text-foreground text-sm">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm text-muted-foreground">
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="card-botanical p-5">
        <h3 className="font-display font-semibold text-foreground mb-3">Completude do Orçamento</h3>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${data.completude}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>{data.comCotacao} de {itens.length} itens com cotação</span>
          <span>{data.completude.toFixed(0)}%</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart - Custo vs Venda */}
        {data.byType.length > 0 && (
          <div className="card-botanical p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Custo vs Venda por Categoria</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byType} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(11, 66%, 38%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(11, 66%, 38%)" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="custo" name="Custo" fill="hsl(18, 68%, 80%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="venda" name="Venda" fill="hsl(11, 66%, 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pie chart - Distribution */}
        {data.pie.length > 0 && (
          <div className="card-botanical p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Distribuição do Valor</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.pie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.pie.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Project info summary */}
      <div className="card-botanical p-5">
        <h3 className="font-display font-semibold text-foreground mb-3">Resumo do Projeto</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Criado em</p>
            <p className="text-foreground">
              {new Date(dataCriacao).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {dataPrevisao && (
            <div>
              <p className="text-sm text-muted-foreground">Previsão de Conclusão</p>
              <p className="text-foreground">
                {new Date(dataPrevisao + "T12:00:00").toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Valor Total de Venda</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(data.totalVenda)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Margem Bruta</p>
            <p className="text-xl font-bold text-foreground">
              {data.totalVenda > 0
                ? `${(((data.totalVenda - data.totalCusto) / data.totalVenda) * 100).toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
