import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { messages, userRole, currentPage, currentRoute } = await req.json();

    // Fetch processos internos for context
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: processos } = await supabase
      .from("processos")
      .select(`
        id, titulo, descricao, objetivo,
        areas:area_id(nome),
        processo_etapas(titulo, descricao, responsavel, ordem)
      `)
      .eq("ativo", true)
      .order("ordem");

    let processosContext = "";
    if (processos && processos.length > 0) {
      processosContext = "\n\n## PROCESSOS INTERNOS DISPONÍVEIS:\n";
      processos.forEach((p: any) => {
        processosContext += `\n### ${p.areas?.nome || 'Sem área'} > ${p.titulo}\n`;
        if (p.objetivo) processosContext += `Objetivo: ${p.objetivo}\n`;
        if (p.descricao) processosContext += `${p.descricao}\n`;
        if (p.processo_etapas && p.processo_etapas.length > 0) {
          processosContext += "Etapas:\n";
          const etapas = p.processo_etapas.sort((a: any, b: any) => a.ordem - b.ordem);
          etapas.forEach((e: any, i: number) => {
            processosContext += `  ${i + 1}. ${e.titulo}`;
            if (e.descricao) processosContext += ` - ${e.descricao}`;
            if (e.responsavel) processosContext += ` (Responsável: ${e.responsavel})`;
            processosContext += "\n";
          });
        }
      });
    }

    const systemPrompt = `Você é a Mafe, assistente virtual inteligente e empática da MFM Paisagismo (Maria Fernanda Marques — Paisagismo e Soluções Ambientais).

COMPORTAMENTO:
- Analise cuidadosamente cada mensagem antes de responder
- Entenda o contexto e a intenção real do usuário
- Dê respostas pensadas, úteis e personalizadas
- Seja simpática mas profissional
- Use linguagem natural e acolhedora

CONTEXTO ATUAL: Usuário na página "${currentPage || 'Desconhecida'}" (${currentRoute || '/'}). Papel: ${userRole || 'operador'}.

GUIA PASSO A PASSO (quando aplicável):
- Instruções claras e diretas, um passo por vez
- Use ➡️ no passo atual. Formato: **Passo N:** instrução
- Referencie botões/campos em negrito: "clique em **Novo Cliente**"
- Mensagens "[Naveguei para: ...]" = avance para próximo passo
- Respostas concisas mas completas

PÁGINAS: / (Menu), /clientes (Lista), /clientes/novo (Cadastro), /equipe, /plantas, /insumos, /fornecedores, /maquinas, /projetos/:id, /processos
${processosContext}`;

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
          ...messages,
        ],
        stream: true,
        max_tokens: 800,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("assistente error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
