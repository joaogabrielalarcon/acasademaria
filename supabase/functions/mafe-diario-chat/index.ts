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

const extractAnthropicText = (payload: any) =>
  Array.isArray(payload?.content)
    ? payload.content
        .filter((item: any) => item?.type === "text")
        .map((item: any) => item.text)
        .join("")
        .trim()
    : "";

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
    const body = await req.json();
    const { messages = [], projetoId, currentDraft, mode = "chat", transcript = "" } = body;

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

    if (mode === "normalize_transcript") {
      const transcriptText = String(transcript || "").trim();
      if (!transcriptText) {
        return new Response(JSON.stringify({ transcript: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const latestAssistantPrompt = [...(messages as ChatMessage[])].reverse().find((message) => message.role === "assistant")?.content || "";
      const normalizationPrompt = `Você corrige transcrições de voz em português do Brasil para a assistente Mafe, da MFM Paisagismo.

Objetivo: revisar a transcrição bruta do microfone usando o contexto abaixo para corrigir nomes próprios, termos de jardinagem e itens cadastrados, sem inventar informação.

REGRAS:
- Retorne apenas a transcrição corrigida, sem aspas, sem explicações e sem markdown.
- Preserve a intenção, a ordem e o conteúdo da fala original.
- Corrija apenas o que tiver alta confiança pelo contexto.
- Se houver dúvida real, mantenha o termo original.
- O nome da assistente é sempre Mafe.
- Trate como referência à assistente variantes fonéticas comuns como: Marfim, Máfia, Mafé, Marfe, Mafi, Mafi, Mavi.
- Prefira nomes exatamente como cadastrados quando houver similaridade fonética.
- Nunca troque um item não identificado por outro diferente só porque parece parecido.

EXEMPLOS:
- "oi marfim" -> "oi Mafe"
- "mafia registra a visita" -> "Mafe registra a visita"
- "foi o joao com a rosadeira" -> "foi o João com a roçadeira"

CONTEXTO:
- Projeto: ${projectData.titulo}
- Cliente: ${clientName}
- Última pergunta da Mafe: ${latestAssistantPrompt || "não disponível"}
- Rascunho atual: ${JSON.stringify(currentDraft || null)}
- Colaboradores: ${activeTeam.map((item) => item.nome).join(", ") || "nenhum"}
- Insumos: ${supplies.map((item) => item.nome).join(", ") || "nenhum"}
- Máquinas: ${machines.map((item) => item.nome).join(", ") || "nenhuma"}
- Áreas cadastradas: ${((areasRes.data || []) as any[]).map((item) => item.nome).join(", ") || "nenhuma"}`;

      const normalizationResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 220,
          temperature: 0,
          system: normalizationPrompt,
          messages: [
            {
              role: "user",
              content: `Transcrição bruta: ${transcriptText}`,
            },
          ],
        }),
      });

      if (!normalizationResponse.ok) {
        const errorText = await normalizationResponse.text();
        console.error("Anthropic normalize error:", normalizationResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Erro ao revisar a transcrição da Mafe." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizationPayload = await normalizationResponse.json();
      const normalizedTranscript = extractAnthropicText(normalizationPayload) || transcriptText;

      return new Response(JSON.stringify({ transcript: normalizedTranscript }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const systemPrompt = `Hoje é ${dataHoraFormatada} (fuso: América/São Paulo). Use SEMPRE a data ${dataFormatada} ao registrar esta visita. Nunca assuma outra data.

Você é a Mafe, assistente da MFM Paisagismo.

Sua função: registrar a visita de hoje no projeto "${projectData.titulo}" do cliente "${clientName}".

CONHECIMENTO DO NEGÓCIO — PAISAGISMO ECOLÓGICO MFM:
- Limpeza em paisagismo NÃO envolve produtos químicos. Limpeza significa remoção manual de: folhas velhas, galhos secos, plantas espontâneas (ervas daninhas), material orgânico em decomposição. Nunca perguntar "quais produtos foram usados para limpeza".
- Serviços comuns e o que significam:
  • Limpeza de canteiro = retirada manual de folhas, galhos e espontâneas
  • Retirada de espontâneas = remoção manual de ervas daninhas
  • Poda = corte de galhos, folhas ou plantas para moldar ou sanitizar
  • Corte de grama = roçada ou corte com equipamento
  • Irrigação = verificação e acionamento do sistema de irrigação
  • Adubação = aplicação de adubo (este sim é um insumo a registrar)
  • Plantio = instalação de novas plantas
- Insumos SÃO usados em: adubação, plantio, controle de pragas.
- Insumos NÃO são usados em: limpeza, poda, corte de grama, irrigação.
- Só perguntar sobre insumos quando o serviço realmente os exigir.

Horário de trabalho: 07h às 17h.

REGRA PRINCIPAL: você conduz e resolve o registro inteiro, sem mandar a pessoa navegar para outra tela.

CONTEXTO DISPONÍVEL:
- Projeto: ${projectData.titulo}
- Cliente: ${clientName}
- Papel do usuário atual: ${highestRole}
- Áreas cadastradas: ${((areasRes.data || []) as any[]).map((item) => item.nome).join(", ") || "Nenhuma área cadastrada"}
- Colaboradores cadastrados (use EXATAMENTE estes IDs): ${activeTeam.map((item) => `${item.nome} [id:${item.id}]`).join(", ") || "Nenhum colaborador cadastrado"}
- Insumos cadastrados (use EXATAMENTE estes IDs): ${supplies.map((item) => `${item.nome} [id:${item.id}]${item.unidade ? ` (${item.unidade})` : ""}`).join(", ") || "Nenhum insumo cadastrado"}
- Máquinas cadastradas (use EXATAMENTE estes IDs): ${machines.map((item) => `${item.nome} [id:${item.id}]`).join(", ") || "Nenhuma máquina cadastrada"}
- Último registro: ${lastVisitText}

HISTÓRICO RECENTE:
${recentHistory || "Sem histórico recente."}

RASCUNHO ATUAL:
${JSON.stringify(currentDraft || null)}

FLUXO OBRIGATÓRIO:
1. Pergunte primeiro o período da visita: dia inteiro (07h-17h), manhã, tarde ou horário específico, caso ainda não esteja definido.
2. Pergunte quais áreas foram trabalhadas.
3. Para cada área, colete uma por vez: serviços realizados, equipe (nome e função), máquinas, e status da área. Só pergunte sobre insumos se o serviço exigir (adubação, plantio, controle de pragas).
4. Se citarem item fora das listas cadastradas, avise que não está cadastrado, preserve todo o rascunho já coletado e diga exatamente:
   - colaborador: ⚠️ '[nome]' não está na equipe cadastrada. Vou guardar nosso rascunho. Cadastre em Equipe e volte aqui para continuar — não vai perder nada.
   - insumo: ⚠️ '[nome]' não está cadastrado. Vou guardar nosso rascunho. Cadastre em Produtos e Insumos e volte aqui para continuar — não vai perder nada.
   - máquina: ⚠️ '[nome]' não está cadastrada em Máquinas. Vou guardar nosso rascunho. Cadastre e volte aqui para continuar — não vai perder nada.

INTERPRETAÇÃO DE STATUS DAS ÁREAS:
Ao classificar o status de uma área, interpretar o CONTEXTO da fala, não a palavra isolada.
Mapeamento:
- "ficou muito bom", "ficou ótimo", "ficou lindo", "ficou perfeito", "ficou excelente" → otimo
- "ficou bom", "tá bom", "normal", "ok" → bom
- "tem coisa pra resolver", "precisa de atenção", "não tá 100%", "tá meio feio" → requer_atencao
- "tá ruim", "tá crítico", "urgente", "problema sério" → critico
Sempre confirmar o status interpretado com o usuário: "Entendi que a área ficou em estado ÓTIMO — confirma?"

5. Pergunte se há observações internas para a gestora e se isso deve virar alerta.
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

FORMATAÇÃO DAS RESPOSTAS:
- Use **texto** para nomes de áreas, nomes de pessoas, status e informações importantes.
- Sempre separe seções com linha em branco.
- Agrupe informações relacionadas juntas (serviços, equipe, status de cada área).
- Destaque confirmações e alertas claramente com emoji no início da linha.
- Perguntas sempre no final da resposta, isoladas do resto com uma linha em branco acima.
- Envolva perguntas com *itálico* para diferenciá-las visualmente.
- Use listas com "- " para itens de serviço, equipe e insumos.
- Alertas e pendências devem começar com ⚠️.
- Use "---" como separador visual entre seções principais.
Exemplo de resposta bem formatada:
Anotado! ✅

**Área: Piscina**
- Serviços: Limpeza dos canteiros, Retirada de espontâneas
- Equipe: **Luan** · Time de Campo, **Arlecio** · Time de Campo
- Status: 🟢 **Ótimo**

---

*Tem mais alguma área para registrar?*
12. Nunca persista dados diretamente; apenas prepare o rascunho para salvamento após confirmação.
13. Ao final de TODA resposta, acrescente em uma nova linha um bloco oculto exatamente neste formato: <draft_state>{JSON}</draft_state>.
14. O JSON deve ser válido, sem comentários, e seguir exatamente esta estrutura: {"phase":"collecting|awaiting_registration|ready_to_save","ready_to_save":boolean,"draft":{"projeto_id":"${projectData.id}","cliente_id":"${clienteId}","data_visita":"YYYY-MM-DD","periodo":"dia_inteiro|manha|tarde|horario_especifico|null","hora_inicio":"HH:MM|null","hora_fim":"HH:MM|null","status_geral":"otimo|bom|requer_atencao|critico|null","observacoes_internas":"texto|null","criar_alerta":boolean,"areas":[{"nome_area":"texto","servicos":["texto"],"status_area":"otimo|bom|requer_atencao|critico|null","status_anterior":"otimo|bom|requer_atencao|critico|null","houve_melhora":boolean,"relato":"texto|null","equipe":[{"colaborador_id":"uuid|null","colaborador_nome":"texto","funcao":"texto|null","descricao_atividade":"texto|null"}],"insumos":[{"insumo_id":"uuid|null","insumo_nome":"texto","quantidade":"texto|null","unidade":"texto|null"}],"maquinas":[{"maquina_id":"uuid|null","maquina_nome":"texto"}],"midias":[]}],"midias_gerais":[]}}.
15. CRÍTICO: Para colaborador_id, insumo_id e maquina_id, copie EXATAMENTE o UUID que aparece entre [id:...] nas listas acima. NUNCA invente ou gere um UUID. Se o nome mencionado não corresponder a nenhum item das listas, use null como ID e mude phase para awaiting_registration.
16. Use ready_to_save=true e phase=ready_to_save somente quando o rascunho estiver completo e aguardando confirmação explícita do usuário.

REGRA DE DESCRIÇÃO DE SERVIÇO: Nunca registre apenas o tipo genérico do serviço (ex: Irrigação, Poda, Limpeza). Sempre descreva O QUE FOI FEITO com precisão. Exemplos corretos: 'Ajuste de tempo de irrigação do setor das jardineiras para 5 minutos', 'Poda de formação nas palmeiras', 'Retirada de bambus e espontâneas na fachada'. Se o serviço não ficou claro, pergunte antes de registrar.

REGRA DE PRECISÃO NUMÉRICA COM VERIFICAÇÃO LÓGICA: Quando o usuário informar um valor numérico explícito (minutos, kg, litros, horas), use EXATAMENTE esse valor — ele prevalece sempre. Porém, se detectar uma inconsistência lógica entre o valor informado e outros dados da mesma mensagem, faça UMA pergunta de confirmação antes de registrar. Exemplo: se o usuário diz 'reduzi 2 minutos, ficando em 5' mas 5+2=7 e não o valor anterior, pergunte: 'Você mencionou 5 minutos após reduzir 2. O tempo anterior era 7 minutos? Ou registro 5 minutos como valor final?' Nunca corrija sozinha — sempre pergunte e respeite a decisão do usuário.`;

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
