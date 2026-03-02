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

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    
    const { messages, userRole } = await req.json();

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

    // Build processos context
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

    const systemPrompt = `Você é o assistente virtual da MFM Paisagismo. Seu nome é MFM Assistente.
Você ajuda os colaboradores a entenderem e executarem os processos internos da empresa.

REGRAS:
- Responda sempre em português brasileiro
- Seja objetivo e prático
- Quando o usuário perguntar sobre um processo, consulte os processos internos disponíveis abaixo
- Se não encontrar um processo relevante, oriente o usuário da melhor forma possível
- O usuário tem o papel de: ${userRole || 'operador'}
- Não execute ações diretamente, apenas oriente o usuário sobre como fazer
- Use formatação markdown para organizar suas respostas
- Seja simpático e profissional
${processosContext}

MÓDULOS DO SISTEMA:
- Clientes: Cadastro e gestão de clientes, registros de serviços, propostas
- Equipe: Gestão de colaboradores, custos, entregas
- Plantas: Catálogo de plantas com categorias
- Produtos e Insumos: Materiais utilizados nos serviços
- Fornecedores: Cadastro de fornecedores
- Máquinas: Equipamentos e controle de manutenção
- Projetos: Orçamentos, memorial descritivo, execução
- Processos Internos: Documentação de processos por área`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }), {
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
