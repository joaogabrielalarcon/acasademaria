import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoriaPlanta {
  id: string;
  nome: string;
  campos_obrigatorios: string[];
  ordem: number;
  ativo: boolean;
}

export function useCategoriasPlantas() {
  return useQuery({
    queryKey: ["categorias_plantas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_plantas")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as CategoriaPlanta[];
    },
  });
}
