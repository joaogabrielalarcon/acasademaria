import { supabase } from "@/integrations/supabase/client";

const ACCOUNT_COLUMNS = "id,nome,banco,agencia,numero,titular,empresa,ativo,ordem";
const CATEGORY_COLUMNS = "id,nome,tipo,grupo,entra_no_resultado,ativo,ordem";

export async function searchFinancialAccounts(search: string, includeInactive = false) {
  let query = supabase.from("financeiro_contas").select(ACCOUNT_COLUMNS).order("ordem").order("id").limit(30);
  if (!includeInactive) query = query.eq("ativo", true);
  if (search.trim()) query = query.ilike("nome", `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function searchFinancialCategories(search: string, type: "entrada" | "saida") {
  let query = supabase.from("financeiro_categorias").select(CATEGORY_COLUMNS).eq("tipo", type).eq("ativo", true).order("ordem").order("id").limit(30);
  if (search.trim()) query = query.ilike("nome", `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}