import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tool definitions for Claude ──────────────────────────────────────────

const TOOLS = [
  {
    name: "gerenciar_colaborador",
    description:
      "Cadastrar novo colaborador, inativar (desligar) um colaborador existente ou listar colaboradores. " +
      "Para cadastrar, forneça pelo menos o nome. Para inativar, forneça o ID e o motivo obrigatório. " +
      "Para listar/buscar, opcionalmente filtre por nome, área ou status ativo.",
    input_schema: {
      type: "object" as const,
      properties: {
        acao: {
          type: "string",
          enum: ["cadastrar", "inativar", "listar"],
          description: "Ação a ser executada",
        },
        dados: {
          type: "object",
          description:
            "Para 'cadastrar': { nome, cargo?, area_id?, area?, telefone?, email?, sub_equipe?, cidade?, estado?, cpf?, data_nascimento?, observacoes? }. " +
            "Para 'inativar': { colaborador_id, motivo }. " +
            "Para 'listar': { busca?, area_id?, ativo?, limite? }.",
        },
      },
      required: ["acao"],
    },
  },
  {
    name: "consultar_dados",
    description:
      "Consultar dados do sistema: clientes, projetos, máquinas, insumos, fornecedores. " +
      "Retorna resultados filtrados do banco de dados.",
    input_schema: {
      type: "object" as const,
      properties: {
        entidade: {
          type: "string",
          enum: ["clientes", "projetos", "maquinas", "insumos", "fornecedores", "areas"],
          description: "Tipo de dado a consultar",
        },
        filtros: {
          type: "object",
          description: "Filtros opcionais: { busca?, status?, ativo?, limite? }",
        },
      },
      required: ["entidade"],
    },
  },
  {
    name: "gerenciar_crm",
    description:
      "Criar, atualizar ou consultar cards no CRM/pipeline comercial. " +
      "Ações: criar_card, mover_card, listar_cards, adicionar_historico, criar_followup, criar_tarefa_agenda, consultar_card.",
    input_schema: {
      type: "object" as const,
      properties: {
        acao: {
          type: "string",
          enum: ["criar_card", "mover_card", "listar_cards", "adicionar_historico", "criar_followup", "criar_tarefa_agenda", "consultar_card"],
        },
        dados: {
          type: "object",
          description:
            "Para 'criar_card': { titulo, tipo (Obra|Proposta|Manutencao|Tarefa), cliente_id?, responsavel_id?, observacoes? }. " +
            "Para 'mover_card': { card_id, novo_status (Lead|Proposta Enviada|Aprovado|Em Execucao|Concluido|Pos-venda|Nao Aprovado) }. " +
            "Para 'listar_cards': { status?, tipo?, limite? }. " +
            "Para 'adicionar_historico': { card_id, descricao }. " +
            "Para 'criar_followup': { card_id, data_retorno (YYYY-MM-DD), dias_alerta?, observacao? }. " +
            "Para 'criar_tarefa_agenda': { titulo, descricao?, prioridade (urgente|semana|mes)?, prazo?, card_id? }. " +
            "Para 'consultar_card': { card_id?, busca_titulo?, busca_cliente? }.",
        },
      },
      required: ["acao"],
    },
  },
];

