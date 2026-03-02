import { useMemo } from "react";
import { Package, Check, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OrcamentoItem, tipoItemLabels, tipoItemOrder } from "@/hooks/useOrcamento";

interface ExecucaoTabProps {
  projetoId: string;
  clienteId: string;
  itens: OrcamentoItem[];
}

interface RecebimentoItem {
  planta_id: string | null;
  insumo_id: string | null;
  quantidade: number;
  tipo_item: string;
}

export function ExecucaoTab({ projetoId, clienteId, itens }: ExecucaoTabProps) {
  // Fetch recebimento_itens from registros linked to this project
  const { data: recebimentos = [] } = useQuery({
    queryKey: ["recebimentos-projeto", projetoId],
    queryFn: async () => {
      // Get registros of type recebimento linked to this project
      const { data: regs, error: regError } = await supabase
        .from("registros")
        .select("id")
        .eq("projeto_id", projetoId)
        .in("tipo", ["recebimento", "recebimento_materiais"]);
      if (regError) throw regError;
      if (!regs || regs.length === 0) return [];

      const regIds = regs.map((r) => r.id);
      const { data, error } = await supabase
        .from("recebimento_itens")
        .select("planta_id, insumo_id, quantidade, tipo_item")
        .in("registro_id", regIds);
      if (error) throw error;
      return data as RecebimentoItem[];
    },
  });

  // Build comparison table
  const comparacao = useMemo(() => {
    // Sum purchased quantities by planta_id/insumo_id
    const compradoMap = new Map<string, number>();
    recebimentos.forEach((r) => {
      const key = r.planta_id || r.insumo_id || "";
      if (key) compradoMap.set(key, (compradoMap.get(key) || 0) + r.quantidade);
    });

    return itens
      .filter((item) => item.tipo === "planta" || item.tipo === "insumo")
      .map((item) => {
        const itemKey = item.planta_id || item.insumo_id || "";
        const comprado = compradoMap.get(itemKey) || 0;
        const orcado = item.quantidade;
        const diferenca = comprado - orcado;
        const status: "completo" | "parcial" | "excedente" | "pendente" =
          comprado === 0
            ? "pendente"
            : diferenca === 0
            ? "completo"
            : diferenca > 0
            ? "excedente"
            : "parcial";

        return {
          id: item.id,
          descricao: item.descricao,
          tipo: item.tipo,
          unidade: item.unidade,
          orcado,
          comprado,
          diferenca,
          status,
        };
      });
  }, [itens, recebimentos]);

  const stats = useMemo(() => {
    const total = comparacao.length;
    const completos = comparacao.filter((c) => c.status === "completo").length;
    const parciais = comparacao.filter((c) => c.status === "parcial").length;
    const pendentes = comparacao.filter((c) => c.status === "pendente").length;
    const excedentes = comparacao.filter((c) => c.status === "excedente").length;
    return { total, completos, parciais, pendentes, excedentes };
  }, [comparacao]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const statusBadge = (status: string) => {
    switch (status) {
      case "completo":
        return (
          <Badge className="bg-green-500/15 text-green-700 border-green-500/30 gap-1">
            <Check className="w-3 h-3" /> Completo
          </Badge>
        );
      case "parcial":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
            <AlertCircle className="w-3 h-3" /> Parcial
          </Badge>
        );
      case "excedente":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 gap-1">
            <Package className="w-3 h-3" /> Excedente
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground gap-1">
            <X className="w-3 h-3" /> Pendente
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Itens Materiais</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Compra Completa</p>
          <p className="text-2xl font-bold text-green-700">{stats.completos}</p>
        </div>
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Compra Parcial</p>
          <p className="text-2xl font-bold text-amber-700">{stats.parciais}</p>
        </div>
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Pendente</p>
          <p className="text-2xl font-bold text-muted-foreground">{stats.pendentes}</p>
        </div>
      </div>

      {/* Comparison table */}
      {comparacao.length > 0 ? (
        <div className="card-botanical overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-display font-semibold text-foreground">Orçado vs Comprado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Comparação entre itens orçados e materiais recebidos no projeto
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Orçado</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Comprado</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Diferença</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {comparacao.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-3 font-medium text-foreground">{row.descricao}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {tipoItemLabels[row.tipo] || row.tipo}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-foreground">
                      {row.orcado} {row.unidade}
                    </td>
                    <td className="p-3 text-right text-foreground">
                      {row.comprado} {row.unidade}
                    </td>
                    <td className={`p-3 text-right font-medium ${
                      row.diferenca > 0
                        ? "text-blue-700"
                        : row.diferenca < 0
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}>
                      {row.diferenca > 0 ? "+" : ""}{row.diferenca} {row.unidade}
                    </td>
                    <td className="p-3 text-center">{statusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum item material no orçamento</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione plantas ou insumos ao orçamento para acompanhar as compras.
          </p>
        </div>
      )}
    </div>
  );
}
