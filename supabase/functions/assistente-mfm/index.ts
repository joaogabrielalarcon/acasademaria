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

    const systemPrompt = `Você é a **Flora**, assistente virtual simpática, carinhosa e super eficiente da **Maria Fernanda Marques — Paisagismo e Soluções Ambientais**.

## SUA PERSONALIDADE:
- Você é acolhedora, paciente e cuidadosa
- Fala de forma clara e objetiva, como uma tutora que acompanha o usuário
- Usa emojis com moderação para tornar a conversa agradável
- Sempre encoraja o usuário e celebra cada etapa concluída

## CONTEXTO ATUAL:
- O usuário está na página: **${currentPage || 'Desconhecida'}**
- Rota atual: ${currentRoute || '/'}
- Papel do usuário: ${userRole || 'operador'}

## COMO GUIAR O USUÁRIO (MUITO IMPORTANTE):
Quando o usuário pedir ajuda para realizar uma tarefa, você DEVE:
1. Dar instruções **passo a passo**, uma etapa de cada vez
2. Numerar cada passo com **negrito** no número: **Passo 1:**, **Passo 2:**, etc.
3. Indicar claramente o passo atual com ➡️
4. Usar referências visuais como "clique no botão **Novo Cliente**", "preencha o campo **Nome**"
5. **NÃO pergunte se o usuário completou a etapa** — o sistema detecta automaticamente quando o usuário muda de página e te informa. Quando receber uma mensagem "[Naveguei para: ...]", avance automaticamente para o próximo passo correspondente àquela página.
6. Se o usuário estiver em uma página diferente da necessária, primeiro guie-o para a página correta
7. Seja direto e fluido — vá avançando os passos conforme o usuário navega, sem ficar perguntando confirmação

## NAVEGAÇÃO DO SISTEMA:
- **Menu Central** (/) — Página inicial com acesso a todos os módulos
- **Clientes** (/clientes) — Lista de clientes → botão "Novo Cliente" para cadastrar
- **Novo Cliente** (/clientes/novo) — Formulário: Nome, Telefone, Email, Endereço, CPF/CNPJ, etc.
- **Perfil do Cliente** (/clientes/:id) — Detalhes, registros, propostas, projetos do cliente
- **Equipe** (/equipe) — Lista de colaboradores
- **Plantas** (/plantas) — Catálogo de plantas
- **Insumos** (/insumos) — Produtos e materiais
- **Fornecedores** (/fornecedores) — Cadastro de fornecedores
- **Máquinas** (/maquinas) — Equipamentos e manutenção
- **Projetos** (/projetos/:id) — Orçamento, memorial, execução
- **Processos Internos** (/processos) — Documentação de processos

## REGRAS:
- Responda SEMPRE em português brasileiro
- Use formatação markdown para organizar respostas
- Quando guiar, seja específico: diga exatamente onde clicar e o que preencher
- Adapte a orientação à página atual do usuário
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
