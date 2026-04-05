import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texto } = await req.json();
    if (!texto || typeof texto !== "string" || texto.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Texto é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada");
    }

    const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const systemPrompt = `Você é a Mafe, assistente pessoal da MFM Paisagismo. Hoje é ${today}.
Leia o texto e extraia tarefas. Para cada uma identifique:
- título (curto e claro)
- prioridade: "urgente" (precisa resolver em até 2 dias), "semana" (resolver nesta semana), "mes" (pode esperar)
- prazo: data no formato YYYY-MM-DD se mencionado, ou null
- descricao: breve descrição se necessário
- dependencias: se a tarefa depende de alguém entregar algo, liste com nome_colaborador, descricao_entrega e tempo_estimado_dias

Responda APENAS em JSON válido, sem markdown, sem explicações:
{"tarefas":[{"titulo":"...","prioridade":"urgente|semana|mes","prazo":"YYYY-MM-DD ou null","descricao":"...","dependencias":[{"nome_colaborador":"...","descricao_entrega":"...","tempo_estimado_dias":1}]}]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: texto }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "{}";

    // Parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Resposta da IA não é JSON válido");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assessor-agenda error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