// ── Tool execution ───────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: any,
  supabaseUrl: string,
  serviceKey: string,
  callerAuth: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<unknown> {
  try {
    if (toolName === "gerenciar_colaborador") {
      const resp = await fetch(`${supabaseUrl}/functions/v1/mafe-colaboradores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          "x-caller-auth": callerAuth,
        },
        body: JSON.stringify(toolInput),
      });
      return await resp.json();
    }

    if (toolName === "consultar_dados") {
      return await queryData(adminClient, toolInput);
    }

    if (toolName === "gerenciar_crm") {
      return await manageCrm(adminClient, toolInput);
    }

    return { error: `Ferramenta '${toolName}' não reconhecida` };
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return { error: err instanceof Error ? err.message : "Erro ao executar operação" };
  }
}

async function queryData(client: ReturnType<typeof createClient>, input: any) {
  const { entidade, filtros = {} } = input;
  const limit = filtros.limite || 20;

  switch (entidade) {
    case "clientes": {
      let q = client.from("clientes").select("id, nome, telefone, email, cidade, estado, status");
      if (filtros.busca) q = q.ilike("nome", `%${filtros.busca}%`);
      if (filtros.status) q = q.eq("status", filtros.status);
      const { data, error } = await q.order("nome").limit(limit);
      if (error) throw error;
      return { sucesso: true, total: data?.length || 0, dados: data };
    }
    case "projetos": {
      let q = client.from("projetos").select("id, titulo, status, tipo, cliente_id, clientes(nome)");
      if (filtros.busca) q = q.ilike("titulo", `%${filtros.busca}%`);
      if (filtros.status) q = q.eq("status", filtros.status);
      const { data, error } = await q.order("updated_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return { sucesso: true, total: data?.length || 0, dados: data };
    }
    case "maquinas": {
      let q = client.from("maquinas").select("id, nome, tipo, status, patrimonio");
      if (filtros.busca) q = q.ilike("nome", `%${filtros.busca}%`);
      const { data, error } = await q.order("nome").limit(limit);
      if (error) throw error;
      return { sucesso: true, total: data?.length || 0, dados: data };
    }
    case "insumos": {
      let q = client.from("insumos").select("id, nome, categoria, unidade, preco_unitario, ativo");
      if (filtros.busca) q = q.ilike("nome", `%${filtros.busca}%`);
      if (filtros.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
      const { data, error } = await q.order("nome").limit(limit);
      if (error) throw error;
      return { sucesso: true, total: data?.length || 0, dados: data };
    }
    case "fornecedores": {
      let q = client.from("fornecedores").select("id, nome, telefone, email, cidade, categoria_fornecedor, status");
      if (filtros.busca) q = q.ilike("nome", `%${filtros.busca}%`);
      const { data, error } = await q.order("nome").limit(limit);
      if (error) throw error;
      return { sucesso: true, total: data?.length || 0, dados: data };
    }
    case "areas": {
      const { data, error } = await client.from("areas").select("id, nome, cor, ordem, ativo").eq("ativo", true).order("ordem");
      if (error) throw error;
      return { sucesso: true, dados: data };
    }
    default:
      return { error: `Entidade '${entidade}' não suportada` };
  }
}

async function manageCrm(client: ReturnType<typeof createClient>, input: any) {
  const { acao, dados = {} } = input;

  switch (acao) {
    case "criar_card": {
      if (!dados.titulo || !dados.tipo) return { error: "Título e tipo são obrigatórios" };
      const { data, error } = await client.from("crm_cards").insert({
        titulo: dados.titulo,
        tipo: dados.tipo,
        status: "Lead",
        cliente_id: dados.cliente_id || null,
        responsavel_id: dados.responsavel_id || null,
        observacoes: dados.observacoes || null,
      }).select("id, titulo, tipo, status").single();
      if (error) throw error;
      await client.from("crm_historico").insert({ card_id: data.id, descricao: "Card criado" });
      return { sucesso: true, mensagem: `Card "${data.titulo}" criado no CRM.`, card: data };
    }
    case "mover_card": {
      if (!dados.card_id || !dados.novo_status) return { error: "card_id e novo_status são obrigatórios" };
      const { data: oldCard } = await client.from("crm_cards").select("status").eq("id", dados.card_id).single();
      const { data, error } = await client.from("crm_cards")
        .update({ status: dados.novo_status })
        .eq("id", dados.card_id)
        .select("id, titulo, status")
        .single();
      if (error) throw error;
      await client.from("crm_historico").insert({
        card_id: dados.card_id,
        descricao: `Status alterado de "${oldCard?.status}" para "${dados.novo_status}"`,
      });
      return { sucesso: true, mensagem: `Card movido para "${data.status}".`, card: data };
    }
    case "listar_cards": {
      let q = client.from("crm_cards").select("id, titulo, tipo, status, prazo, clientes(nome), updated_at");
      if (dados.status) q = q.eq("status", dados.status);
      if (dados.tipo) q = q.eq("tipo", dados.tipo);
      const { data, error } = await q.order("updated_at", { ascending: false }).limit(dados.limite || 20);
      if (error) throw error;
      return { sucesso: true, total: data?.length || 0, cards: data };
    }
    case "adicionar_historico": {
      if (!dados.card_id || !dados.descricao) return { error: "card_id e descricao são obrigatórios" };
      const { error } = await client.from("crm_historico").insert({
        card_id: dados.card_id,
        descricao: dados.descricao,
      });
      if (error) throw error;
      return { sucesso: true, mensagem: "Histórico adicionado ao card." };
    }
    case "criar_followup": {
      if (!dados.card_id || !dados.data_retorno) return { error: "card_id e data_retorno são obrigatórios" };
      const { error } = await client.from("crm_followups").insert({
        card_id: dados.card_id,
        data_retorno: dados.data_retorno,
        dias_alerta: dados.dias_alerta || 3,
        observacao: dados.observacao || null,
      });
      if (error) throw error;
      const dtFmt = new Date(dados.data_retorno + "T12:00:00").toLocaleDateString("pt-BR");
      await client.from("crm_historico").insert({
        card_id: dados.card_id,
        descricao: `Follow-up agendado para ${dtFmt}${dados.observacao ? ` — ${dados.observacao}` : ""}`,
      });
      return { sucesso: true, mensagem: `Follow-up agendado para ${dtFmt}.` };
    }
    case "criar_tarefa_agenda": {
      if (!dados.titulo) return { error: "Título da tarefa é obrigatório" };
      // Need a colaborador_id — try to find from context
      // For now, return instruction
      return { error: "Para criar tarefa na agenda, use o assistente do CRM diretamente na página do CRM." };
    }
    case "consultar_card": {
      let cardData: any = null;
      if (dados.card_id) {
        const { data } = await client.from("crm_cards").select("*, clientes(nome), colaboradores(nome)").eq("id", dados.card_id).maybeSingle();
        cardData = data;
      } else if (dados.busca_titulo) {
        const { data } = await client.from("crm_cards").select("*, clientes(nome), colaboradores(nome)").ilike("titulo", `%${dados.busca_titulo}%`).limit(1).maybeSingle();
        cardData = data;
      } else if (dados.busca_cliente) {
        const { data: clientes } = await client.from("clientes").select("id").ilike("nome", `%${dados.busca_cliente}%`).limit(5);
        if (clientes?.length) {
          const { data } = await client.from("crm_cards").select("*, clientes(nome), colaboradores(nome)").in("cliente_id", clientes.map((c: any) => c.id)).order("updated_at", { ascending: false }).limit(5);
          if (data?.length === 1) cardData = data[0];
          else return { sucesso: true, total: data?.length || 0, cards: data };
        }
      }
      if (!cardData) return { error: "Card não encontrado" };
      const [histRes, followRes] = await Promise.all([
        client.from("crm_historico").select("descricao, created_at").eq("card_id", cardData.id).order("created_at", { ascending: false }).limit(10),
        client.from("crm_followups").select("*").eq("card_id", cardData.id).order("data_retorno"),
      ]);
      return {
        sucesso: true,
        card: { ...cardData, cliente_nome: cardData.clientes?.nome, responsavel_nome: cardData.colaboradores?.nome },
        historico: histRes.data || [],
        followups: followRes.data || [],
      };
    }
    default:
      return { error: `Ação CRM '${acao}' não reconhecida` };
  }
}

// ── Context builders ─────────────────────────────────────────────────────

async function buildProcessosContext(client: ReturnType<typeof createClient>) {
  const { data: processos } = await client
    .from("processos")
    .select("id, titulo, descricao, objetivo, areas:area_id(nome), processo_etapas(titulo, descricao, responsavel, ordem)")
    .eq("ativo", true)
    .order("ordem");

  if (!processos?.length) return "";

  let ctx = "\n\n## PROCESSOS INTERNOS:\n";
  processos.forEach((p: any) => {
    ctx += `\n### ${p.areas?.nome || "Sem área"} > ${p.titulo}\n`;
    if (p.objetivo) ctx += `Objetivo: ${p.objetivo}\n`;
    if (p.processo_etapas?.length) {
      ctx += "Etapas:\n";
      [...p.processo_etapas].sort((a: any, b: any) => a.ordem - b.ordem).forEach((e: any, i: number) => {
        ctx += `  ${i + 1}. ${e.titulo}${e.descricao ? ` - ${e.descricao}` : ""}${e.responsavel ? ` (${e.responsavel})` : ""}\n`;
      });
    }
  });
  return ctx;
}

async function buildAreasContext(client: ReturnType<typeof createClient>) {
  const { data: areas } = await client.from("areas").select("id, nome, ordem").eq("ativo", true).order("ordem");
  if (!areas?.length) return "";
  return "\n\n## ÁREAS DA EMPRESA:\n" + areas.map((a: any) => `- ${a.nome} (ID: ${a.id})`).join("\n");
}

// ── Anthropic orchestration ──────────────────────────────────────────────

async function callClaude(
  messages: any[],
  systemPrompt: string,
  apiKey: string,
  withTools: boolean,
) {
  const body: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  };

  if (withTools) {
    body.tools = TOOLS;
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("Anthropic error:", resp.status, errorText);
    throw new Error(`Anthropic API error: ${resp.status}`);
  }

  return await resp.json();
}

