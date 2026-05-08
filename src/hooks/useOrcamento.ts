import { useQuery } from "@tanstack/react-query";

// NOTE: Legacy hooks. The original orcamento_itens / orcamento_cotacoes tables
// were replaced by the new "Módulo de Orçamento" schema (cabeçalho em
// `orcamentos` + `orcamento_itens` com nova estrutura). Estes hooks foram
// neutralizados para manter o build até a UI antiga ser substituída.

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

export function useOrcamentoItens(_projetoId: string | undefined) {
  return useQuery({
    queryKey: ["orcamento-itens-legacy", _projetoId],
    queryFn: async () => [] as OrcamentoItem[],
    enabled: false,
  });
}

export function useOrcamentoCotacoes(_itemIds: string[]) {
  return useQuery({
    queryKey: ["orcamento-cotacoes-legacy", _itemIds],
    queryFn: async () => [] as OrcamentoCotacao[],
    enabled: false,
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
