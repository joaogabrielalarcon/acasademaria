import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!url || !anon || !service || !authorization) return reply({ error: "Não autorizado" }, 401);
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return reply({ error: "Não autorizado" }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authorized } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!authorized) return reply({ error: "Não autorizado" }, 403);
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("acao" in body)) return reply({ error: "Ação inválida" }, 400);
  if (body.acao === "confirmar_tania") {
    const id = "208a9bd7-7633-42ef-bd93-e6a04a40c94c";
    const { data: state } = await admin.from("user_access_security").select("username, must_change_password").eq("user_id", id).single();
    if (state?.username !== "tania.p" || !state.must_change_password) return reply({ error: "Estado inesperado" }, 409);
    const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
    if (error) return reply({ error: "Não foi possível confirmar" }, 500);
    const { error: lockError } = await admin.from("login_attempts").delete().eq("username", "tania.p");
    return reply({ ok: !lockError }, lockError ? 500 : 200);
  }
  const id = "7247a04c-2fa4-4d39-9399-d81193fb7f52";
  const { data: state } = await admin.from("user_access_security").select("username").eq("user_id", id).single();
  if (state?.username !== "teste.login") return reply({ error: "Conta de teste não encontrada" }, 404);
  if (body.acao === "simular_convite") {
    const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: false });
    return reply({ ok: !error }, error ? 500 : 200);
  }
  if (body.acao === "apagar_teste") {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return reply({ error: "Não foi possível apagar conta" }, 500);
    await admin.from("user_access_security").delete().eq("user_id", id);
    await admin.from("login_attempts").delete().eq("username", "teste.login");
    return reply({ ok: true });
  }
  return reply({ error: "Ação inválida" }, 400);
});