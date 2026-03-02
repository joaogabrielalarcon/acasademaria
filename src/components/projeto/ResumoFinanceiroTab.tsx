import { useMemo } from "react";
import { TrendingUp, TrendingDown, Percent, DollarSign } from "lucide-react";
import { OrcamentoItem, tipoItemLabels, tipoItemOrder } from "@/hooks/useOrcamento";

interface ResumoFinanceiroTabProps {
  itens: OrcamentoItem[];
}

export function ResumoFinanceiroTab({ itens }: ResumoFinanceiroTabProps) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const resumo = useMemo(() => {
    const totalCusto = itens.reduce((s, i) => s + (i.preco_custo || 0) * (i.quantidade || 1), 0);
    const totalVenda = itens.reduce((s, i) => s + (i.preco_venda || 0) * (i.quantidade || 1), 0);
    const totalReserva = itens.reduce((s, i) => s + (i.reserva_valor || 0) * (i.quantidade || 1), 0);
    const lucro = totalVenda - totalCusto - totalReserva;
    const margemMedia = totalVenda > 0 ? ((totalVenda - totalCusto) / totalVenda) * 100 : 0;

    // By type
    const porTipo = tipoItemOrder.map((tipo) => {
      const filtered = itens.filter((i) => i.tipo === tipo);
      const custo = filtered.reduce((s, i) => s + (i.preco_custo || 0) * (i.quantidade || 1), 0);
      const venda = filtered.reduce((s, i) => s + (i.preco_venda || 0) * (i.quantidade || 1), 0);
      const reserva = filtered.reduce((s, i) => s + (i.reserva_valor || 0) * (i.quantidade || 1), 0);
      return {
        tipo,
        label: tipoItemLabels[tipo],
        count: filtered.length,
        custo,
        venda,
        reserva,
        margem: venda > 0 ? ((venda - custo) / venda) * 100 : 0,
      };
    }).filter((t) => t.count > 0);

    // Items without cotação
    const semCotacao = itens.filter((i) => (i.preco_custo || 0) === 0).length;

    return { totalCusto, totalVenda, totalReserva, lucro, margemMedia, porTipo, semCotacao };
  }, [itens]);

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-botanical p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Custo Total</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(resumo.totalCusto)}</p>
        </div>

        <div className="card-botanical p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Valor de Venda</p>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(resumo.totalVenda)}</p>
        </div>

        <div className="card-botanical p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Margem Média</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{resumo.margemMedia.toFixed(1)}%</p>
        </div>

        <div className="card-botanical p-5">
          <div className="flex items-center gap-2 mb-2">
            {resumo.lucro >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <p className="text-sm text-muted-foreground">Lucro Estimado</p>
          </div>
          <p className={`text-2xl font-bold ${resumo.lucro >= 0 ? "text-green-700" : "text-destructive"}`}>
            {formatCurrency(resumo.lucro)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            (Venda - Custo - Reservas)
          </p>
        </div>
      </div>

      {/* Alert for items without quotation */}
      {resumo.semCotacao > 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-700 font-medium">
            ⚠ {resumo.semCotacao} {resumo.semCotacao === 1 ? "item" : "itens"} sem cotação selecionada — o resumo pode estar incompleto.
          </p>
        </div>
      )}

      {/* Breakdown by type */}
      <div className="card-botanical overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-display font-semibold text-foreground">Detalhamento por Categoria</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Categoria</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Itens</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Custo</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Reserva</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Venda</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Margem</th>
              </tr>
            </thead>
            <tbody>
              {resumo.porTipo.map((row) => (
                <tr key={row.tipo} className="border-b last:border-0">
                  <td className="p-3 font-medium text-foreground">{row.label}</td>
                  <td className="p-3 text-center text-muted-foreground">{row.count}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatCurrency(row.custo)}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatCurrency(row.reserva)}</td>
                  <td className="p-3 text-right font-medium text-foreground">{formatCurrency(row.venda)}</td>
                  <td className="p-3 text-right font-medium text-foreground">{row.margem.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-semibold">
                <td className="p-3 text-foreground">Total</td>
                <td className="p-3 text-center text-foreground">{itens.length}</td>
                <td className="p-3 text-right text-foreground">{formatCurrency(resumo.totalCusto)}</td>
                <td className="p-3 text-right text-foreground">{formatCurrency(resumo.totalReserva)}</td>
                <td className="p-3 text-right text-primary">{formatCurrency(resumo.totalVenda)}</td>
                <td className="p-3 text-right text-foreground">{resumo.margemMedia.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top items by value */}
      {itens.length > 0 && (
        <div className="card-botanical overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-display font-semibold text-foreground">Maiores Itens (por valor de venda)</h3>
          </div>
          <div className="divide-y">
            {[...itens]
              .sort((a, b) => (b.preco_venda * b.quantidade) - (a.preco_venda * a.quantidade))
              .slice(0, 5)
              .map((item) => {
                const total = item.preco_venda * item.quantidade;
                const pct = resumo.totalVenda > 0 ? (total / resumo.totalVenda) * 100 : 0;
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">{tipoItemLabels[item.tipo]} · {item.quantidade} {item.unidade}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-foreground">{formatCurrency(total)}</p>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% do total</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
