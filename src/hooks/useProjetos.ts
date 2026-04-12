import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Projeto {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  valor_total: number | null;
  valor_mensal: number | null;
  dia_vencimento: number | null;
  data_inicio: string | null;
  data_previsao: string | null;
  data_conclusao: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  tipo: string;
  local_id: string | null;
  created_at: string;
  updated_at: string;
}

export const projetoStatusConfig: Record<string, { label: string; className: string }> = {
  orcamento: { label: "Orçamento", className: "bg-amber-500/20 text-amber-700" },
  aprovado: { label: "Aprovado", className: "bg-blue-500/20 text-blue-700" },
  em_execucao: { label: "Em Execução", className: "bg-primary/20 text-primary" },
  concluido: { label: "Concluído", className: "bg-green-500/20 text-green-700" },
  nao_aprovado: { label: "Não Aprovado", className: "bg-muted text-muted-foreground" },
};

export function useProjetosCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["projetos", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("projetos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Projeto[];
    },
    enabled: !!clienteId,
  });
}

export function useProjeto(id: string | undefined) {
  return useQuery({
    queryKey: ["projeto", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("projetos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Projeto | null;
    },
    enabled: !!id,
  });
}
