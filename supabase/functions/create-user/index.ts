import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validateUsername(username: string): boolean {
  return typeof username === "string" && username.length >= 3 && username.length <= 30 && /^[a-zA-Z0-9._-]+$/.test(username);
}

function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && password.length <= 128 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com token do usuário para verificar permissões
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se tem permissão para gerenciar usuários
    const { data: canManage } = await supabaseClient.rpc("can_manage_users", { _user_id: user.id });
    if (!canManage) {
      return new Response(JSON.stringify({ error: "Sem permissão para criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, username, colaboradorId } = await req.json();

    if (!email || !password || !username || !colaboradorId) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: "Formato de email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateUsername(username)) {
      return new Response(JSON.stringify({ error: "Username deve ter 3-30 caracteres alfanuméricos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validatePassword(password)) {
      return new Response(JSON.stringify({ error: "Senha deve ter min 8 caracteres com letras e números" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente admin para criar usuário
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar se username já existe
    const { data: existingUser } = await supabaseAdmin
      .from("colaboradores")
      .select("id")
      .eq("username", username.toLowerCase())
      .neq("id", colaboradorId)
      .maybeSingle();

    if (existingUser) {
      return new Response(JSON.stringify({ error: "Nome de usuário já existe" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar usuário no Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualizar colaborador com user_id, email e username
    const { error: updateError } = await supabaseAdmin
      .from("colaboradores")
      .update({
        user_id: newUser.user.id,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
      })
      .eq("id", colaboradorId);

    if (updateError) {
      // Rollback: deletar usuário criado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
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
