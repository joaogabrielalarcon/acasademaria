import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, fileName } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um assistente especializado em extrair dados de documentos brasileiros (RG, CPF, CNH, CTPS, etc.).
Analise a imagem do documento e extraia as informações disponíveis.
Responda APENAS com o JSON, sem markdown, sem explicações.

Use a tool "extract_person_data" para retornar os dados encontrados.
Se um campo não estiver visível ou legível, omita-o (não invente dados).
Para datas, use formato YYYY-MM-DD.
Para CPF, use formato 000.000.000-00.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise este documento (${fileName || "documento"}) e extraia os dados pessoais visíveis.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_person_data",
              description: "Retorna os dados extraídos do documento",
              parameters: {
                type: "object",
                properties: {
                  nome: { type: "string", description: "Nome completo" },
                  cpf: { type: "string", description: "CPF no formato 000.000.000-00" },
                  data_nascimento: { type: "string", description: "Data de nascimento YYYY-MM-DD" },
                  tipo_documento: {
                    type: "string",
                    enum: ["RG", "CPF", "CNH", "CTPS", "Comprovante Residência", "Certidão", "Outro"],
                  },
                  endereco: { type: "string", description: "Endereço completo se visível" },
                  cidade: { type: "string" },
                  estado: { type: "string", description: "Sigla UF (ex: SP)" },
                  cep: { type: "string" },
                  tipo_cnh: {
                    type: "string",
                    enum: ["A", "B", "AB", "C", "D", "E"],
                    description: "Categoria da CNH se for documento CNH",
                  },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_person_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar documento com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair dados do documento" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-doc-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
