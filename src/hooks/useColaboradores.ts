import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  maquinas_ids: string[];
  tamanho_camiseta: string | null;
  tamanho_calca: string | null;
  tamanho_calcado: string | null;
  ativo: boolean;
}

export function useColaboradores() {
  return useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, area, telefone, endereco, cidade, estado, cep, maquinas_ids, tamanho_camiseta, tamanho_calca, tamanho_calcado, ativo")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Colaborador[];
    },
  });
}

export function useColaboradoresAtivos() {
  return useQuery({
    queryKey: ["colaboradores", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, area, telefone, endereco, cidade, estado, cep, maquinas_ids, tamanho_camiseta, tamanho_calca, tamanho_calcado, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Colaborador[];
    },
  });
}
