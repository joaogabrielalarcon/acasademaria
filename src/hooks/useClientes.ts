import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClienteBasico {
  id: string;
  nome: string;
}

export interface ClienteListagem {
  id: string;
  nome: string;
  bairro: string | null;
  status: string;
}

// Hook para lista simples de clientes (para selects/dropdowns)
export function useClientesSimples() {
  return useQuery({
    queryKey: ["clientes-simples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .order("nome");
      
      if (error) throw error;
      return data as ClienteBasico[];
    },
  });
}

// Hook para lista de clientes com mais detalhes (para listagem)
export function useClientesListagem() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, bairro, status")
        .order("nome");
      
      if (error) throw error;
      return data as ClienteListagem[];
    },
  });
}
