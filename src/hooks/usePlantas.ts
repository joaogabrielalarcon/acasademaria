import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Planta {
  id: string;
  nome_popular: string;
  nome_cientifico: string | null;
  categoria_id: string | null;
  fornecedor_id: string | null;
  porte: string | null;
  altura_cm: number | null;
  dap_cm: number | null;
  unidade: string | null;
  nota_qualidade: number | null;
  preco_unitario: number | null;
  midia: { url: string; tipo: string; nome: string }[] | null;
  ativo: boolean;
}

export function usePlantas() {
  return useQuery({
    queryKey: ["plantas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plantas")
        .select("*")
        .eq("ativo", true)
        .order("nome_popular", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Planta[];
    },
  });
}
