import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "whoami",
  title: "Quem sou eu",
  description:
    "Retorna informações do usuário autenticado (id, email, nome, papéis).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [profile, roles] = await Promise.all([
      supabase.from("profiles").select("id, nome, email, telefone, ativo").eq("id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
    ]);

    const data = {
      user_id: userId,
      email: ctx.getUserEmail(),
      profile: profile.data,
      roles: (roles.data ?? []).map((r) => r.role),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
