import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_AUTH_ERROR = "Usuário ou senha inválidos";

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

    if (!validateUsername(username)) {
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

    // Cliente admin para buscar email pelo username
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Buscar colaborador pelo username
    const { data: colaborador, error: searchError } = await supabaseAdmin
      .from("colaboradores")
      .select("email, user_id, ativo")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    // Generic error for all auth failures - prevents username enumeration
    if (searchError || !colaborador || !colaborador.ativo || !colaborador.email || !colaborador.user_id) {
      return new Response(JSON.stringify({ error: GENERIC_AUTH_ERROR }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente anônimo para fazer login
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: colaborador.email,
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
