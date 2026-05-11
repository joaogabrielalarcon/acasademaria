import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Atendente {
  id: string;
  fornecedor_id: string;
  nome: string;
  telefone: string | null;
  funcao: string | null;
  email: string | null;
  ativo: boolean;
  observacoes: string | null;
}

export function useAtendentes(fornecedorId?: string) {
  return useQuery({
    queryKey: ["fornecedor-atendentes", fornecedorId],
    enabled: !!fornecedorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedor_atendentes" as any)
        .select("*")
        .eq("fornecedor_id", fornecedorId)
        .order("ativo", { ascending: false })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Atendente[];
    },
  });
}

export function useSaveAtendente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Atendente> & { fornecedor_id: string; nome: string }) => {
      const payload = {
        fornecedor_id: input.fornecedor_id,
        nome: input.nome,
        telefone: input.telefone ?? null,
        funcao: input.funcao ?? null,
        email: input.email ?? null,
        ativo: input.ativo ?? true,
        observacoes: input.observacoes ?? null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("fornecedor_atendentes" as any)
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("fornecedor_atendentes" as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["fornecedor-atendentes", vars.fornecedor_id] });
    },
    onError: (e: any) => toast.error("Erro ao salvar atendente: " + (e?.message ?? "")),
  });
}

export function useDeleteAtendente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; fornecedor_id: string }) => {
      const { error } = await supabase.from("fornecedor_atendentes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["fornecedor-atendentes", vars.fornecedor_id] });
      toast.success("Atendente removido");
    },
    onError: (e: any) => toast.error("Erro ao remover: " + (e?.message ?? "")),
  });
}

// Atendente padrão por operador
export function useMeuAtendentePadrao(fornecedorId?: string) {
  return useQuery({
    queryKey: ["meu-atendente-padrao", fornecedorId],
    enabled: !!fornecedorId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("operador_atendente_padrao" as any)
        .select("atendente_id")
        .eq("operador_id", user.id)
        .eq("fornecedor_id", fornecedorId)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.atendente_id as string) ?? null;
    },
  });
}

export function useSetMeuAtendentePadrao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fornecedor_id, atendente_id }: { fornecedor_id: string; atendente_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("operador_atendente_padrao" as any)
        .upsert(
          { operador_id: user.id, fornecedor_id, atendente_id },
          { onConflict: "operador_id,fornecedor_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["meu-atendente-padrao", vars.fornecedor_id] });
      toast.success("Atendente padrão definido");
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message ?? "")),
  });
}
