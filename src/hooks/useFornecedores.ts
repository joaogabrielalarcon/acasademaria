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

      const pageSize = 1000;
      let from = 0;
      const all: Fornecedor[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("fornecedores")
          .select("id, nome, cnpj, telefone, email, whatsapp, endereco, cidade, estado, observacoes, status, mercado, categoria_fornecedor, nome_alternativo")
          .eq("status", "ativo")
          .order("nome", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          throw error;
        }
        const batch = (data ?? []) as Fornecedor[];
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

export function useFornecedoresTodos() {
  return useQuery({
    queryKey: ["fornecedores-todos"],
    queryFn: async () => {
      const pageSize = 1000;
      let from = 0;
      const all: Fornecedor[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("fornecedores")
          .select("id, nome, cnpj, telefone, email, whatsapp, endereco, cidade, estado, observacoes, status, mercado, categoria_fornecedor, nome_alternativo")
          .order("nome", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        const batch = (data ?? []) as Fornecedor[];
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
