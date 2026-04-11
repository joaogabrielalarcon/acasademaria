import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useConciliacaoLancamentos(extratoId: string | null) {
  return useQuery({
    queryKey: ["conciliacao-lancamentos", extratoId],
    queryFn: async () => {
      if (!extratoId) return [];
      const { data, error } = await supabase
        .from("conciliacao_lancamentos")
        .select("*, clientes(nome)")
        .eq("extrato_id", extratoId)
        .order("data_lancamento", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!extratoId,
  });
}

export function useConciliacaoExtratos() {
  return useQuery({
    queryKey: ["conciliacao-extratos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conciliacao_extratos")
        .select("*")
        .order("processado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useImportarExtrato() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      arquivo_base64: string;
      banco: string;
      arquivo_nome: string;
      data_extrato: string;
      tipo_arquivo: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/conciliacao-extrato`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Erro ao processar extrato");
      }

      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conciliacao-extratos"] });
      queryClient.invalidateQueries({ queryKey: ["conciliacao-lancamentos"] });
      toast({
        title: "Extrato processado",
        description: `${data.total} transações encontradas: ${data.identificados} identificadas, ${data.pendentes} pendentes.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useDarBaixa() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("conciliacao_lancamentos")
        .update({ status: "baixado" })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["conciliacao-lancamentos"] });
      toast({ title: "Sucesso", description: `${count} pagamento(s) baixado(s) com sucesso.` });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useConfirmarCliente() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      lancamentoId: string;
      clienteId: string;
      remetente_raw?: string;
      conta_raw?: string;
      chave_pix_raw?: string;
    }) => {
      // Update lancamento
      const { error: updErr } = await supabase
        .from("conciliacao_lancamentos")
        .update({ cliente_id: params.clienteId, status: "identificado" })
        .eq("id", params.lancamentoId);
      if (updErr) throw updErr;

      // Create rule for future matching
      const regraData: Record<string, unknown> = { cliente_id: params.clienteId };
      if (params.chave_pix_raw) regraData.chave_pix = params.chave_pix_raw;
      if (params.conta_raw) regraData.conta = params.conta_raw;
      if (params.remetente_raw) regraData.nome_remetente = params.remetente_raw;

      const { error: regraErr } = await supabase
        .from("conciliacao_regras")
        .insert(regraData);
      if (regraErr) throw regraErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conciliacao-lancamentos"] });
      toast({ title: "Cliente identificado", description: "Regra salva para futuras identificações." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}
