import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  status: string;
}

export function useFornecedores() {
  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("status", "ativo")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Fornecedor[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
