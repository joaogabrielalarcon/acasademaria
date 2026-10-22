// Admin-only account management: create account with temporary password,
// generate a new temporary password, deactivate access.
// The temporary password is generated here, returned ONCE in this response
// to the admin's screen and never stored readable nor logged.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { generateTemporaryPassword, temporaryPasswordExpiresAt } from "../_shared/access-policy.ts";

const ROLES_PERMITIDOS = [
  "gestor", "operador", "administrativo", "gestao_campo",
  "responsavel_obra", "operador_campo", "arquitetura", "diretor",
] as const;

const INTERNAL_DOMAIN = "usuarios.mfm.local";

const Username = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "Usuário: 3 a 30 caracteres, minúsculas, sem espaço (letras, números, ponto, hífen).");

const Body = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("criar"),
    nome: z.string().trim().min(2).max(120),
    username: Username,
    role: z.enum(ROLES_PERMITIDOS),
    colaborador_id: z.string().uuid().optional().nullable(),
    email: z.string().trim().toLowerCase().email().max(254).optional().nullable(),
  }),
  z.object({ acao: z.literal("nova_senha"), user_id: z.string().uuid() }),
  z.object({ acao: z.literal("desativar"), user_id: z.string().uuid() }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Serviço indisponível." }, 503);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: "Não autorizado" }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: ehAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!ehAdmin) return json({ error: "Só a direção (admin) pode gerenciar contas." }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return json({ error: msg }, 400);
    }
    const body = parsed.data;
    const expira = temporaryPasswordExpiresAt();

    if (body.acao === "criar") {
      const { data: jaExiste } = await admin
        .from("user_access_security").select("user_id").eq("username", body.username).maybeSingle();
      const { data: colabMesmoUser } = await admin
        .from("colaboradores").select("id").eq("username", body.username).maybeSingle();
      if (jaExiste || (colabMesmoUser && colabMesmoUser.id !== body.colaborador_id)) {
        return json({ error: "Esse nome de usuário já está em uso." }, 400);
      }
      if (body.colaborador_id) {
        const { data: c } = await admin.from("colaboradores").select("id, user_id").eq("id", body.colaborador_id).maybeSingle();
        if (!c) return json({ error: "Colaborador não encontrado." }, 400);
        if (c.user_id) return json({ error: "Esse colaborador já tem uma conta." }, 400);
      }

      const senha = generateTemporaryPassword();
      const email = body.email || `${body.username}@${INTERNAL_DOMAIN}`;
      const { data: novo, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: body.nome, username: body.username },
      });
      if (cErr || !novo.user) {
        return json({ error: "Não foi possível criar a conta (o e-mail pode já estar em uso)." }, 400);
      }
      const uid = novo.user.id;

      const passos = await Promise.all([
        admin.from("user_roles").delete().eq("user_id", uid),
        admin.from("user_access_security").insert({
          user_id: uid, username: body.username, must_change_password: true, temp_password_expires_at: expira,
        }),
      ]);
      const { error: rErr } = await admin.from("user_roles").insert({ user_id: uid, role: body.role });
      let falhou = passos.some((p) => p.error) || !!rErr;
      if (!falhou && body.colaborador_id) {
        const { error } = await admin.from("colaboradores")
          .update({ user_id: uid, username: body.username }).eq("id", body.colaborador_id);
        falhou = !!error;
      }
      if (falhou) {
        await admin.from("user_access_security").delete().eq("user_id", uid);
        await admin.auth.admin.deleteUser(uid);
        return json({ error: "Não foi possível concluir o cadastro. Nada foi criado." }, 400);
      }
      return json({ ok: true, user_id: uid, username: body.username, senha_provisoria: senha, expira_em: expira });
    }

    if (body.user_id === user.id) return json({ error: "Use a troca de senha normal para a sua própria conta." }, 400);
    const { data: alvoAdmin } = await admin.rpc("has_role", { _user_id: body.user_id, _role: "admin" });
    if (alvoAdmin) return json({ error: "Contas de direção não são alteradas por aqui." }, 400);

    if (body.acao === "nova_senha") {
      const senha = generateTemporaryPassword();
      const { data: alvo, error: gErr } = await admin.auth.admin.getUserById(body.user_id);
      if (gErr || !alvo.user) return json({ error: "Conta não encontrada." }, 404);
      const { error: upErr } = await admin.auth.admin.updateUserById(body.user_id, {
        password: senha, ban_duration: "none",
      });
      if (upErr) return json({ error: "Não foi possível gerar a nova senha." }, 400);
      const meta = alvo.user.user_metadata as Record<string, unknown> | undefined;
      const { data: colab } = await admin.from("colaboradores").select("username").eq("user_id", body.user_id).maybeSingle();
      const username = (colab?.username as string | null) ?? (typeof meta?.username === "string" ? meta.username : null);
      const { data: atual } = await admin.from("user_access_security").select("username").eq("user_id", body.user_id).maybeSingle();
      const { error: stateError } = await admin.from("user_access_security").upsert({
        user_id: body.user_id,
        username: atual?.username ?? username,
        must_change_password: true,
        temp_password_expires_at: expira,
        updated_at: new Date().toISOString(),
      });
      if (stateError) {
        await admin.auth.admin.updateUserById(body.user_id, { ban_duration: "876000h" });
        return json({ error: "Não foi possível preparar o primeiro acesso. Gere outra senha provisória." }, 500);
      }
      const { error: profileError } = await admin.from("profiles").update({ ativo: true }).eq("id", body.user_id);
      if (profileError) return json({ error: "Não foi possível reativar o acesso." }, 500);
      const effectiveUsername = atual?.username ?? username;
      if (effectiveUsername) await admin.from("login_attempts").delete().eq("username", effectiveUsername);
      return json({ ok: true, username: effectiveUsername, senha_provisoria: senha, expira_em: expira });
    }

    // desativar
    const { error: banErr } = await admin.auth.admin.updateUserById(body.user_id, { ban_duration: "876000h" });
    if (banErr) return json({ error: "Não foi possível desativar o acesso." }, 400);
    const { error: profileError } = await admin.from("profiles").update({ ativo: false }).eq("id", body.user_id);
    if (profileError) return json({ error: "O login foi bloqueado, mas não foi possível atualizar o acesso. Tente desativar novamente." }, 500);
    return json({ ok: true });
  } catch (_e) {
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
