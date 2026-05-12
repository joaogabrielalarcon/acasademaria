// Edge function: cotacao-ia-chat
// IA conversacional (Mafe) para atualização de cotações de fornecedor.
// Usa Lovable AI Gateway, modelo google/gemini-3-flash-preview (com visão).
// Suporta tool call estruturado para gerar propostas de atualização.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const MAX_MESSAGES = 50;

interface ItemContexto {
  item_id: string;
  item_tipo: "planta" | "insumo";
  nome_popular: string;
  nome_cientifico?: string | null;
  porte?: string | null;
  preco_atual?: number | null;
  unidade?: string | null;
  ultima_cotacao?: string | null;
  portes_disponiveis?: string[];
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  image_base64?: string | null; // dataURL completo (data:image/...;base64,...)
  image_mime?: string | null;
}

function buildSystemPrompt(fornecedorNome: string, mercado: string | null, itens: ItemContexto[]) {
  const lista = itens
    .map((i, idx) => {
      const portes = i.portes_disponiveis && i.portes_disponiveis.length > 1
        ? ` (portes cadastrados: ${i.portes_disponiveis.join(", ")})`
        : "";
      const preco = i.preco_atual != null ? `R$ ${i.preco_atual.toFixed(2)}` : "sem preço";
      const data = i.ultima_cotacao
        ? new Date(i.ultima_cotacao).toLocaleDateString("pt-BR")
        : "—";
      return `${idx + 1}. ${i.nome_popular}${i.nome_cientifico ? ` (${i.nome_cientifico})` : ""} · porte ${i.porte || "—"}${portes} · atual ${preco} · última cotação ${data}`;
    })
    .join("\n");

  return `Você é a Mafe, assistente operacional da Casa de Maria, ajudando a atualizar preços do fornecedor "${fornecedorNome}"${mercado ? ` (mercado: ${mercado})` : ""}.

Itens deste fornecedor neste orçamento:
${lista || "(sem itens)"}

REGRAS:
- O operador vai colar texto, mensagem ou print do fornecedor. Extraia preços e proponha atualizações apenas para os itens listados acima.
- Se o operador mencionar um item com múltiplos portes cadastrados (ex: 0,30m e 0,60m), pergunte qual porte antes de propor. Nunca adivinhe.
- Use o formato brasileiro de moeda (R$) e vírgula como separador decimal nas suas mensagens, mas dentro do tool envie ponto.
- Se o valor proposto for muito diferente do atual (mais de 50% para mais ou menos), confirme com o operador antes de incluir na proposta.
- Quando o operador disser "pronto", "aplica", "fechou" ou equivalente, e houver pelo menos uma proposta clara, chame a tool gerar_propostas com a lista completa.
- Seja direta, sem rodeios. Não mencione "IA", "modelo" ou "banco de dados".
- Não use travessão (—) nas suas respostas.
- Se a imagem estiver ilegível, diga isso claramente e peça nova foto ou texto.`;
}

const TOOL_GERAR_PROPOSTAS = {
  type: "function",
  function: {
    name: "gerar_propostas",
    description:
      "Gera a lista final de propostas de atualização de preço para o operador revisar. Use somente quando o operador confirmar que terminou.",
    parameters: {
      type: "object",
      properties: {
        propostas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_id: { type: "string", description: "ID do item no catálogo" },
              item_tipo: { type: "string", enum: ["planta", "insumo"] },
              nome_popular: { type: "string" },
              porte: { type: "string", description: "Porte ofertado pelo fornecedor (ex: 0,40)" },
              preco_atual: { type: ["number", "null"] },
              preco_novo: { type: "number", description: "Novo preço unitário em R$" },
              observacao: { type: "string", description: "Observação opcional sobre essa atualização" },
            },
            required: ["item_id", "item_tipo", "nome_popular", "preco_novo"],
            additionalProperties: false,
          },
        },
        resumo: { type: "string", description: "Frase curta de fechamento para o operador" },
      },
      required: ["propostas"],
      additionalProperties: false,
    },
  },
} as const;

function toGeminiMessages(messages: ChatMsg[]) {
  return messages.map((m) => {
    if (m.image_base64) {
      // OpenAI-compat content array
      return {
        role: m.role,
        content: [
          { type: "text", text: m.content || "" },
          { type: "image_url", image_url: { url: m.image_base64 } },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      messages,
      contexto,
    }: {
      messages: ChatMsg[];
      contexto: {
        fornecedor_id: string;
        fornecedor_nome: string;
        mercado?: string | null;
        itens: ItemContexto[];
      };
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `Limite de ${MAX_MESSAGES} mensagens atingido` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!contexto?.itens) {
      return new Response(JSON.stringify({ error: "contexto.itens obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limita imagens (1 por mensagem) — já validado no front, mas reforça aqui
    for (const m of messages) {
      if (m.image_base64 && !m.image_base64.startsWith("data:image/")) {
        return new Response(JSON.stringify({ error: "Formato de imagem inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const system = buildSystemPrompt(contexto.fornecedor_nome, contexto.mercado || null, contexto.itens);
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: system },
        ...toGeminiMessages(messages),
      ],
      tools: [TOOL_GERAR_PROPOSTAS],
      tool_choice: "auto",
      temperature: 0.3,
    };

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limit", message: "Muitas requisições à IA. Tente em alguns segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted", message: "Créditos de IA esgotados. Adicione créditos na conta para continuar." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[cotacao-ia-chat] erro gateway", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "ia_error", message: "A IA não conseguiu responder. Tente novamente.", detail: errText.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const choice = aiJson?.choices?.[0];
    const message = choice?.message;
    const toolCalls = message?.tool_calls || [];

    let propostas: any[] | null = null;
    let resumo: string | null = null;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const tc = toolCalls.find((t: any) => t?.function?.name === "gerar_propostas");
      if (tc) {
        try {
          const parsed = JSON.parse(tc.function.arguments || "{}");
          propostas = Array.isArray(parsed.propostas) ? parsed.propostas : [];
          resumo = parsed.resumo || null;
        } catch (e) {
          console.warn("[cotacao-ia-chat] JSON inválido em tool args", e);
        }
      }
    }

    const assistant_text: string = message?.content || resumo ||
      (propostas ? "Preparei as propostas abaixo. Revise e selecione o que aplicar." : "");

    return new Response(
      JSON.stringify({
        assistant_message: assistant_text,
        propostas,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[cotacao-ia-chat] exception", err);
    return new Response(
      JSON.stringify({ error: "exception", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
