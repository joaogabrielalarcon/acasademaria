import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Colaborador {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  area_id: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  maquinas_ids: string[];
  tamanho_camiseta: string | null;
  tamanho_calca: string | null;
  tamanho_calcado: string | null;
  observacoes: string | null;
  data_nascimento: string | null;
  cpf: string | null;
  ativo: boolean;
  foto_url: string | null;
  // Campos de acesso ao sistema
  user_id: string | null;
  email: string | null;
  username: string | null;
}

export function useColaboradores() {
  return useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, area, area_id, telefone, endereco, cidade, estado, cep, maquinas_ids, tamanho_camiseta, tamanho_calca, tamanho_calcado, observacoes, data_nascimento, cpf, ativo, foto_url, user_id, email, username")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Error fetching colaboradores:", error);
        // Return empty array if permission denied (non-admin users)
        if (error.code === "42501" || error.message.includes("permission")) {
          return [];
        }
        throw error;
      }
      return data as Colaborador[];
    },
  });
}

// Hook for basic colaborador info (accessible to all authenticated users)
export interface ColaboradorBasico {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  area_id: string | null;
  ativo: boolean;
  foto_url: string | null;
}

export function useColaboradoresBasico() {
  return useQuery({
    queryKey: ["colaboradores", "basico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores_basico")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as ColaboradorBasico[];
    },
  });
}

export function useColaboradoresAtivos() {
  return useQuery({
    queryKey: ["colaboradores", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, area, area_id, telefone, endereco, cidade, estado, cep, maquinas_ids, tamanho_camiseta, tamanho_calca, tamanho_calcado, observacoes, data_nascimento, cpf, ativo, foto_url, user_id, email, username")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) {
        console.error("Error fetching colaboradores ativos:", error);
        if (error.code === "42501" || error.message.includes("permission")) {
          return [];
        }
        throw error;
      }
      return data as Colaborador[];
    },
  });
}

// Hook for basic active colaboradores (accessible to all authenticated users)
export function useColaboradoresAtivosBasico() {
  return useQuery({
    queryKey: ["colaboradores", "ativos", "basico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores_basico")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as ColaboradorBasico[];
    },
  });
}