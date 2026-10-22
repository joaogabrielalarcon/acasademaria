import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GENERIC_AUTH_ERROR = "Usuário ou senha incorretos";
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const validUsername = (u: string) => u.length >= 3 && u.length <= 30 && /^[a-z0-9._-]+$/.test(u);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!validUsername(username) || password.length < 6 || password.length > 128) {
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // Lockout check (same message whether the user exists or not)
    const { data: tentativa } = await admin.from("login_attempts")
      .select("failed_count, locked_until").eq("username", username).maybeSingle();
    if (tentativa?.locked_until && new Date(tentativa.locked_until) > new Date()) {
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    const falha = async () => {
      const expirado = tentativa?.locked_until && new Date(tentativa.locked_until) <= new Date();
      const count = (expirado ? 0 : tentativa?.failed_count ?? 0) + 1;
      const lock = count >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
      await admin.from("login_attempts").upsert({
        username,
        failed_count: lock ? 0 : count,
        locked_until: lock,
        updated_at: new Date().toISOString(),
      });
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

    const { data: profile } = await admin.from("profiles").select("ativo").eq("id", userId).maybeSingle();
    if (profile && profile.ativo === false) return await falha();

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const loginEmail = authUser?.user?.email;
    if (!loginEmail) return await falha();

    const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await client.auth.signInWithPassword({ email: loginEmail, password });
    if (authError || !authData.session) return await falha();

    await admin.from("login_attempts").delete().eq("username", username);

    const { data: estado } = await admin.from("user_access_security")
      .select("must_change_password, temp_password_expires_at").eq("user_id", userId).maybeSingle();
    if (estado?.must_change_password && estado.temp_password_expires_at &&
        new Date(estado.temp_password_expires_at) < new Date()) {
      await client.auth.signOut();
      return json({ error: "Sua senha provisória expirou. Peça uma nova à direção." }, 401);
    }

    return json({
      session: authData.session,
      must_change_password: !!estado?.must_change_password,
    });
  } catch (_e) {
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
