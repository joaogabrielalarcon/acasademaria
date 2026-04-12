import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Insumo {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string | null;
  preco_unitario: number | null;
  fornecedor_id: string | null;
  descricao_produto: string | null;
  volume_apresentacao: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export function useInsumos() {
  return useQuery({
    queryKey: ["insumos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Insumo[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
