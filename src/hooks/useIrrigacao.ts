import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IrrigacaoSetor {
  id: string;
  projeto_id: string;
  nome: string;
  descricao_area: string | null;
  foto_url: string | null;
  tempo_atual_minutos: number;
  created_at: string;
  updated_at: string;
}

export interface IrrigacaoHistorico {
  id: string;
  setor_id: string;
  projeto_id: string;
  tempo_anterior_minutos: number | null;
  tempo_novo_minutos: number;
  origem: string | null;
  colaborador_id: string | null;
  observacao: string | null;
  created_at: string;
}

export function useIrrigacaoSetores(projetoId: string | undefined) {
  return useQuery({
    queryKey: ["irrigacao-setores", projetoId],
    queryFn: async () => {
      if (!projetoId) return [];
      const { data, error } = await supabase
        .from("irrigacao_setores")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as IrrigacaoSetor[];
    },
    enabled: !!projetoId,
  });
}

export function useIrrigacaoHistorico(setorId: string | undefined) {
  return useQuery({
    queryKey: ["irrigacao-historico", setorId],
    queryFn: async () => {
      if (!setorId) return [];
      const { data, error } = await supabase
        .from("irrigacao_historico")
        .select("*")
        .eq("setor_id", setorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as IrrigacaoHistorico[];
    },
    enabled: !!setorId,
  });
}

export function useAddSetor(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao_area?: string; tempo_atual_minutos?: number; foto_url?: string }) => {
      const { data, error } = await supabase
        .from("irrigacao_setores")
        .insert({ projeto_id: projetoId, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigacao-setores", projetoId] });
    },
  });
}

export function useUpdateSetorFoto(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { setorId: string; foto_url: string | null }) => {
      const { error } = await supabase
        .from("irrigacao_setores")
        .update({ foto_url: payload.foto_url, updated_at: new Date().toISOString() })
        .eq("id", payload.setorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigacao-setores", projetoId] });
    },
  });
}

export function useUpdateSetorTempo(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      setorId: string;
      tempoAnterior: number;
      tempoNovo: number;
      observacao?: string;
      colaboradorId?: string;
    }) => {
      const { error: updateError } = await supabase
        .from("irrigacao_setores")
        .update({ tempo_atual_minutos: payload.tempoNovo, updated_at: new Date().toISOString() })
        .eq("id", payload.setorId);
      if (updateError) throw updateError;

      const { error: histError } = await supabase
        .from("irrigacao_historico")
        .insert({
          setor_id: payload.setorId,
          projeto_id: projetoId,
          tempo_anterior_minutos: payload.tempoAnterior,
          tempo_novo_minutos: payload.tempoNovo,
          origem: "Manual",
          colaborador_id: payload.colaboradorId || null,
          observacao: payload.observacao || null,
        });
      if (histError) throw histError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigacao-setores", projetoId] });
      queryClient.invalidateQueries({ queryKey: ["irrigacao-historico"] });
    },
  });
}

export function useDeleteSetor(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setorId: string) => {
      const { error } = await supabase
        .from("irrigacao_setores")
        .delete()
        .eq("id", setorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigacao-setores", projetoId] });
    },
  });
}
