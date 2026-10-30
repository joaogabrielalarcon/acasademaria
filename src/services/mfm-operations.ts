import { supabase } from "@/integrations/supabase/client";

export async function callMfmOperation(operation: string, input: Record<string, unknown>, confirmed = false) {
  const { data, error } = await supabase.functions.invoke("operacoes-mfm", { body: { operation, input, confirmed } });
  if (error) throw error;
  if (data?.error || data?.isError) throw new Error(data.error || data.content?.[0]?.text || "Operação recusada.");
  if (data?.structuredContent?.sumario?.erros) throw new Error(data.structuredContent.resultados.find((row: { status: string }) => row.status === "erro")?.motivo || "Gravação recusada.");
  return data?.structuredContent as Record<string, unknown>;
}

export async function confirmMafeProposal(approval: string) {
  const { data, error } = await supabase.functions.invoke("assistente-mfm", { body: { messages: [], approval } });
  if (error) throw error;
  if (data?.error || data?.isError || data?.structuredContent?.sumario?.erros) throw new Error(data.error || data.content?.[0]?.text || "Não foi possível gravar.");
  return data;
}