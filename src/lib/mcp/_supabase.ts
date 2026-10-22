// Helper: build a per-request Supabase client that acts as the OAuth user.
// This module is bundled by the MCP Vite plugin into a Deno edge function.
// Read env lazily inside the function — never at module top level (extractor eval).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { accessDenial } from "../../../supabase/functions/_shared/access-policy";

declare const process: { env: Record<string, string | undefined> } | undefined;

function getEnv(name: string): string | undefined {
  try {
    const g = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
      Deno?: { env?: { get: (key: string) => string | undefined } };
    };
    if (g?.process?.env?.[name]) return g.process.env[name];
    if (g?.Deno?.env?.get) return g.Deno.env.get(name);
  } catch {
    /* noop */
  }
  return undefined;
}

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  const url = getEnv("SUPABASE_URL") || "https://placeholder.supabase.co";
  const anon =
    getEnv("SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY") || "placeholder";
  const token = ctx.getToken();
  return createClient(url, anon, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const MSG_TROCAR_SENHA =
  "Troque sua senha no primeiro acesso em acasademaria.lovable.app antes de usar o conector.";

/** Refuses unauthenticated calls and accounts that still must change the temporary password. */
export async function requireAuth(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    return {
      content: [{ type: "text" as const, text: "Não autenticado." }],
      isError: true as const,
    };
  }
  const userId = ctx.getUserId();
  if (!userId) return { content: [{ type: "text" as const, text: "Não autenticado." }], isError: true as const };
  const client = supabaseForUser(ctx);
  const { data: profile, error: profileError } = await client
    .from("profiles").select("ativo").eq("id", userId).maybeSingle();
  const { data, error } = await client
    .from("user_access_security")
    .select("must_change_password")
    .eq("user_id", userId)
    .maybeSingle();
  const denial = accessDenial(profile?.ativo, data?.must_change_password === true);
  if (error || profileError || denial) {
    return {
      content: [{ type: "text" as const, text: error || profileError ? "Não foi possível conferir o seu acesso." : denial ?? MSG_TROCAR_SENHA }],
      isError: true as const,
    };
  }
  return null;
}
