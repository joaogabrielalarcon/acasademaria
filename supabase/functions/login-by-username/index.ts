import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { GENERIC_AUTH_ERROR, normalizeLoginPassword, normalizeLoginUsername, temporaryPasswordExpired } from "../_shared/access-policy.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const validUsername = (u: string) => u.length >= 3 && u.length <= 30 && /^[a-z0-9._-]+$/.test(u);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) return json({ error: GENERIC_AUTH_ERROR }, 503);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? normalizeLoginUsername(body.username) : "";
    const password = typeof body?.password === "string" ? normalizeLoginPassword(body.password) : "";
    if (!validUsername(username) || password.length < 6 || password.length > 128) {
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // Lockout check (same message whether the user exists or not)
    const { data: tentativa, error: attemptError } = await admin.from("login_attempts")
      .select("failed_count, locked_until").eq("username", username).maybeSingle();
    if (attemptError) return json({ error: GENERIC_AUTH_ERROR }, 401);
    if (tentativa?.locked_until && new Date(tentativa.locked_until) > new Date()) {
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    const falha = async () => {
      await admin.rpc("record_login_failure", { _username: username });
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    };

    // Resolve user id: in-app accounts, then collaborators, then legacy metadata
    let userId: string | null = null;
    const { data: sec } = await admin.from("user_access_security")
      .select("user_id").eq("username", username).maybeSingle();
    if (sec?.user_id) userId = sec.user_id;

    if (!userId) {
      const { data: colab } = await admin.from("colaboradores")
        .select("user_id, ativo").eq("username", username).maybeSingle();
      if (colab?.ativo && colab.user_id) userId = colab.user_id;
    }

    if (!userId) {
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = usersData?.users.find((u) =>
        typeof u.user_metadata?.username === "string" && u.user_metadata.username.toLowerCase() === username
      );
      if (match?.id) {
        const { data: c } = await admin.from("colaboradores").select("ativo").eq("user_id", match.id).maybeSingle();
        if (c?.ativo) userId = match.id;
      }
    }

    if (!userId) return await falha();

    const { data: profile, error: profileError } = await admin.from("profiles").select("ativo").eq("id", userId).maybeSingle();
    if (profileError || profile?.ativo !== true) return await falha();

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const loginEmail = authUser?.user?.email;
    if (!loginEmail) return await falha();

    const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await client.auth.signInWithPassword({ email: loginEmail, password });
    if (authError || !authData.session) return await falha();

    // A concurrent failure may have locked this username while credentials were checked.
    const { data: latestAttempt, error: latestError } = await admin.from("login_attempts")
      .select("locked_until").eq("username", username).maybeSingle();
    if (latestError || (latestAttempt?.locked_until && new Date(latestAttempt.locked_until) > new Date())) {
      await client.auth.signOut();
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    const { data: estado, error: stateError } = await admin.from("user_access_security")
      .select("must_change_password, temp_password_expires_at").eq("user_id", userId).maybeSingle();
    if (stateError || (estado?.must_change_password && temporaryPasswordExpired(estado.temp_password_expires_at))) {
      await client.auth.signOut();
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    await admin.from("login_attempts").delete().eq("username", username).or("locked_until.is.null,locked_until.lte." + new Date().toISOString());

    return json({
      session: authData.session,
      must_change_password: !!estado?.must_change_password,
    });
  } catch (_e) {
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
