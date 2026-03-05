import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_AUTH_ERROR = "Usuário ou senha inválidos";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsername(username: string): boolean {
  return typeof username === "string" && username.length >= 3 && username.length <= 30 && /^[a-zA-Z0-9._-]+$/.test(username);
}

function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6 && password.length <= 128;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Usuário e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUsername = normalizeUsername(username);

    if (!validateUsername(normalizedUsername)) {
      return new Response(JSON.stringify({ error: "Formato de usuário inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validatePassword(password)) {
      return new Response(JSON.stringify({ error: "Formato de senha inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente admin para buscar dados de login
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let collaboratorUserId: string | null = null;

    // 1) Busca principal por username atual na tabela de colaboradores
    const { data: colaborador, error: searchError } = await supabaseAdmin
      .from("colaboradores")
      .select("user_id, ativo")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (!searchError && colaborador?.ativo && colaborador.user_id) {
      collaboratorUserId = colaborador.user_id;
    }

    // 2) Fallback para username legado salvo no metadata do usuário
    if (!collaboratorUserId) {
      const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (!usersError) {
        const matchedUser = usersData.users.find((u) => {
          const metadataUsername = typeof u.user_metadata?.username === "string"
            ? u.user_metadata.username.toLowerCase()
            : null;
          return metadataUsername === normalizedUsername;
        });

        if (matchedUser?.id) {
          const { data: collaboratorByUser, error: collaboratorByUserError } = await supabaseAdmin
            .from("colaboradores")
            .select("user_id, ativo")
            .eq("user_id", matchedUser.id)
            .maybeSingle();

          if (!collaboratorByUserError && collaboratorByUser?.ativo && collaboratorByUser.user_id) {
            collaboratorUserId = collaboratorByUser.user_id;
          }
        }
      }
    }

    // Generic error for all auth failures - prevents username enumeration
    if (!collaboratorUserId) {
      return new Response(JSON.stringify({ error: GENERIC_AUTH_ERROR }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca e-mail real no provedor de autenticação para evitar divergência com tabela colaboradores
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(collaboratorUserId);
    const loginEmail = authUserData?.user?.email;

    if (authUserError || !loginEmail) {
      return new Response(JSON.stringify({ error: GENERIC_AUTH_ERROR }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente anônimo para fazer login
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: GENERIC_AUTH_ERROR }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      session: authData.session,
      user: authData.user 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
