import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceiroMovimentacao {
  id: string;
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string;
  valor: number;
  data_movimentacao: string;
  fornecedor_id: string | null;
  estoque_movimentacao_id: string | null;
  registrado_por_nome: string | null;
  created_at: string;
}

export function useFinanceiroMovimentacoes() {
  return useQuery({
    queryKey: ["financeiro-movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financeiro_movimentacoes")
        .select("*")
        .order("data_movimentacao", { ascending: false });
      if (error) throw error;
      return data as unknown as FinanceiroMovimentacao[];
    },
  });
}

export function useRegistrarFinanceiro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tipo: "entrada" | "saida";
      categoria: string;
      descricao: string;
      valor: number;
      data_movimentacao?: string;
      fornecedor_id?: string | null;
      registrado_por_nome?: string;
    }) => {
      const { error } = await supabase.from("financeiro_movimentacoes").insert({
        tipo: payload.tipo,
        categoria: payload.categoria,
        descricao: payload.descricao,
        valor: payload.valor,
        data_movimentacao: payload.data_movimentacao ?? new Date().toISOString().split("T")[0],
        fornecedor_id: payload.fornecedor_id ?? null,
        registrado_por_nome: payload.registrado_por_nome ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeiro-movimentacoes"] });
    },
  });
}
