import { z } from "npm:zod@4.4.3";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.90.1";
import { accessDenial } from "../access-policy.ts";

export interface OperationContext {
  db: SupabaseClient;
  userId: string;
  email?: string | null;
  confirmed?: boolean;
  getUserId(): string;
  getUserEmail(): string | null;
  isAuthenticated(): boolean;
}
export function defineOperation<S extends z.ZodRawShape, R>(definition: {
  name: string; title: string; description: string;
  inputSchema: S;
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  handler: (input: z.infer<z.ZodObject<S>>, context: OperationContext) => Promise<R>;
}) {
  return { ...definition, execute: (input: unknown, context: OperationContext) => definition.handler(z.object(definition.inputSchema).strict().parse(input), context) };
}
export const supabaseForUser = (context: OperationContext) => context.db;
export async function requireAuth(context: OperationContext) {
  if (!context.isAuthenticated() || !context.userId) return failure("Não autenticado.");
  const [profile, security] = await Promise.all([
    context.db.from("profiles").select("ativo").eq("id", context.userId).maybeSingle(),
    context.db.from("user_access_security").select("must_change_password").eq("user_id", context.userId).maybeSingle(),
  ]);
  if (profile.error || security.error) return failure("Não foi possível conferir o seu acesso.");
  const denial = accessDenial(profile.data?.ativo, security.data?.must_change_password === true);
  return denial ? failure(denial) : null;
}
export function failure(text: string) { return { content: [{ type: "text" as const, text }], isError: true as const }; }
export type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
export function jsonValue(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,jsonValue(v)]));
  return String(value);
}
export function operationResult(value: unknown) {
  const result = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const raw = Array.isArray(result.content) ? result.content : [];
  const content = raw.map((entry: unknown) => ({ type: "text" as const, text: typeof entry === "object" && entry && "text" in entry ? String(entry.text) : String(entry) }));
  const structured = jsonValue(result.structuredContent);
  return { content, ...(result.isError ? { isError: true } : {}), ...(structured && !Array.isArray(structured) && typeof structured === "object" ? { structuredContent: structured } : {}) };
}
