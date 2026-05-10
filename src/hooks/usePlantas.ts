import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Planta {
  id: string;
  nome_popular: string;
  nome_cientifico: string | null;
  categoria_id: string | null;
  fornecedor_id: string | null;
  altura_m: number | null;
  altura_min_m: number | null;
  altura_max_m: number | null;
  dap_cm: number | null;
  unidade: string | null;
  embalagem: string | null;
  alerta_validacao: string | null;
  nota_qualidade: number | null;
  preco_unitario: number | null;
  midia: { url: string; tipo: string; nome: string }[] | null;
  ativo: boolean;
}

export function usePlantas() {
  return useQuery({
    queryKey: ["plantas"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("[usePlantas] Sem sessão ativa — query pode falhar com RLS");
      }

      // Paginação manual para contornar o limite padrão de 1000 linhas do Supabase
      const pageSize = 1000;
      let from = 0;
      const all: Planta[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("plantas")
          .select("*")
          .eq("ativo", true)
          .order("nome_popular", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("[usePlantas] Erro na query:", error);
          throw error;
        }
        const batch = (data ?? []) as unknown as Planta[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }

      console.log(`[usePlantas] ${all.length} plantas retornadas`);
      return all;
    },
    staleTime: 1000 * 60 * 5,
  });
}
