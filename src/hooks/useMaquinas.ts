import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Maquina {
  id: string;
  nome: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  status: string;
  ativo: boolean;
}

export function useMaquinas() {
  return useQuery({
    queryKey: ["maquinas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maquinas")
        .select("*")
        .eq("ativo", true)
        .eq("status", "ativa")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Maquina[];
    },
  });
}
