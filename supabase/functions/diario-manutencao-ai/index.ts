import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { message, colaboradores, maquinas, insumos, servicoTipos } = await req.json();

    const systemPrompt = `Você é um assistente especializado em manutenção de jardins e paisagismo. 
Sua função é interpretar descrições de visitas de manutenção (por texto ou transcrição de áudio) e extrair dados estruturados.

Você deve retornar um JSON com a seguinte estrutura:
{
  "horas_trabalhadas": number (total de horas estimadas se mencionado),
  "servicos": [
    {
      "tipo": string (um dos tipos disponíveis),
      "descricao": string | null,
      "quantidade": number | null,
      "unidade": string | null
    }
  ],
  "recursos_maquinas": [
    {
      "maquina_id": string (ID da máquina se identificada),
      "maquina_nome": string (nome para referência),
      "horas_uso": number | null
    }
  ],
  "recursos_insumos": [
    {
      "insumo_id": string (ID do insumo se identificado),
      "insumo_nome": string (nome para referência),
      "quantidade": number | null,
      "unidade": string | null
    }
  ],
  "ocorrencias": string | null (problemas encontrados),
  "observacoes_internas": string | null,
  "novos_servicos": [
    {
      "nome_sugerido": string,
      "descricao": string
    }
  ]
}

TIPOS DE SERVIÇO DISPONÍVEIS:
${servicoTipos?.map((s: any) => `- ${s.value}: ${s.label}`).join("\n") || "poda_geral, poda_finos, poda_palmeiras, adubacao, irrigacao_verificacao, irrigacao_regulagem, irrigacao_reparo, limpeza, replantio, controle_fitossanitario, outro"}

COLABORADORES CADASTRADOS:
${colaboradores?.map((c: any) => `- ID: ${c.id} | Nome: ${c.nome}`).join("\n") || "Nenhum"}

MÁQUINAS CADASTRADAS:
${maquinas?.map((m: any) => `- ID: ${m.id} | Nome: ${m.nome}`).join("\n") || "Nenhuma"}

INSUMOS CADASTRADOS:
${insumos?.map((i: any) => `- ID: ${i.id} | Nome: ${i.nome} | Unidade: ${i.unidade || "un"}`).join("\n") || "Nenhum"}

REGRAS:
1. Interprete a descrição do usuário e mapeie para os tipos de serviço existentes
2. Se um serviço descrito não se encaixa nos tipos existentes, adicione em "novos_servicos" E também adicione como tipo "outro" em servicos
3. Tente identificar máquinas e insumos pelos nomes cadastrados, fazendo matching fuzzy
4. Se não conseguir identificar um recurso, deixe o ID null e preencha o nome
5. Extraia horas trabalhadas se mencionadas
6. Separe ocorrências (problemas/pragas/danos) de observações gerais
7. Seja preciso nas quantidades e unidades mencionadas
8. Se algo não for mencionado, não invente - deixe null ou array vazio`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_maintenance_data",
                description: "Extract structured maintenance visit data from user description",
                parameters: {
                  type: "object",
                  properties: {
                    horas_trabalhadas: { type: "number", description: "Total hours worked" },
                    servicos: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          tipo: { type: "string" },
                          descricao: { type: "string" },
                          quantidade: { type: "number" },
                          unidade: { type: "string" },
                        },
                        required: ["tipo"],
                      },
                    },
                    recursos_maquinas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          maquina_id: { type: "string" },
                          maquina_nome: { type: "string" },
                          horas_uso: { type: "number" },
                        },
                        required: ["maquina_nome"],
                      },
                    },
                    recursos_insumos: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          insumo_id: { type: "string" },
                          insumo_nome: { type: "string" },
                          quantidade: { type: "number" },
                          unidade: { type: "string" },
                        },
                        required: ["insumo_nome"],
                      },
                    },
                    ocorrencias: { type: "string" },
                    observacoes_internas: { type: "string" },
                    novos_servicos: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nome_sugerido: { type: "string" },
                          descricao: { type: "string" },
                        },
                        required: ["nome_sugerido"],
                      },
                    },
                  },
                  required: ["servicos"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_maintenance_data" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error("Erro no serviço de IA");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta inesperada da IA");
    }

    let extractedData;
    try {
      extractedData =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
    } catch {
      throw new Error("Erro ao processar resposta da IA");
    }

    return new Response(JSON.stringify({ data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("diario-manutencao-ai error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
