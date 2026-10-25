import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlantaBusca {
  id: string;
  nome_popular: string;
  nome_cientifico: string | null;
  unidade: string | null;
  porte: string | null;
  altura_m: number | null;
  dap_cm: number | null;
  categoria_id: string | null;
  preco_unitario: number | null;
}
export interface InsumoBusca { id: string; nome: string; categoria: string | null; unidade: string | null }
export interface FornecedorBusca { id: string; nome: string; cidade: string | null; estado: string | null }

export type CatalogoTipo = "plantas" | "insumos" | "fornecedores";
type ResultadoPorTipo = { plantas: PlantaBusca; insumos: InsumoBusca; fornecedores: FornecedorBusca };

const RPC: Record<CatalogoTipo, "buscar_plantas" | "buscar_insumos" | "buscar_fornecedores"> = {
  plantas: "buscar_plantas",
  insumos: "buscar_insumos",
  fornecedores: "buscar_fornecedores",
};

/** Debounces a text value. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Server-side catalog search (max 30 rows). Plants require a typed term; others list the first 30 when empty. */
export function useCatalogoBusca<T extends CatalogoTipo>(tipo: T, termo: string, enabled = true) {
  const q = useDebounced(termo.trim(), 250);
  const precisaTermo = tipo === "plantas";
  return useQuery({
    queryKey: ["catalogo-busca", tipo, q],
    enabled: enabled && (!precisaTermo || q.length >= 2),
    staleTime: 60_000,
    queryFn: async (): Promise<ResultadoPorTipo[T][]> => {
      const { data, error } = await supabase.rpc(RPC[tipo], { p_query: q, p_limit: 30 });
      if (error) throw error;
      return (data ?? []) as unknown as ResultadoPorTipo[T][];
    },
  });
}

/** Loads only the given plant ids (for already-linked items). */
export function usePlantasPorIds(ids: string[]) {
  const unicos = Array.from(new Set(ids.filter(Boolean))).sort();
  return useQuery({
    queryKey: ["plantas-por-ids", unicos],
    enabled: unicos.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<PlantaBusca[]> => {
      const { data, error } = await supabase
        .from("plantas")
        .select("id, nome_popular, nome_cientifico, unidade, porte, altura_m, dap_cm, categoria_id, preco_unitario")
        .in("id", unicos);
      if (error) throw error;
      return (data ?? []) as unknown as PlantaBusca[];
    },
  });
}

/** One-shot exact lookup used when matching extracted names against the catalog. */
export async function buscarPlantasPorTermo(termo: string): Promise<PlantaBusca[]> {
  const { data, error } = await supabase.rpc("buscar_plantas", { p_query: termo, p_limit: 5 });
  if (error) throw error;
  return (data ?? []) as unknown as PlantaBusca[];
}
