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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check persistent bootstrap flag
    const { data: bootstrapState } = await supabaseAdmin
      .from("system_state")
      .select("value")
      .eq("key", "bootstrap_completed")
      .maybeSingle();

    if (bootstrapState?.value === true) {
      return new Response(
        JSON.stringify({ error: "Bootstrap já foi realizado e está desabilitado." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check env var as secondary guard
    if (Deno.env.get("BOOTSTRAP_DISABLED") === "true") {
      return new Response(
        JSON.stringify({ error: "Bootstrap já foi realizado e está desabilitado." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se já existe algum usuário no sistema
    const { data: existingUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Erro ao verificar usuários: ${usersError.message}`);
    }

    if (existingUsers.users && existingUsers.users.length > 0) {
      return new Response(
        JSON.stringify({ error: "Bootstrap já realizado. Já existe pelo menos um usuário no sistema." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obter dados do request
    const { email, password, username, colaboradorId } = await req.json();

    if (!email || !password || !username || !colaboradorId) {
      return new Response(
        JSON.stringify({ error: "Email, senha, username e colaboradorId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateUsername(username)) {
      return new Response(
        JSON.stringify({ error: "Username deve ter 3-30 caracteres alfanuméricos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePassword(password)) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter min 8 caracteres com letras e números" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o colaborador existe e não tem user_id
    const { data: colaborador, error: colaboradorError } = await supabaseAdmin
      .from("colaboradores")
      .select("id, nome, user_id")
      .eq("id", colaboradorId)
      .single();

    if (colaboradorError || !colaborador) {
      return new Response(
        JSON.stringify({ error: "Colaborador não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (colaborador.user_id) {
      return new Response(
        JSON.stringify({ error: "Este colaborador já possui acesso ao sistema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar o usuário no auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: colaborador.nome,
        username: username.toLowerCase(),
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar o colaborador com o user_id, email e username
    const { error: updateError } = await supabaseAdmin
      .from("colaboradores")
      .update({
        user_id: newUser.user.id,
        email: email,
        username: username.toLowerCase(),
      })
      .eq("id", colaboradorId);

    if (updateError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao vincular usuário: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Adicionar role de admin ao primeiro usuário
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Erro ao adicionar role de admin:", roleError);
    }

    // Mark bootstrap as completed permanently
    await supabaseAdmin
      .from("system_state")
      .upsert({ key: "bootstrap_completed", value: true });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Primeiro administrador criado com sucesso!",
        userId: newUser.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Erro no bootstrap-admin:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
