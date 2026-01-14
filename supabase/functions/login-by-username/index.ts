import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (searchError || !colaborador) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!colaborador.ativo) {
      return new Response(JSON.stringify({ error: "Usuário inativo. Entre em contato com a administração." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!colaborador.email || !colaborador.user_id) {
      return new Response(JSON.stringify({ error: "Usuário não possui acesso ao sistema" }), {
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
      return new Response(JSON.stringify({ error: "Senha incorreta" }), {
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
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
