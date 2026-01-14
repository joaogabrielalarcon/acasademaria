import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoriaServico {
  id: string;
  nome: string;
  cor: string | null;
  ordem: number | null;
  ativo: boolean;
}

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias-servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_servico")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as CategoriaServico[];
    },
  });
}
