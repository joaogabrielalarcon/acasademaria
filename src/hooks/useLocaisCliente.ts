import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LocalCliente {
  id: string;
  cliente_id: string;
  nome: string;
  tipo_pessoa: "fisica" | "juridica";
  endereco_completo: string | null;
  cpf: string | null;
  data_aniversario: string | null;
  razao_social: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  contato_principal: string | null;
  email: string | null;
  assessores: string | null;
  funcionarios_casa: string | null;
  observacoes: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_cliente: string | null;
  created_at: string;
}

export function useLocaisCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["locais", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("locais_cliente")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at");
      if (error) throw error;
      return data as LocalCliente[];
    },
    enabled: !!clienteId,
  });
}

export function useProjetosPorLocal(localId: string | undefined) {
  return useQuery({
    queryKey: ["projetos-local", localId],
    queryFn: async () => {
      if (!localId) return [];
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, status, tipo, created_at")
        .eq("local_id", localId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!localId,
  });
}

export function useSaveLocal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<LocalCliente> & { cliente_id: string; nome: string }) => {
      if (id) {
        const { error } = await supabase
          .from("locais_cliente")
          .update(data as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("locais_cliente")
          .insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais"] });
    },
  });
}

export function useDeleteLocal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locais_cliente")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais"] });
    },
  });
}
