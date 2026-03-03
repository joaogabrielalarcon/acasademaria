import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManutencaoServico {
  id?: string;
  visita_id?: string;
  tipo: string;
  descricao?: string | null;
  quantidade?: number | null;
  unidade?: string | null;
  observacao?: string | null;
}

export interface ManutencaoRecurso {
  id?: string;
  visita_id?: string;
  tipo: "maquina" | "insumo";
  maquina_id?: string | null;
  insumo_id?: string | null;
  quantidade?: number | null;
  unidade?: string | null;
  horas_uso?: number | null;
  observacao?: string | null;
}

export interface ManutencaoVisita {
  id: string;
  projeto_id: string;
  data_visita: string;
  equipe_ids: string[];
  horas_trabalhadas: number;
  horas_por_pessoa: any[];
  ocorrencias: string | null;
  observacoes_internas: string | null;
  midia: { url: string; tipo: string; nome: string }[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  servicos?: ManutencaoServico[];
  recursos?: ManutencaoRecurso[];
}

export const servicoTipos = [
  { value: "poda_geral", label: "Poda Geral" },
  { value: "poda_finos", label: "Poda de Finos" },
  { value: "poda_palmeiras", label: "Poda de Palmeiras" },
  { value: "adubacao", label: "Adubação" },
  { value: "irrigacao_verificacao", label: "Irrigação - Verificação" },
  { value: "irrigacao_regulagem", label: "Irrigação - Regulagem" },
  { value: "irrigacao_reparo", label: "Irrigação - Reparo" },
  { value: "limpeza", label: "Limpeza" },
  { value: "replantio", label: "Replantio" },
  { value: "controle_fitossanitario", label: "Controle Fitossanitário" },
  { value: "outro", label: "Outro" },
] as const;

export const servicoTipoLabels: Record<string, string> = Object.fromEntries(
  servicoTipos.map((s) => [s.value, s.label])
);

export function useManutencaoVisitas(projetoId: string | undefined) {
  return useQuery({
    queryKey: ["manutencao-visitas", projetoId],
    queryFn: async () => {
      if (!projetoId) return [];
      const { data, error } = await supabase
        .from("manutencao_visitas")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("data_visita", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ManutencaoVisita[];
    },
    enabled: !!projetoId,
  });
}

export function useManutencaoServicos(visitaIds: string[]) {
  return useQuery({
    queryKey: ["manutencao-servicos", visitaIds],
    queryFn: async () => {
      if (visitaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("manutencao_servicos")
        .select("*")
        .in("visita_id", visitaIds);
      if (error) throw error;
      return (data ?? []) as unknown as ManutencaoServico[];
    },
    enabled: visitaIds.length > 0,
  });
}

export function useManutencaoRecursos(visitaIds: string[]) {
  return useQuery({
    queryKey: ["manutencao-recursos", visitaIds],
    queryFn: async () => {
      if (visitaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("manutencao_recursos")
        .select("*")
        .in("visita_id", visitaIds);
      if (error) throw error;
      return (data ?? []) as unknown as ManutencaoRecurso[];
    },
    enabled: visitaIds.length > 0,
  });
}

interface SaveVisitaInput {
  projetoId: string;
  data_visita: string;
  equipe_ids: string[];
  horas_trabalhadas: number;
  ocorrencias?: string;
  observacoes_internas?: string;
  midia?: any[];
  servicos: ManutencaoServico[];
  recursos: ManutencaoRecurso[];
}

export function useSaveManutencaoVisita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveVisitaInput) => {
      // 1. Insert visita
      const { data: visita, error: visitaError } = await supabase
        .from("manutencao_visitas")
        .insert({
          projeto_id: input.projetoId,
          data_visita: input.data_visita,
          equipe_ids: input.equipe_ids,
          horas_trabalhadas: input.horas_trabalhadas,
          ocorrencias: input.ocorrencias || null,
          observacoes_internas: input.observacoes_internas || null,
          midia: input.midia || [],
        })
        .select("id")
        .single();

      if (visitaError) throw visitaError;

      // 2. Insert servicos
      if (input.servicos.length > 0) {
        const servicosPayload = input.servicos.map((s) => ({
          visita_id: visita.id,
          tipo: s.tipo,
          descricao: s.descricao || null,
          quantidade: s.quantidade || null,
          unidade: s.unidade || null,
          observacao: s.observacao || null,
        }));
        const { error: sErr } = await supabase
          .from("manutencao_servicos")
          .insert(servicosPayload);
        if (sErr) throw sErr;
      }

      // 3. Insert recursos
      if (input.recursos.length > 0) {
        const recursosPayload = input.recursos.map((r) => ({
          visita_id: visita.id,
          tipo: r.tipo,
          maquina_id: r.maquina_id || null,
          insumo_id: r.insumo_id || null,
          quantidade: r.quantidade || null,
          unidade: r.unidade || null,
          horas_uso: r.horas_uso || null,
          observacao: r.observacao || null,
        }));
        const { error: rErr } = await supabase
          .from("manutencao_recursos")
          .insert(recursosPayload);
        if (rErr) throw rErr;
      }

      return visita;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["manutencao-visitas", input.projetoId] });
    },
  });
}

export function useDeleteManutencaoVisita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projetoId }: { id: string; projetoId: string }) => {
      const { error } = await supabase
        .from("manutencao_visitas")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projetoId;
    },
    onSuccess: (projetoId) => {
      queryClient.invalidateQueries({ queryKey: ["manutencao-visitas", projetoId] });
    },
  });
}
