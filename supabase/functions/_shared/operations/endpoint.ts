import { createClient } from "npm:@supabase/supabase-js@2.90.1";
import type { OperationContext } from "./contracts.ts";

export async function authenticatedContext(request: Request): Promise<OperationContext> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !url || !key) throw new Error("Não autenticado.");
  const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const result = await db.auth.getClaims(token);
  const id = result.data?.claims?.sub;
  if (result.error || typeof id !== "string") throw new Error("Não autenticado.");
  const email = typeof result.data?.claims?.email === "string" ? result.data.claims.email : null;
  return { db, userId: id, email, getUserId: () => id, getUserEmail: () => email, isAuthenticated: () => true };
}