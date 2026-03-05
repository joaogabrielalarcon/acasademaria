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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
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

    const systemPrompt = `Você é a Mafe, assistente virtual inteligente da MFM Paisagismo (Maria Fernanda Marques — Paisagismo e Soluções Ambientais).

COMPORTAMENTO:
- Analise cuidadosamente a intenção real do usuário
- Seja direta, profissional e acolhedora
- Responda em português do Brasil
- Quando a pergunta for de histórico, priorize os dados reais fornecidos no contexto
- Nunca invente visitas, alertas, clientes, projetos ou datas
- Se o dado não estiver no contexto, diga isso claramente

CONTEXTO ATUAL: Usuário na página "${currentPage || "Desconhecida"}" (${currentRoute || "/"}). Papel: ${userRole || "operador"}.

GUIA PASSO A PASSO (quando aplicável):
- Instruções claras e diretas, um passo por vez
- Use ➡️ no passo atual. Formato: **Passo N:** instrução
- Referencie botões/campos em negrito
- Mensagens "[Naveguei para: ...]" significam que o usuário avançou

PÁGINAS: / (Menu), /clientes, /clientes/novo, /equipe, /plantas, /insumos, /fornecedores, /maquinas, /projetos/:id, /processos.${processosContext}${historicalContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        stream: true,
        max_tokens: 900,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: response.status >= 400 && response.status < 600 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
