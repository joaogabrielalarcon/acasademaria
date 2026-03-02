import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrcamentoItem {
  id: string;
  projeto_id: string;
  tipo: string;
  planta_id: string | null;
  insumo_id: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  margem_percentual: number;
  reserva_valor: number;
  preco_custo: number;
  preco_venda: number;
  ordem: number;
  observacao: string | null;
  cotacoes?: OrcamentoCotacao[];
}

export interface OrcamentoCotacao {
  id: string;
  item_id: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  preco_unitario: number;
  selecionada: boolean;
  observacao: string | null;
}

export function useOrcamentoItens(projetoId: string | undefined) {
  return useQuery({
    queryKey: ["orcamento-itens", projetoId],
    queryFn: async () => {
      if (!projetoId) return [];
      const { data, error } = await supabase
        .from("orcamento_itens")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("tipo")
        .order("ordem");
      if (error) throw error;
      return data as OrcamentoItem[];
    },
    enabled: !!projetoId,
  });
}

export function useOrcamentoCotacoes(itemIds: string[]) {
  return useQuery({
    queryKey: ["orcamento-cotacoes", itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orcamento_cotacoes")
        .select("*")
        .in("item_id", itemIds)
        .order("created_at");
      if (error) throw error;
      return data as OrcamentoCotacao[];
    },
    enabled: itemIds.length > 0,
  });
}

export function calcularPrecoVenda(precoCusto: number, reserva: number, margemPercent: number): number {
  if (margemPercent >= 100) return 0;
  const divisor = 1 - margemPercent / 100;
  if (divisor <= 0) return 0;
  return (precoCusto + reserva) / divisor;
}

export const tipoItemLabels: Record<string, string> = {
  planta: "Plantas",
  insumo: "Insumos",
  servico: "Serviços",
};

export const tipoItemOrder = ["planta", "insumo", "servico"];
