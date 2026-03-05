import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiarioAlertaPendente {
  id: string;
  descricao: string;
  created_at: string;
  projeto_id: string;
  cliente_id: string;
  visita_id: string;
  resolvido: boolean;
  projetos: { titulo: string } | null;
  clientes: { nome: string } | null;
}

export function usePendingDiarioAlertas(enabled = true) {
  return useQuery({
    queryKey: ["diario-alertas-pendentes"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diario_alertas" as never)
        .select("id, descricao, created_at, projeto_id, cliente_id, visita_id, resolvido, projetos(titulo), clientes(nome)")
        .eq("resolvido", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as DiarioAlertaPendente[];
    },
    refetchInterval: 60_000,
  });
}

export function useResolveDiarioAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertaId, resolvidoPorNome }: { alertaId: string; resolvidoPorNome: string }) => {
      const { error } = await supabase
        .from("diario_alertas" as never)
        .update({
          resolvido: true,
          resolvido_em: new Date().toISOString(),
          resolvido_por_nome: resolvidoPorNome,
        } as never)
        .eq("id", alertaId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["diario-alertas-pendentes"] }),
        queryClient.invalidateQueries({ queryKey: ["cliente-feed"] }),
      ]);
    },
  });
}
