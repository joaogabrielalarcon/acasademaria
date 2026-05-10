import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const INVALIDATION_MAP: Record<string, string[][]> = {
  fornecedores: [
    ["fornecedores"],
    ["fornecedores-todos"],
    ["fornecedores-ativos-lista"],
    ["fornecedores-resumo"],
    ["fornecedor-detalhe"],
    ["fornecedores-duplicados"],
    ["transportadoras"],
    ["historico-fornecedores-orc"],
    ["plantas"],
    ["insumos"],
  ],
  plantas: [["plantas"], ["historico-fornecedores-orc"]],
  insumos: [["insumos"], ["historico-fornecedores-orc"]],
  historico_precos: [["historico-fornecedores-orc"], ["historico-precos"]],
  orcamento_itens: [["orcamento-hidratacao"], ["orcamento-itens"]],
  orcamento_cotacoes: [["orcamento-hidratacao"], ["orcamento-cotacoes"], ["historico-fornecedores-orc"]],
  orcamento_insumos: [["orcamento-hidratacao"]],
};

export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("catalog-and-budget-realtime-sync");

    Object.keys(INVALIDATION_MAP).forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          INVALIDATION_MAP[table].forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        },
      );
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function RealtimeInvalidationBridge() {
  useRealtimeInvalidation();
  return null;
}