// supabase/functions/extract-cotacao-resposta/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texto, contexto_itens } = await req.json();
    if (!texto || typeof texto !== "string") {
      return new Response(JSON.stringify({ error: "texto obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextoStr = Array.isArray(contexto_itens) && contexto_itens.length
      ? `\n\nItens esperados (use o nome popular ou científico para casar):\n${
          contexto_itens.map((i: any) =>
            `- ${i.nome_popular}${i.nome_cientifico ? ` (${i.nome_cientifico})` : ""}`,
          ).join("\n")
        }`
      : "";

    const systemPrompt = `Você extrai cotações de plantas e insumos de mensagens livres (WhatsApp, e-mail).
Retorne APENAS JSON válido no formato:
{ "itens": [ { "nome": string, "preco": number|null, "porte": string|null, "unidade": string|null, "data": string|null } ] }
Regras:
- "preco" deve ser numérico (sem R$, sem ponto de milhar). Use ponto como decimal.
- Se a mensagem mencionar vírgula como decimal (R$ 1.250,00), normalize para 1250.00.
- "porte" inclui altura (ex.: "3m", "2.5m") ou DAP se houver.
- "data" no formato YYYY-MM-DD se mencionada; senão null.
- Não invente itens. Extraia somente o que está no texto.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Mensagem do fornecedor:\n${texto}${contextoStr}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await resp.json();
    const content = aiData?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { itens: [] }; }

    return new Response(JSON.stringify({ itens: parsed.itens || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
