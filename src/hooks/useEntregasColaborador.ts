import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntregaColaborador {
  id: string;
  colaborador_id: string;
  insumo_id: string;
  quantidade: number;
  data_entrega: string;
  observacao: string | null;
  created_at: string;
}

export interface EntregaComInsumo extends EntregaColaborador {
  insumo: {
    id: string;
    nome: string;
    unidade: string | null;
  } | null;
}

export function useEntregasColaborador(colaboradorId?: string) {
  return useQuery({
    queryKey: ["entregas_colaborador", colaboradorId],
    queryFn: async () => {
      let query = supabase
        .from("entregas_colaborador")
        .select(`
          id,
          colaborador_id,
          insumo_id,
          quantidade,
          data_entrega,
          observacao,
          created_at,
          insumo:insumos(id, nome, unidade)
        `)
        .order("data_entrega", { ascending: false });

      if (colaboradorId) {
        query = query.eq("colaborador_id", colaboradorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as EntregaComInsumo[];
    },
    enabled: !!colaboradorId,
  });
}

export function useCreateEntrega() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entrega: {
      colaborador_id: string;
      insumo_id: string;
      quantidade: number;
      data_entrega: string;
      observacao?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("entregas_colaborador")
        .insert(entrega)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entregas_colaborador", variables.colaborador_id] });
    },
  });
}

export function useDeleteEntrega() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, colaboradorId }: { id: string; colaboradorId: string }) => {
      const { error } = await supabase
        .from("entregas_colaborador")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, colaboradorId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entregas_colaborador", variables.colaboradorId] });
    },
  });
}
