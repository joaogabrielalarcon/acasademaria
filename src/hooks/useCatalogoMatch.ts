import { supabase } from "@/integrations/supabase/client";

export type MatchTipo = "planta" | "insumo";

export interface CatalogoMatch {
  item_id: string;
  nome: string;
  nome_secundario: string | null;
  score: number;
  fonte: "apelido" | "cientifico" | "exato" | "fuzzy";
  status: "match" | "suggest" | "none";
}

export interface DuplicadoPar {
  a_id: string;
  a_nome: string;
  a_secundario: string | null;
  b_id: string;
  b_nome: string;
  b_secundario: string | null;
  score: number;
}

export function normalizarApelido(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function matchCatalogo(
  tipo: MatchTipo,
  query: string,
  limit = 6,
): Promise<CatalogoMatch[]> {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("match_catalogo" as any, {
    p_tipo: tipo,
    p_query: query,
    p_limit: limit,
  });
  if (error) {
    console.warn("[matchCatalogo]", error.message);
    return [];
  }
  return ((data as any[]) || []) as CatalogoMatch[];
}

/** Registra o apelido confirmado pelo humano para que a próxima rodada case direto. */
export async function aprenderApelido(
  tipo: MatchTipo,
  itemId: string,
  apelido: string,
): Promise<void> {
  const norm = normalizarApelido(apelido);
  if (!norm) return;
  const { error } = await supabase
    .from("catalogo_apelidos" as any)
    .upsert(
      {
        tipo,
        item_id: itemId,
        apelido: apelido.trim(),
        apelido_norm: norm,
        confianca: "humano",
      },
      { onConflict: "tipo,apelido_norm,item_id", ignoreDuplicates: true },
    );
  if (error) console.warn("[aprenderApelido]", error.message);
}

export async function sugerirDuplicadosCatalogo(
  tipo: MatchTipo,
  limiar = 0.7,
  limit = 50,
): Promise<DuplicadoPar[]> {
  const { data, error } = await supabase.rpc("sugerir_duplicados_catalogo" as any, {
    p_tipo: tipo,
    p_limiar: limiar,
    p_limit: limit,
  });
  if (error) {
    console.warn("[sugerirDuplicadosCatalogo]", error.message);
    return [];
  }
  return ((data as any[]) || []) as DuplicadoPar[];
}
