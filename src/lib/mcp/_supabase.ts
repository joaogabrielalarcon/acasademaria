// Helper: build a per-request Supabase client that acts as the OAuth user.
// This module is bundled by the MCP Vite plugin into a Deno edge function.
// Read env lazily inside the function — never at module top level (extractor eval).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

declare const process: { env: Record<string, string | undefined> } | undefined;

function getEnv(name: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis;
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

export function requireAuth(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    return {
      content: [{ type: "text" as const, text: "Não autenticado." }],
      isError: true as const,
    };
  }
  return null;
}
