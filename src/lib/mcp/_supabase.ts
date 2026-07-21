// Helper: build a per-request Supabase client that acts as the OAuth user.
// Runs both under Vite's manifest-extract eval and Deno at edge-function runtime,
// so read env lazily inside the function — never at module top level.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  const url =
    (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined) ||
    "https://placeholder.supabase.co";
  const anon =
    (typeof process !== "undefined"
      ? process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
      : undefined) || "placeholder";
  const token = ctx.getToken();
  return createClient(url, anon, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function requireAuth(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    return {
      content: [{ type: "text" as const, text: "Não autenticado." }],
      isError: true,
    };
  }
  return null;
}
