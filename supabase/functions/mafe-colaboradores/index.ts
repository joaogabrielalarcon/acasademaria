import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-caller-auth",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Validate caller: either service-key (internal orchestrator) or user with permission
    const authHeader = req.headers.get("Authorization") || "";
    const callerAuth = req.headers.get("x-caller-auth") || authHeader;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: callerAuth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canManage } = await userClient.rpc("can_manage_users", { _user_id: user.id });
    if (!canManage) {
      return new Response(JSON.stringify({ error: "Sem permissão para gerenciar colaboradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { acao, dados } = await req.json();

    switch (acao) {
      case "listar": {
        let query = admin
          .from("colaboradores")
          .select("id, nome, cargo, area, area_id, ativo, telefone, email, sub_equipe, foto_url");

        if (dados?.ativo !== undefined) query = query.eq("ativo", dados.ativo);
        if (dados?.area_id) query = query.eq("area_id", dados.area_id);
        if (dados?.busca) query = query.ilike("nome", `%${dados.busca}%`);
        query = query.order("nome").limit(dados?.limite || 30);

        const { data, error } = await query;
        if (error) throw error;

        return jsonResponse({ sucesso: true, colaboradores: data });
      }

      case "cadastrar": {
        if (!dados?.nome?.trim()) {
          return jsonResponse({ error: "Nome é obrigatório" }, 400);
        }

        const insertPayload: Record<string, unknown> = {
          nome: dados.nome.trim(),
          cargo: dados.cargo || null,
          area_id: dados.area_id || null,
          area: dados.area || null,
          sub_equipe: dados.sub_equipe || null,
          telefone: dados.telefone || null,
          email: dados.email || null,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          cep: dados.cep || null,
          cpf: dados.cpf || null,
          data_nascimento: dados.data_nascimento || null,
          observacoes: dados.observacoes || null,
          possui_conducao: dados.possui_conducao ?? false,
          tipo_conducao: dados.tipo_conducao || null,
          possui_cnh: dados.possui_cnh ?? false,
          tipo_cnh: dados.tipo_cnh || null,
          tamanho_camiseta: dados.tamanho_camiseta || null,
          tamanho_calca: dados.tamanho_calca || null,
          tamanho_calcado: dados.tamanho_calcado || null,
          ativo: true,
        };

        const { data, error } = await admin
          .from("colaboradores")
          .insert(insertPayload)
          .select("id, nome, cargo, area, area_id")
          .single();

        if (error) throw error;

        return jsonResponse({
          sucesso: true,
          mensagem: `Colaborador "${data.nome}" cadastrado com sucesso.`,
          colaborador: data,
        });
      }

      case "inativar": {
        if (!dados?.colaborador_id) {
          return jsonResponse({ error: "ID do colaborador é obrigatório" }, 400);
        }
        if (!dados?.motivo?.trim()) {
          return jsonResponse({ error: "Motivo da inativação é obrigatório" }, 400);
        }

        // Verify collaborator exists and is active
        const { data: colab } = await admin
          .from("colaboradores")
          .select("id, nome, ativo")
          .eq("id", dados.colaborador_id)
          .single();

        if (!colab) return jsonResponse({ error: "Colaborador não encontrado" }, 404);
        if (!colab.ativo) return jsonResponse({ error: `${colab.nome} já está inativo` }, 400);

        // Get caller name
        const { data: callerProfile } = await admin
          .from("profiles")
          .select("nome")
          .eq("id", user.id)
          .single();

        // Record inactivation
        const { error: inativError } = await admin
          .from("colaborador_inativacoes")
          .insert({
            colaborador_id: dados.colaborador_id,
            motivo: dados.motivo.trim(),
            registrado_por: user.id,
            registrado_por_nome: callerProfile?.nome || "Mafe (via IA)",
          });
        if (inativError) throw inativError;

        // Deactivate
        const { error: updateError } = await admin
          .from("colaboradores")
          .update({ ativo: false })
          .eq("id", dados.colaborador_id);
        if (updateError) throw updateError;

        return jsonResponse({
          sucesso: true,
          mensagem: `${colab.nome} foi desligado(a). Motivo registrado: "${dados.motivo.trim()}"`,
        });
      }

      default:
        return jsonResponse({ error: `Ação '${acao}' não reconhecida. Use: listar, cadastrar, inativar.` }, 400);
    }
  } catch (error) {
    console.error("mafe-colaboradores error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
