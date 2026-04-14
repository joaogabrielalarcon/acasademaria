import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EstoqueMovimentacao {
  id: string;
  item_id: string;
  item_tipo: "insumo" | "planta";
  tipo_movimento: "entrada" | "saida";
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  fornecedor_id: string | null;
  origem: "manual" | "diario" | "compra";
  referencia_id: string | null;
  observacoes: string | null;
  registrado_por_nome: string | null;
  created_at: string;
}

export interface EstoqueSaldo {
  item_id: string;
  item_tipo: string;
  saldo: number;
  total_entradas: number;
  total_saidas: number;
  ultima_movimentacao: string | null;
}

export function useEstoqueMovimentacoes(itemTipo?: "insumo" | "planta") {
  return useQuery({
    queryKey: ["estoque-movimentacoes", itemTipo],
    queryFn: async () => {
      let query = supabase
        .from("estoque_movimentacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (itemTipo) {
        query = query.eq("item_tipo", itemTipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EstoqueMovimentacao[];
    },
  });
}

export function useEstoqueSaldos(itemTipo?: "insumo" | "planta") {
  return useQuery({
    queryKey: ["estoque-saldos", itemTipo],
    queryFn: async () => {
      let query = supabase.from("estoque_saldo").select("*");
      if (itemTipo) {
        query = query.eq("item_tipo", itemTipo);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EstoqueSaldo[];
    },
  });
}

export function useRegistrarMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      item_id: string;
      item_tipo: "insumo" | "planta";
      tipo_movimento: "entrada" | "saida";
      quantidade: number;
      preco_unitario?: number;
      fornecedor_id?: string | null;
      origem: "manual" | "compra";
      observacoes?: string;
      registrado_por_nome?: string;
    }) => {
      const { error } = await supabase.from("estoque_movimentacoes").insert({
        item_id: payload.item_id,
        item_tipo: payload.item_tipo,
        tipo_movimento: payload.tipo_movimento,
        quantidade: payload.quantidade,
        preco_unitario: payload.preco_unitario ?? 0,
        fornecedor_id: payload.fornecedor_id ?? null,
        origem: payload.origem,
        observacoes: payload.observacoes ?? null,
        registrado_por_nome: payload.registrado_por_nome ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estoque-movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["estoque-saldos"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-movimentacoes"] });
    },
  });
}
