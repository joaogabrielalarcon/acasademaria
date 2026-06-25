import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InsumoUnidade {
  id: string;
  insumo_id: string;
  unidade: string;
  descricao: string | null;
  fator_para_padrao: number | null;
  is_padrao: boolean;
  ordem: number;
}

/** Lista as formas de compra cadastradas para um insumo. */
export function useInsumoUnidades(insumoId: string | null | undefined) {
  return useQuery({
    queryKey: ["insumo_unidades", insumoId],
    enabled: !!insumoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumo_unidades")
        .select("*")
        .eq("insumo_id", insumoId as string)
        .order("is_padrao", { ascending: false })
        .order("ordem", { ascending: true })
        .order("unidade", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InsumoUnidade[];
    },
    staleTime: 30_000,
  });
}

/** Adiciona uma forma de compra a um insumo (idempotente por unique). */
export function useAdicionarInsumoUnidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      insumo_id: string;
      unidade: string;
      descricao?: string | null;
      is_padrao?: boolean;
    }) => {
      const unidade = args.unidade.trim();
      if (!unidade) throw new Error("Unidade vazia");
      const { data, error } = await supabase
        .from("insumo_unidades")
        .upsert(
          {
            insumo_id: args.insumo_id,
            unidade,
            descricao: args.descricao ?? null,
            is_padrao: !!args.is_padrao,
          },
          { onConflict: "insumo_id,unidade" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data as InsumoUnidade;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["insumo_unidades", row.insumo_id] });
    },
  });
}
