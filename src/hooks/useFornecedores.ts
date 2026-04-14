import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  whatsapp: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  status: string;
  mercado: string | null;
  categoria_fornecedor: string | null;
  nome_alternativo: string | null;
}

export function useFornecedores() {
  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("[useFornecedores] Sem sessão ativa");
      }

      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("status", "ativo")
        .order("nome", { ascending: true });

      if (error) {
        console.error("[useFornecedores] Erro na query:", error);
        throw error;
      }

      console.log(`[useFornecedores] ${data?.length ?? 0} fornecedores retornados`);
      return data as Fornecedor[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFornecedoresTodos() {
  return useQuery({
    queryKey: ["fornecedores-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Fornecedor[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
