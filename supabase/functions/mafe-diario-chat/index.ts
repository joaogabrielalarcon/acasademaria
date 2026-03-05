import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PERIOD_LABELS: Record<string, string> = {
  dia_inteiro: "dia inteiro",
  manha: "manhã",
  tarde: "tarde",
  horario_especifico: "horário específico",
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatPeriod = (periodo: string | null, horaInicio: string | null, horaFim: string | null) => {
  const periodLabel = periodo ? PERIOD_LABELS[periodo] || periodo : "período não informado";
  const range = [horaInicio?.slice(0, 5), horaFim?.slice(0, 5)].filter(Boolean).join("–");
  return range ? `${periodLabel} (${range})` : periodLabel;
};

const getHighestRole = (roles: string[]) => {
  const priority = ["admin", "administrativo", "gestao_campo", "responsavel_obra", "arquitetura", "operador_campo"];
  return priority.find((role) => roles.includes(role)) || "operador_campo";
};

async function parseAnthropicStream(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Anthropic stream unavailable");

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      let textBuffer = "";
      let currentEvent = "";
      let currentData = "";

      const flushEvent = () => {
        if (!currentData.trim()) {
          currentEvent = "";
          return;
        }

        try {
          const parsed = JSON.parse(currentData);
          const eventType = currentEvent || parsed.type;

          if (eventType === "content_block_delta" && parsed.delta?.type === "text_delta" && parsed.delta?.text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: parsed.delta.text })}\n\n`));
          }

          if (eventType === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } catch (error) {
          console.error("Erro ao processar stream Anthropic:", error, currentData);
        }

        currentEvent = "";
        currentData = "";
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex = textBuffer.indexOf("\n");
        while (newlineIndex !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);

          if (!line.trim()) {
            flushEvent();
            newlineIndex = textBuffer.indexOf("\n");
            continue;
          }

          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData += line.slice(5).trim();
          }

          newlineIndex = textBuffer.indexOf("\n");
        }
      }

      if (currentData.trim()) flushEvent();
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages = [], projetoId, currentDraft } = await req.json();

    if (!projetoId) {
      return new Response(JSON.stringify({ error: "Projeto não informado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: canAccess, error: accessError } = await supabase.rpc("can_access_diario_project", {
      _user_id: userId,
      _projeto_id: projetoId,
    });

    if (accessError) throw accessError;
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Sem permissão para acessar este diário" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projetos")
      .select("id, titulo, cliente_id, clientes(nome)")
      .eq("id", projetoId)
      .maybeSingle();

    if (projectError) throw projectError;
    if (!projectData) {
      return new Response(JSON.stringify({ error: "Projeto não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clienteId = projectData.cliente_id as string;

    const [rolesRes, areasRes, colaboradoresRes, insumosRes, maquinasRes, lastVisitRes, visitsRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("trechos").select("nome").eq("cliente_id", clienteId).order("ordem", { ascending: true }),
      supabase.from("colaboradores_basico").select("id, nome").eq("ativo", true).order("nome", { ascending: true }),
      supabase.from("insumos").select("id, nome, unidade").eq("ativo", true).order("nome", { ascending: true }).limit(200),
      supabase.from("maquinas").select("id, nome").eq("ativo", true).order("nome", { ascending: true }).limit(100),
      supabase
        .from("diario_visitas")
        .select("id, data_visita, periodo, hora_inicio, hora_fim, status_geral")
        .eq("projeto_id", projetoId)
        .order("data_visita", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("diario_visitas")
        .select("id, data_visita, periodo, hora_inicio, hora_fim, status_geral, observacoes_internas")
        .eq("projeto_id", projetoId)
        .order("data_visita", { ascending: false })
        .limit(8),
    ]);

    if (rolesRes.error) throw rolesRes.error;
    if (areasRes.error) throw areasRes.error;
    if (colaboradoresRes.error) throw colaboradoresRes.error;
    if (insumosRes.error) throw insumosRes.error;
    if (maquinasRes.error) throw maquinasRes.error;
    if (lastVisitRes.error) throw lastVisitRes.error;
    if (visitsRes.error) throw visitsRes.error;

    const visitIds = (visitsRes.data || []).map((item) => item.id);
    const [areasHistoryRes, teamHistoryRes] = await Promise.all([
      visitIds.length
        ? supabase.from("diario_areas").select("visita_id, nome_area, servicos, status_area").in("visita_id", visitIds)
        : Promise.resolve({ data: [], error: null }),
      visitIds.length
        ? supabase.from("diario_equipe_area").select("visita_id, colaborador_nome").in("visita_id", visitIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (areasHistoryRes.error) throw areasHistoryRes.error;
    if (teamHistoryRes.error) throw teamHistoryRes.error;

    const areasByVisit = new Map<string, string[]>();
    for (const area of (areasHistoryRes.data || []) as any[]) {
      const current = areasByVisit.get(area.visita_id) || [];
      current.push(`${area.nome_area}${area.status_area ? ` (${area.status_area})` : ""}${area.servicos?.length ? ` — ${area.servicos.join(", ")}` : ""}`);
      areasByVisit.set(area.visita_id, current);
    }

    const teamByVisit = new Map<string, string[]>();
    for (const member of (teamHistoryRes.data || []) as any[]) {
      const current = teamByVisit.get(member.visita_id) || [];
      current.push(member.colaborador_nome);
      teamByVisit.set(member.visita_id, current);
    }

    const recentHistory = ((visitsRes.data || []) as any[]).map((visit) => {
      const areas = Array.from(new Set(areasByVisit.get(visit.id) || []));
      const equipe = Array.from(new Set(teamByVisit.get(visit.id) || []));
      return `- ${visit.data_visita}: ${formatPeriod(visit.periodo, visit.hora_inicio, visit.hora_fim)} | status ${visit.status_geral || "não informado"} | áreas ${areas.join("; ") || "não informadas"} | equipe ${equipe.join(", ") || "não informada"}`;
    }).join("\n");

    const activeTeam = ((colaboradoresRes.data || []) as any[]).map((item) => ({
      id: item.id,
      nome: item.nome,
      nome_normalizado: normalizeText(item.nome),
    }));
    const supplies = ((insumosRes.data || []) as any[]).map((item) => ({
      id: item.id,
      nome: item.nome,
      unidade: item.unidade,
      nome_normalizado: normalizeText(item.nome),
    }));
    const machines = ((maquinasRes.data || []) as any[]).map((item) => ({
      id: item.id,
      nome: item.nome,
      nome_normalizado: normalizeText(item.nome),
    }));

    const highestRole = getHighestRole(((rolesRes.data || []) as any[]).map((item) => item.role));
    const clientName = (projectData as any).clientes?.nome || "Cliente";
    const lastVisitText = lastVisitRes.data
      ? `${lastVisitRes.data.data_visita} · ${formatPeriod(lastVisitRes.data.periodo, lastVisitRes.data.hora_inicio, lastVisitRes.data.hora_fim)} · status ${lastVisitRes.data.status_geral || "não informado"}`
      : "Nenhum registro anterior";

    const systemPrompt = `Você é a Mafe, assistente da MFM Paisagismo.

Sua função: registrar a visita de hoje no projeto "${projectData.titulo}" do cliente "${clientName}".

Horário de trabalho: 07h às 17h.

REGRA PRINCIPAL: você conduz e resolve o registro inteiro, sem mandar a pessoa navegar para outra tela.

CONTEXTO DISPONÍVEL:
- Projeto: ${projectData.titulo}
- Cliente: ${clientName}
- Papel do usuário atual: ${highestRole}
- Áreas cadastradas: ${((areasRes.data || []) as any[]).map((item) => item.nome).join(", ") || "Nenhuma área cadastrada"}
- Colaboradores cadastrados: ${activeTeam.map((item) => item.nome).join(", ") || "Nenhum colaborador cadastrado"}
- Insumos cadastrados: ${supplies.map((item) => `${item.nome}${item.unidade ? ` (${item.unidade})` : ""}`).join(", ") || "Nenhum insumo cadastrado"}
- Máquinas cadastradas: ${machines.map((item) => item.nome).join(", ") || "Nenhuma máquina cadastrada"}
- Último registro: ${lastVisitText}

HISTÓRICO RECENTE:
${recentHistory || "Sem histórico recente."}

RASCUNHO ATUAL:
${JSON.stringify(currentDraft || null)}

FLUXO OBRIGATÓRIO:
1. Pergunte primeiro o período da visita: dia inteiro (07h-17h), manhã, tarde ou horário específico, caso ainda não esteja definido.
2. Pergunte quais áreas foram trabalhadas.
3. Para cada área, colete uma por vez: serviços realizados, equipe (nome e função), insumos (nome e quantidade), máquinas e status da área (otimo, bom, requer_atencao, critico).
4. Se citarem item fora das listas cadastradas, avise que não está cadastrado, preserve todo o rascunho já coletado e diga exatamente:
   - colaborador: ⚠️ '[nome]' não está na equipe cadastrada. Vou guardar nosso rascunho. Cadastre em Equipe e volte aqui para continuar — não vai perder nada.
   - insumo: ⚠️ '[nome]' não está cadastrado. Vou guardar nosso rascunho. Cadastre em Produtos e Insumos e volte aqui para continuar — não vai perder nada.
   - máquina: ⚠️ '[nome]' não está cadastrada em Máquinas. Vou guardar nosso rascunho. Cadastre e volte aqui para continuar — não vai perder nada.
5. Pergunte se há observações internas para a gestora e se isso deve virar alerta.
6. Quando tudo estiver completo, mostre um resumo completo área por área e diga exatamente: Ficou assim — confirma para salvar?
7. Só considere pronto para salvar depois de confirmação explícita do usuário.
8. Nunca invente dados nem aceite itens não cadastrados como válidos.
9. Se perguntarem sobre histórico, responda com base no histórico recente antes de continuar a coleta.
10. Tom: direto, profissional, acolhedor, em português do Brasil. Nunca mencione IA, sistema ou banco de dados.
11. Não use markdown em tabelas.
12. Nunca persista dados diretamente; apenas prepare o rascunho para salvamento após confirmação.
13. Ao final de TODA resposta, acrescente em uma nova linha um bloco oculto exatamente neste formato: <draft_state>{JSON}</draft_state>.
14. O JSON deve ser válido, sem comentários, e seguir exatamente esta estrutura: {"phase":"collecting|awaiting_registration|ready_to_save","ready_to_save":boolean,"draft":{"projeto_id":"${projectData.id}","cliente_id":"${clienteId}","data_visita":"YYYY-MM-DD","periodo":"dia_inteiro|manha|tarde|horario_especifico|null","hora_inicio":"HH:MM|null","hora_fim":"HH:MM|null","status_geral":"otimo|bom|requer_atencao|critico|null","observacoes_internas":"texto|null","criar_alerta":boolean,"areas":[{"nome_area":"texto","servicos":["texto"],"status_area":"otimo|bom|requer_atencao|critico|null","status_anterior":"otimo|bom|requer_atencao|critico|null","houve_melhora":boolean,"relato":"texto|null","equipe":[{"colaborador_id":"uuid|null","colaborador_nome":"texto","funcao":"texto|null","descricao_atividade":"texto|null"}],"insumos":[{"insumo_id":"uuid|null","insumo_nome":"texto","quantidade":"texto|null","unidade":"texto|null"}],"maquinas":[{"maquina_id":"uuid|null","maquina_nome":"texto"}],"midias":[]}],"midias_gerais":[]}}.
15. Resolva colaborador_id, insumo_id e maquina_id usando apenas itens presentes nas listas recebidas; se não encontrar correspondência exata, use null e mude phase para awaiting_registration.
16. Use ready_to_save=true e phase=ready_to_save somente quando o rascunho estiver completo e aguardando confirmação explícita do usuário.`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        stream: true,
        system: systemPrompt,
        messages: (messages as ChatMessage[]).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic error:", anthropicResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao consultar a Mafe Diário." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = await parseAnthropicStream(anthropicResponse);
    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("mafe-diario-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
