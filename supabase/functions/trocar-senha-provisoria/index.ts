// First-access password change. Requires the caller's session and an active
// "must change password" flag. New password: min 8 chars, different from the temporary one.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({ nova_senha: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres.").max(128) });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user?.email) return json({ error: "Não autorizado" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Senha inválida" }, 400);
    const { nova_senha } = parsed.data;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: sec } = await admin.from("user_access_security")
      .select("must_change_password, temp_password_expires_at").eq("user_id", user.id).maybeSingle();
    if (!sec?.must_change_password) return json({ error: "Não há troca de senha pendente." }, 400);
    if (sec.temp_password_expires_at && new Date(sec.temp_password_expires_at) < new Date()) {
      return json({ error: "Sua senha provisória expirou. Peça uma nova à direção." }, 400);
    }

    // Same as the temporary password? Try it against the current credential.
    const probe = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: igual } = await probe.auth.signInWithPassword({ email: user.email, password: nova_senha });
    if (igual?.session) {
      await probe.auth.signOut();
      return json({ error: "A nova senha precisa ser diferente da provisória." }, 400);
    }

    const { error: upErr } = await admin.auth.admin.updateUserById(user.id, { password: nova_senha });
    if (upErr) return json({ error: "Não foi possível salvar a nova senha. Tente outra." }, 400);
    await admin.from("user_access_security").update({
      must_change_password: false, temp_password_expires_at: null, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    return json({ ok: true });
  } catch (_e) {
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
