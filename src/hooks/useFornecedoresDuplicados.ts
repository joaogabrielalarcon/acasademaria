import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FornecedorDuplicadoItem = {
  id: string;
  nome: string;
  nome_alternativo: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  mercado: string | null;
  qtd_plantas: number;
  qtd_insumos: number;
  qtd_historico: number;
  qtd_estoque: number;
  qtd_fin: number;
  qtd_cotacoes: number;
  total_uso: number;
};

export type GrupoDuplicados = {
  grupo_key: string;
  confianca: "alta" | "media";
  fornecedores: FornecedorDuplicadoItem[];
};

export function useFornecedoresDuplicados(enabled: boolean = true) {
  return useQuery({
    queryKey: ["fornecedores-duplicados"],
    enabled,
    queryFn: async (): Promise<GrupoDuplicados[]> => {
      const { data, error } = await supabase.rpc("detectar_fornecedores_duplicados" as any);
      if (error) throw error;
      return (data as GrupoDuplicados[]) || [];
    },
    staleTime: 60_000,
  });
}

export function useMergeFornecedores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      principalId,
      duplicadoIds,
    }: {
      principalId: string;
      duplicadoIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("merge_fornecedores" as any, {
        p_principal_id: principalId,
        p_duplicado_ids: duplicadoIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      qc.invalidateQueries({ queryKey: ["fornecedores-todos"] });
      qc.invalidateQueries({ queryKey: ["fornecedores-duplicados"] });
      qc.invalidateQueries({ queryKey: ["plantas"] });
      qc.invalidateQueries({ queryKey: ["insumos"] });
      toast.success(`${data?.mesclados ?? 0} fornecedor(es) mesclado(s) com sucesso!`);
    },
    onError: (e: any) => {
      toast.error("Erro ao mesclar: " + (e?.message ?? "desconhecido"));
    },
  });
}
