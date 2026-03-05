import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HISTORY_QUERY_REGEX = /(hist[óo]rico|última\s+visita|ultima\s+visita|últimas\s+visitas|ultimas\s+visitas|alerta|alertas|pend[êe]ncia|pend[êe]ncias|o que foi feito|visitas do projeto|di[áa]rio do projeto)/i;

function extractLastUserMessage(messages: Array<{ role: string; content: string }>) {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

function extractProjectIdFromRoute(route: string) {
  const match = route.match(/^\/projetos\/([^/?#]+)/);
  return match?.[1] || null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

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

async function buildProcessosContext(client: ReturnType<typeof createClient>) {
  const { data: processos } = await client
    .from("processos")
    .select(`
      id, titulo, descricao, objetivo,
      areas:area_id(nome),
      processo_etapas(titulo, descricao, responsavel, ordem)
    `)
    .eq("ativo", true)
    .order("ordem");

  if (!processos?.length) return "";

  let context = "\n\n## PROCESSOS INTERNOS DISPONÍVEIS:\n";
  processos.forEach((processo: any) => {
    context += `\n### ${processo.areas?.nome || "Sem área"} > ${processo.titulo}\n`;
    if (processo.objetivo) context += `Objetivo: ${processo.objetivo}\n`;
    if (processo.descricao) context += `${processo.descricao}\n`;
    if (processo.processo_etapas?.length) {
      context += "Etapas:\n";
      [...processo.processo_etapas]
        .sort((left: any, right: any) => left.ordem - right.ordem)
        .forEach((etapa: any, index: number) => {
          context += `  ${index + 1}. ${etapa.titulo}`;
          if (etapa.descricao) context += ` - ${etapa.descricao}`;
          if (etapa.responsavel) context += ` (Responsável: ${etapa.responsavel})`;
          context += "\n";
        });
    }
  });

  return context;
}

async function buildHistoricalContext(client: ReturnType<typeof createClient>, lastUserMessage: string, currentRoute: string) {
  if (!HISTORY_QUERY_REGEX.test(lastUserMessage)) return "";

  const projetoId = extractProjectIdFromRoute(currentRoute || "");

  let visitasQuery = client
    .from("diario_visitas")
    .select("id, data_visita, status_geral, registrado_por_nome, projeto_id, cliente_id, projetos(titulo), clientes(nome)")
    .order("data_visita", { ascending: false })
    .limit(projetoId ? 6 : 10);

  let alertasQuery = client
    .from("diario_alertas")
    .select("id, descricao, created_at, projeto_id, clientes(nome), projetos(titulo)")
    .eq("resolvido", false)
    .order("created_at", { ascending: false })
    .limit(projetoId ? 6 : 10);

  if (projetoId) {
    visitasQuery = visitasQuery.eq("projeto_id", projetoId);
    alertasQuery = alertasQuery.eq("projeto_id", projetoId);
  }

  const [visitasResult, alertasResult] = await Promise.all([visitasQuery, alertasQuery]);

  if (visitasResult.error) throw visitasResult.error;
  if (alertasResult.error) throw alertasResult.error;

  const visitas = visitasResult.data ?? [];
  const alertas = alertasResult.data ?? [];

  let context = "\n\n## DADOS REAIS PARA CONSULTAS DE HISTÓRICO\n";

  if (projetoId) {
    context += `Contexto atual: projeto ${projetoId}. Use esse recorte quando o usuário disser "este projeto" ou "esse diário".\n`;
  }

  context += "\n### Visitas recentes\n";
  if (!visitas.length) {
    context += "- Nenhuma visita encontrada dentro do escopo acessível do usuário.\n";
  } else {
    visitas.forEach((visita: any) => {
      context += `- ${formatDate(visita.data_visita)} · ${visita.projetos?.titulo || "Projeto"} · ${visita.clientes?.nome || "Cliente"} · status ${visita.status_geral || "não informado"} · registrado por ${visita.registrado_por_nome || "equipe"}.\n`;
    });
  }

  context += "\n### Alertas pendentes\n";
  if (!alertas.length) {
    context += "- Nenhum alerta pendente encontrado no escopo acessível do usuário.\n";
  } else {
    alertas.forEach((alerta: any) => {
      context += `- ${formatDate(alerta.created_at)} · ${alerta.projetos?.titulo || "Projeto"} · ${alerta.clientes?.nome || "Cliente"} · ${alerta.descricao}.\n`;
    });
  }

  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Backend auth keys are not configured");

    const { messages, userRole, currentPage, currentRoute } = await req.json();
    const authHeader = req.headers.get("Authorization") || "";

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    const lastUserMessage = extractLastUserMessage(messages || []);
    const [processosContext, historicalContext] = await Promise.all([
      buildProcessosContext(client),
      buildHistoricalContext(client, lastUserMessage, currentRoute || ""),
    ]);

    const systemPrompt = `Você é a Mafe, assistente inteligente da MFM Paisagismo Ecológico.

Horário de trabalho: 07h às 17h.

REGRA PRINCIPAL: Você age e resolve. Nunca mande o usuário navegar para outra tela ou seguir passos manuais.

QUANDO pedirem para registrar visita, diária ou serviço:
- Identifique o projeto mencionado
- Abra o fluxo de registro do MafeDiarioChat para aquele projeto
- Conduza o registro você mesma

QUANDO perguntarem sobre dados (clientes, equipe, máquinas, histórico, relatórios):
- Consulte o Supabase e responda com dados reais
- Exemplos: "quantos clientes temos?", "onde está a roçadeira?", "quem trabalhou na casa do Flávio semana passada?"

INTENÇÕES QUE VOCÊ RECONHECE:
- "registrar visita" / "diário" / "o que fizemos hoje" → perguntar projeto → abrir MafeDiarioChat
- "quantos clientes" / "lista de projetos" / qualquer dado → consultar Supabase e responder diretamente

Tom: direto, profissional, acolhedor. Português brasileiro. Nunca mencione "IA", "sistema" ou "banco de dados".

CONTEXTO ATUAL: Usuário na página "${currentPage || "Desconhecida"}" (${currentRoute || "/"}). Papel: ${userRole || "operador"}.

DADOS DE APOIO PARA RESPONDER COM BASE REAL:
- Quando houver histórico no contexto, priorize esse conteúdo.
- Se o dado não estiver disponível, diga claramente que não encontrou informação suficiente agora.
- Nunca invente visitas, alertas, clientes, projetos, datas ou números.
- PÁGINAS RELEVANTES: / (Menu), /clientes, /clientes/novo, /equipe, /plantas, /insumos, /fornecedores, /maquinas, /projetos/:id, /processos.${processosContext}${historicalContext}`;

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
        messages: (messages || []).map((message: { role: string; content: string }) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic error:", anthropicResponse.status, errorText);
      let errorMessage = "Erro no serviço da Mafe";

      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed?.error?.message || errorMessage;
      } catch {
        // mantém mensagem padrão
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: anthropicResponse.status >= 400 && anthropicResponse.status < 600 ? anthropicResponse.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = await parseAnthropicStream(anthropicResponse);
    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("assistente error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
