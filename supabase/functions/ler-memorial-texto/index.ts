import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { texto } = await req.json();
    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return new Response(
        JSON.stringify({ error: "Texto vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Você é especialista em paisagismo. Leia este memorial descritivo (texto colado pelo usuário) e extraia TODOS os itens de plantas e materiais.
Para cada item retorne JSON com estes campos exatos:
nome_popular (string),
nome_cientifico (string ou null),
porte (string exatamente como escrito no documento),
quantidade (número),
unidade (string: UNID/M2/CX/SACO/POTE conforme documento),
categoria (string: uma de: Árvores / Arbustos e Herbáceas / Forrações / Trepadeiras / Palmeiras / Gramado / Vasos),
confianca (string: alta/media/baixa).
Responda APENAS com array JSON válido, sem markdown, sem explicações, sem texto antes ou depois.

MEMORIAL:
${texto}`,
            },
          ],
        },
      ],
    });

    const block = response.content[0] as { type: string; text?: string };
    let txt = block.text ?? "";
    txt = txt.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let itens: unknown;
    try {
      itens = JSON.parse(txt);
    } catch (_e) {
      const match = txt.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Resposta da IA não está em JSON válido");
      itens = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ itens }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ler-memorial-texto error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
