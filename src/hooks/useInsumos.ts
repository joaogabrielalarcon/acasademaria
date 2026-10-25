import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoProduto = "insumo" | "condicionador_solo";

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
  ultima_compra: string | null;
  ativo: boolean;
  tipo_produto: TipoProduto;
  is_base: boolean;
  base_ordem: number | null;
}

export function useInsumos() {
  return useQuery({
    queryKey: ["insumos"],
    queryFn: async () => {

      const pageSize = 1000;
      let from = 0;
      const all: Insumo[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("insumos")
          .select("id, nome, categoria, unidade, preco_unitario, fornecedor_id, descricao_produto, volume_apresentacao, observacoes, ultima_compra, ativo, tipo_produto, is_base, base_ordem")
          .eq("ativo", true)
          .order("nome", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          throw error;
        }
        const batch = (data ?? []) as Insumo[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