async function orchestrate(
  userMessages: any[],
  systemPrompt: string,
  apiKey: string,
  supabaseUrl: string,
  serviceKey: string,
  callerAuth: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<string> {
  const currentMessages = [...userMessages];
  const MAX_ROUNDS = 5;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await callClaude(currentMessages, systemPrompt, apiKey, true);

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      // Final text response
      return (response.content || [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
    }

    if (response.stop_reason === "tool_use") {
      const toolBlocks = (response.content || []).filter((b: any) => b.type === "tool_use");

      if (!toolBlocks.length) {
        return (response.content || [])
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("");
      }

      // Execute all tool calls in parallel
      const results = await Promise.all(
        toolBlocks.map(async (block: any) => {
          const result = await executeTool(
            block.name,
            block.input,
            supabaseUrl,
            serviceKey,
            callerAuth,
            adminClient,
          );
          return {
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
      );

      // Add assistant response + tool results to conversation
      currentMessages.push({ role: "assistant", content: response.content });
      currentMessages.push({ role: "user", content: results });
    }
  }

  return "Desculpe, a operação ficou complexa demais. Tente dividir em etapas menores.";
}

// ── SSE streaming helper ─────────────────────────────────────────────────

function streamText(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      // Stream in chunks for a natural typing feel
      const chunkSize = 8;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// ── Main handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) throw new Error("Backend keys not configured");

    const { messages, userRole, currentPage, currentRoute } = await req.json();
    const authHeader = req.headers.get("Authorization") || "";

    // User-scoped client (for context queries respecting RLS)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Admin client (for tool operations)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Build context in parallel
    const [processosContext, areasContext] = await Promise.all([
      buildProcessosContext(userClient),
      buildAreasContext(adminClient),
    ]);

    const systemPrompt = `Você é a Mafe, assistente inteligente e orquestradora da MFM Paisagismo Ecológico.

## SUA FUNÇÃO
Você é uma ORQUESTRADORA. Não executa tarefas manualmente — você delega para agentes especializados através das ferramentas disponíveis. Cada ferramenta é um agente autônomo que executa a tarefa com precisão.

## REGRAS DE OURO
1. NUNCA mande o usuário fazer algo manualmente — VOCÊ faz, usando as ferramentas.
2. SEMPRE confirme dados críticos antes de executar (ex: antes de inativar, confirme o nome).
3. Para INATIVAR colaborador, o motivo é OBRIGATÓRIO — pergunte se não informado.
4. Para CADASTRAR, colete no mínimo o nome. Aceite dados em texto livre ou conversacional.
5. Quando o resultado de uma ferramenta voltar, apresente de forma clara e humanizada.
6. Nunca mencione "IA", "sistema", "banco de dados", "ferramenta" ou "tool". Fale naturalmente.
7. Use português brasileiro, tom direto, profissional e acolhedor.

## CAPACIDADES (via agentes especializados)
- **Colaboradores**: Cadastrar, desligar (inativar com motivo), listar e buscar funcionários.
- **Consultas**: Buscar clientes, projetos, máquinas, insumos, fornecedores, áreas.
- **CRM**: Criar cards, mover entre etapas do pipeline, consultar cards, adicionar histórico.
- **Diário de Manutenção**: Reconheça intenções de "registrar visita" e oriente que o diário funciona pelo fluxo dedicado (MafeDiarioChat).

## FLUXO DE CADASTRO DE COLABORADOR
Aceite dados de duas formas:
- **Conversacional**: Pergunte o nome e vá coletando informações gradualmente.
- **Texto livre**: Se o usuário enviar tudo de uma vez ("cadastra o João, cargo jardineiro, área Campo"), extraia os dados e execute.

## FLUXO DE DESLIGAMENTO
1. Identifique o colaborador (busque se necessário).
2. Pergunte o motivo do desligamento (OBRIGATÓRIO).
3. Confirme a ação antes de executar.
4. Execute a inativação.

## CONTEXTO ATUAL
- Página: "${currentPage || "Desconhecida"}" (${currentRoute || "/"})
- Papel do usuário: ${userRole || "operador"}
- Horário de trabalho: 07h às 17h${areasContext}${processosContext}`;

    // Prepare messages for Claude (filter out intro message)
    const claudeMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Orchestrate: tool calling loop → final text
    const finalText = await orchestrate(
      claudeMessages,
      systemPrompt,
      ANTHROPIC_API_KEY,
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
      authHeader,
      adminClient,
    );

    // Stream the final response
    const stream = streamText(finalText);
    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("assistente-mfm error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
