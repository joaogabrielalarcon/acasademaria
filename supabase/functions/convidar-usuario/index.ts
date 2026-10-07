// Creates a user without a password and returns a single-use invite link.
// Only callers allowed by can_manage_users may use it. No password is ever set or returned.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const ROLES = [
  "admin", "gestor", "operador", "administrativo", "gestao_campo",
  "responsavel_obra", "operador_campo", "arquitetura", "diretor",
] as const;

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  nome: z.string().trim().min(1).max(120),
  role: z.enum(ROLES),
  colaborador_id: z.string().uuid().optional(),
  redirect_to: z.string().url().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "Não autenticado" }, 401);
  // Only admins may create accounts through this path.
  const { data: isAdmin } = await asUser.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Somente administradores podem criar usuários" }, 403);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { email, nome, role, colaborador_id, redirect_to } = parsed.data;
  // The admin role is granted only manually, never through this function.
  if (role === "admin") return json({ error: "O papel admin não pode ser atribuído por aqui" }, 403);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // generateLink(invite) creates the user if needed and returns the link without sending e-mail.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { nome }, redirectTo: redirect_to },
  });
  if (linkErr || !link.user) return json({ error: linkErr?.message ?? "Falha ao gerar convite" }, 400);
  const userId = link.user.id;

  await admin.from("profiles").update({ nome, ativo: true }).eq("id", userId);

  // The signup trigger grants operador_campo by default: replace with exactly the requested role.
  await admin.from("user_roles").delete().eq("user_id", userId).neq("role", role);
  await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

  if (colaborador_id) {
    await admin.from("colaboradores").update({ user_id: userId, email }).eq("id", colaborador_id);
  }

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  return json({
    user_id: userId,
    email,
    roles: (roles ?? []).map((r) => r.role),
    invite_link: link.properties.action_link,
  });
});
