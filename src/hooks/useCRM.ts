import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CrmCardTipo = "Obra" | "Proposta" | "Manutencao" | "Tarefa";
export type CrmCardStatus = "Lead" | "Proposta Enviada" | "Aprovado" | "Em Execucao" | "Concluido" | "Pos-venda" | "Nao Aprovado";

export interface CrmCard {
  id: string;
  tipo: CrmCardTipo;
  titulo: string;
  status: CrmCardStatus;
  cliente_id: string | null;
  projeto_id: string | null;
  responsavel_id: string | null;
  contato_nome: string | null;
  contato_cargo: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  prazo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  cliente_nome?: string;
  responsavel_nome?: string;
}

export interface CrmHistorico {
  id: string;
  card_id: string;
  colaborador_id: string | null;
  descricao: string;
  created_at: string;
  colaborador_nome?: string;
}

export interface CrmFollowup {
  id: string;
  card_id: string;
  data_retorno: string;
  dias_alerta: number;
  status: "Pendente" | "Feito" | "Adiado";
  observacao: string | null;
  created_at: string;
}

export function useCrmCards() {
  return useQuery({
    queryKey: ["crm-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_cards")
        .select("*, clientes(nome), colaboradores(nome)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        cliente_nome: d.clientes?.nome ?? null,
        responsavel_nome: d.colaboradores?.nome ?? null,
        clientes: undefined,
        colaboradores: undefined,
      })) as CrmCard[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCrmHistorico(cardId: string | null) {
  return useQuery({
    queryKey: ["crm-historico", cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_historico")
        .select("*, colaboradores(nome)")
        .eq("card_id", cardId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        colaborador_nome: d.colaboradores?.nome ?? null,
        colaboradores: undefined,
      })) as CrmHistorico[];
    },
  });
}

export function useCrmFollowups(cardId: string | null) {
  return useQuery({
    queryKey: ["crm-followups", cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_followups")
        .select("*")
        .eq("card_id", cardId!)
        .order("data_retorno", { ascending: true });
      if (error) throw error;
      return data as CrmFollowup[];
    },
  });
}

export function useCreateCrmCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (card: Partial<CrmCard>) => {
      const { data, error } = await supabase
        .from("crm_cards")
        .insert(card as any)
        .select()
        .single();
      if (error) throw error;
      // Create initial history entry
      await supabase.from("crm_historico").insert({
        card_id: data.id,
        descricao: "Card criado",
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-cards"] }),
  });
}

export function useUpdateCrmCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmCard> & { id: string }) => {
      const { data, error } = await supabase
        .from("crm_cards")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-cards"] }),
  });
}

export function useAddCrmHistorico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { card_id: string; descricao: string; colaborador_id?: string }) => {
      const { error } = await supabase.from("crm_historico").insert(entry);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm-historico", vars.card_id] }),
  });
}

export function useCreateCrmFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followup: Partial<CrmFollowup>) => {
      const { error } = await supabase.from("crm_followups").insert(followup as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm-followups", vars.card_id] }),
  });
}

export function useUpdateCrmFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, card_id, ...updates }: Partial<CrmFollowup> & { id: string; card_id: string }) => {
      const { error } = await supabase.from("crm_followups").update(updates as any).eq("id", id);
      if (error) throw error;
      return card_id;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm-followups", vars.card_id] }),
  });
}
