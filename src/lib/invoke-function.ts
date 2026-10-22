import { supabase } from "@/integrations/supabase/client";

/** Invokes a server function and returns the readable error message from non-2xx responses. */
export async function invokeFunction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = "Não foi possível concluir.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed: unknown = await ctx.json();
        if (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string") msg = parsed.error;
      } catch {
        /* keep default */
      }
    }
    return { data: null, error: msg };
  }
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return { data: null, error: data.error };
  }
  return { data: data as T, error: null };
}
