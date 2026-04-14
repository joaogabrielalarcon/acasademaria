import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS = [
  {
    name: "listar_cards",
    description:
      "Listar cards do CRM. Filtre por status, tipo, cliente ou busca textual.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filtrar por status: Lead, Proposta Enviada, Aprovado, Em Execucao, Concluido, Pos-venda, Nao Aprovado" },
        tipo: { type: "string", description: "Filtrar por tipo: Obra, Proposta, Manutencao, Tarefa" },
        busca: { type: "string", description: "Busca textual no título do card" },
        limite: { type: "number", description: "Máximo de resultados (padrão 20)" },
      },
    },
  },
  {
    name: "consultar_card",
    description: "Ver detalhes de um card específico, incluindo histórico e follow-ups.",
    input_schema: {
      type: "object" as const,
      properties: {
        card_id: { type: "string", description: "ID do card" },
        busca_titulo: { type: "string", description: "Buscar card pelo título (parcial)" },
        busca_cliente: { type: "string", description: "Buscar card pelo nome do cliente (parcial)" },
      },
    },
  },
  {
    name: "mover_card",
    description:
      "Mover um card para outro estágio do pipeline.",
    input_schema: {
      type: "object" as const,
      properties: {
        card_id: { type: "string", description: "ID do card" },
        novo_status: {
          type: "string",
          enum: ["Lead", "Proposta Enviada", "Aprovado", "Em Execucao", "Concluido", "Pos-venda", "Nao Aprovado"],
        },
      },
      required: ["card_id", "novo_status"],
    },
  },
  {
    name: "adicionar_observacao",
    description:
      "Adicionar uma observação/nota/comentário ao histórico de um card. Use para registrar atualizações, ligações, reuniões, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        card_id: { type: "string", description: "ID do card" },
        descricao: { type: "string", description: "Texto da observação" },
      },
      required: ["card_id", "descricao"],
    },
  },
  {
    name: "criar_followup",
    description:
      "Agendar um follow-up/retorno para um card. Gera alerta automático.",
    input_schema: {
      type: "object" as const,
      properties: {
        card_id: { type: "string", description: "ID do card" },
        data_retorno: { type: "string", description: "Data do retorno (YYYY-MM-DD)" },
        dias_alerta: { type: "number", description: "Dias antes para alertar (padrão 3)" },
        observacao: { type: "string", description: "Observação do follow-up" },
      },
      required: ["card_id", "data_retorno"],
    },
  },
  {
    name: "criar_tarefa_agenda",
    description:
      "Criar uma tarefa na agenda pessoal vinculada a um card do CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        titulo: { type: "string", description: "Título da tarefa" },
        descricao: { type: "string", description: "Descrição da tarefa" },
        prioridade: { type: "string", enum: ["urgente", "semana", "mes"], description: "Prioridade" },
        prazo: { type: "string", description: "Data limite (YYYY-MM-DD)" },
        card_id: { type: "string", description: "ID do card CRM relacionado (para referência no histórico)" },
      },
      required: ["titulo"],
    },
  },
  {
    name: "atualizar_card",
    description:
      "Atualizar dados de um card: contato, prazo, observações, responsável, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        card_id: { type: "string", description: "ID do card" },
        titulo: { type: "string" },
        contato_nome: { type: "string" },
        contato_cargo: { type: "string" },
        contato_whatsapp: { type: "string" },
        contato_email: { type: "string" },
        prazo: { type: "string", description: "YYYY-MM-DD" },
        observacoes: { type: "string" },
        responsavel_id: { type: "string" },
        cliente_id: { type: "string" },
      },
      required: ["card_id"],
    },
  },
  {
    name: "criar_card",
    description: "Criar um novo card no CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        titulo: { type: "string", description: "Título do card" },
        tipo: { type: "string", enum: ["Obra", "Proposta", "Manutencao", "Tarefa"] },
        cliente_id: { type: "string" },
        responsavel_id: { type: "string" },
        contato_nome: { type: "string" },
        contato_whatsapp: { type: "string" },
        contato_email: { type: "string" },
        observacoes: { type: "string" },
        prazo: { type: "string" },
      },
      required: ["titulo", "tipo"],
    },
  },
];

// ── Tool execution ───────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: any,
  client: ReturnType<typeof createClient>,
  userId: string,
  colaboradorId: string | null,
): Promise<unknown> {
  try {
    switch (toolName) {
      case "listar_cards": {
        let q = client
          .from("crm_cards")
          .select("id, titulo, tipo, status, prazo, observacoes, contato_nome, clientes(nome), colaboradores(nome), updated_at");
        if (input.status) q = q.eq("status", input.status);
        if (input.tipo) q = q.eq("tipo", input.tipo);
        if (input.busca) q = q.ilike("titulo", `%${input.busca}%`);
        const { data, error } = await q.order("updated_at", { ascending: false }).limit(input.limite || 20);
        if (error) throw error;
        return {
          sucesso: true,
          total: data?.length || 0,
          cards: (data || []).map((c: any) => ({
            ...c,
            cliente_nome: c.clientes?.nome || null,
            responsavel_nome: c.colaboradores?.nome || null,
            clientes: undefined,
            colaboradores: undefined,
          })),
        };
      }

      case "consultar_card": {
        let cardData: any = null;
        if (input.card_id) {
          const { data, error } = await client
            .from("crm_cards")
            .select("*, clientes(nome), colaboradores(nome)")
            .eq("id", input.card_id)
            .maybeSingle();
          if (error) throw error;
          cardData = data;
        } else if (input.busca_titulo) {
          const { data, error } = await client
            .from("crm_cards")
            .select("*, clientes(nome), colaboradores(nome)")
            .ilike("titulo", `%${input.busca_titulo}%`)
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          cardData = data;
        } else if (input.busca_cliente) {
          const { data: clientes } = await client
            .from("clientes")
            .select("id")
            .ilike("nome", `%${input.busca_cliente}%`)
            .limit(5);
          if (clientes?.length) {
            const ids = clientes.map((c: any) => c.id);
            const { data, error } = await client
              .from("crm_cards")
              .select("*, clientes(nome), colaboradores(nome)")
              .in("cliente_id", ids)
              .order("updated_at", { ascending: false })
              .limit(5);
            if (error) throw error;
            if (data?.length === 1) cardData = data[0];
            else return { sucesso: true, total: data?.length || 0, cards: data };
          }
        }

        if (!cardData) return { error: "Card não encontrado" };

        // Get historico and followups
        const [histRes, followRes] = await Promise.all([
          client.from("crm_historico").select("descricao, created_at, colaboradores(nome)").eq("card_id", cardData.id).order("created_at", { ascending: false }).limit(15),
          client.from("crm_followups").select("*").eq("card_id", cardData.id).order("data_retorno", { ascending: true }),
        ]);

        return {
          sucesso: true,
          card: {
            ...cardData,
            cliente_nome: cardData.clientes?.nome || null,
            responsavel_nome: cardData.colaboradores?.nome || null,
          },
          historico: (histRes.data || []).map((h: any) => ({
            descricao: h.descricao,
            data: h.created_at,
            autor: h.colaboradores?.nome || null,
          })),
          followups: followRes.data || [],
        };
      }

      case "mover_card": {
        // Get old status first
        const { data: oldCard } = await client.from("crm_cards").select("status, titulo").eq("id", input.card_id).single();
        const oldStatus = oldCard?.status || "desconhecido";

        const { data, error } = await client
          .from("crm_cards")
          .update({ status: input.novo_status })
          .eq("id", input.card_id)
          .select("id, titulo, status")
          .single();
        if (error) throw error;

        // Add history
        await client.from("crm_historico").insert({
          card_id: input.card_id,
          descricao: `Status alterado de "${oldStatus}" para "${input.novo_status}"`,
          colaborador_id: colaboradorId,
        });

        return { sucesso: true, mensagem: `Card "${data.titulo}" movido para "${input.novo_status}".`, card: data };
      }

      case "adicionar_observacao": {
        const { error } = await client.from("crm_historico").insert({
          card_id: input.card_id,
          descricao: input.descricao,
          colaborador_id: colaboradorId,
        });
        if (error) throw error;
        return { sucesso: true, mensagem: "Observação registrada com sucesso." };
      }

      case "criar_followup": {
        const { error } = await client.from("crm_followups").insert({
          card_id: input.card_id,
          data_retorno: input.data_retorno,
          dias_alerta: input.dias_alerta || 3,
          observacao: input.observacao || null,
        });
        if (error) throw error;

        // Also add to history
        const dateFormatted = new Date(input.data_retorno + "T12:00:00").toLocaleDateString("pt-BR");
        await client.from("crm_historico").insert({
          card_id: input.card_id,
          descricao: `Follow-up agendado para ${dateFormatted}${input.observacao ? ` — ${input.observacao}` : ""}`,
          colaborador_id: colaboradorId,
        });

        return { sucesso: true, mensagem: `Follow-up agendado para ${dateFormatted}.` };
      }

      case "criar_tarefa_agenda": {
        if (!colaboradorId) return { error: "Usuário não vinculado a um colaborador" };

        const { data, error } = await client.from("assessor_tarefas").insert({
          usuario_id: colaboradorId,
          titulo: input.titulo,
          descricao: input.descricao || null,
          prioridade: input.prioridade || "semana",
          prazo: input.prazo || null,
        }).select("id").single();
        if (error) throw error;

        // If card_id, add to CRM history too
        if (input.card_id) {
          await client.from("crm_historico").insert({
            card_id: input.card_id,
            descricao: `Tarefa criada na agenda: "${input.titulo}"`,
            colaborador_id: colaboradorId,
          });
        }

        return { sucesso: true, mensagem: `Tarefa "${input.titulo}" adicionada à sua agenda.` };
      }

      case "atualizar_card": {
        const { card_id, ...updates } = input;
        // Remove undefined fields
        const cleanUpdates: Record<string, any> = {};
        for (const [k, v] of Object.entries(updates)) {
          if (v !== undefined && v !== null) cleanUpdates[k] = v;
        }

        const { data, error } = await client
          .from("crm_cards")
          .update(cleanUpdates)
          .eq("id", card_id)
          .select("id, titulo")
          .single();
        if (error) throw error;

        // History entry
        const fields = Object.keys(cleanUpdates).join(", ");
        await client.from("crm_historico").insert({
          card_id,
          descricao: `Dados atualizados: ${fields}`,
          colaborador_id: colaboradorId,
        });

        return { sucesso: true, mensagem: `Card "${data.titulo}" atualizado.` };
      }

      case "criar_card": {
        const { data, error } = await client.from("crm_cards").insert({
          titulo: input.titulo,
          tipo: input.tipo,
          status: "Lead",
          cliente_id: input.cliente_id || null,
          responsavel_id: input.responsavel_id || null,
          contato_nome: input.contato_nome || null,
          contato_whatsapp: input.contato_whatsapp || null,
          contato_email: input.contato_email || null,
          observacoes: input.observacoes || null,
          prazo: input.prazo || null,
        }).select("id, titulo, tipo, status").single();
        if (error) throw error;

        await client.from("crm_historico").insert({
          card_id: data.id,
          descricao: "Card criado",
          colaborador_id: colaboradorId,
        });

        return { sucesso: true, mensagem: `Card "${data.titulo}" criado no CRM.`, card: data };
      }

      default:
        return { error: `Ferramenta '${toolName}' não reconhecida` };
    }
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return { error: err instanceof Error ? err.message : "Erro ao executar operação" };
  }
}

// ── Anthropic orchestration (multi-round) ────────────────────────────────

async function callClaude(messages: any[], systemPrompt: string, apiKey: string) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: TOOLS,
    }),
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
  client: ReturnType<typeof createClient>,
  userId: string,
  colaboradorId: string | null,
): Promise<string> {
  const currentMessages = [...userMessages];
  const MAX_ROUNDS = 6;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await callClaude(currentMessages, systemPrompt, apiKey);

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      return (response.content || [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
    }

    if (response.stop_reason === "tool_use") {
      const toolBlocks = (response.content || []).filter((b: any) => b.type === "tool_use");
      if (!toolBlocks.length) {
        return (response.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      }

      const results = await Promise.all(
        toolBlocks.map(async (block: any) => {
          const result = await executeTool(block.name, block.input, client, userId, colaboradorId);
          return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) };
        }),
      );

      currentMessages.push({ role: "assistant", content: response.content });
      currentMessages.push({ role: "user", content: results });
    }
  }

  return "A operação ficou complexa. Tente dividir em etapas menores.";
}

function streamText(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunkSize = 8;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// ── Main ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Backend keys not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const { messages, colaboradorId } = await req.json();

    // Admin client for operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user ID from auth if possible
    let userId = "";
    if (authHeader) {
      const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
      if (SUPABASE_ANON_KEY) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser();
        userId = data?.user?.id || "";
      }
    }

    // Build context: list current cards summary + clients + collaborators
    const [cardsRes, clientesRes, colabsRes] = await Promise.all([
      adminClient.from("crm_cards").select("id, titulo, tipo, status, prazo, contato_nome, clientes(nome)").order("updated_at", { ascending: false }).limit(50),
      adminClient.from("clientes").select("id, nome").order("nome").limit(100),
      adminClient.from("colaboradores").select("id, nome").eq("ativo", true).order("nome").limit(50),
    ]);

    const cardsCtx = (cardsRes.data || []).map((c: any) =>
      `- "${c.titulo}" | ${c.tipo} | ${c.status} | cliente: ${c.clientes?.nome || "—"} | contato: ${c.contato_nome || "—"} | prazo: ${c.prazo || "—"} [id:${c.id}]`
    ).join("\n");

    const clientesCtx = (clientesRes.data || []).map((c: any) => `${c.nome} [id:${c.id}]`).join(", ");
    const colabsCtx = (colabsRes.data || []).map((c: any) => `${c.nome} [id:${c.id}]`).join(", ");

    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const dataHoje = agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const dataISO = agora.toISOString().split("T")[0];

    const systemPrompt = `Hoje é ${dataHora} (${dataISO}). Fuso: América/São Paulo.

Você é a Flora, assistente de CRM da MFM Paisagismo. Você gerencia o pipeline comercial através de linguagem natural.

## SUA FUNÇÃO
Você recebe relatos falados ou escritos sobre clientes e executa as ações necessárias no CRM automaticamente: mover cards, registrar observações, agendar follow-ups, criar tarefas na agenda.

## REGRAS
1. NUNCA peça para o usuário fazer algo manualmente — VOCÊ faz usando as ferramentas.
2. Quando o usuário ditar um relato sobre um cliente, identifique o card correto e execute TODAS as ações necessárias de uma vez.
3. Se o usuário mencionar "ligar daqui X dias" ou "retornar semana que vem", crie um follow-up automaticamente.
4. Se mencionar uma tarefa ou algo que precisa fazer, crie na agenda automaticamente.
5. SEMPRE adicione observações ao histórico quando houver informação relevante.
6. Use português brasileiro, tom direto e profissional.
7. Nunca mencione "ferramenta", "tool", "sistema", "banco de dados".
8. Confirme brevemente o que foi feito após executar.

## PIPELINE DO CRM
Lead → Proposta Enviada → Aprovado → Em Execução → Concluído → Pós-venda
(Ou: Não Aprovado — quando proposta é recusada)

## EXEMPLOS DE INTERAÇÃO
- "Liguei pro João da Silva, ele pediu pra mandar a proposta" → Buscar card do João, mover para "Proposta Enviada", adicionar observação, agendar follow-up.
- "A Maria aprovou o orçamento da piscina" → Buscar card da Maria, mover para "Aprovado", registrar.
- "Preciso ligar pro Carlos semana que vem" → Encontrar card, criar follow-up, criar tarefa na agenda.
- "Cria um card novo pro Pedro, quer orçamento de jardim" → Criar card tipo "Proposta".

## CARDS ATUAIS NO CRM
${cardsCtx || "Nenhum card encontrado."}

## CLIENTES CADASTRADOS
${clientesCtx || "Nenhum"}

## COLABORADORES
${colabsCtx || "Nenhum"}

## COLABORADOR ATUAL
${colaboradorId ? `ID: ${colaboradorId}` : "Não identificado"}`;

    const claudeMessages = (messages || []).map((m: any) => ({ role: m.role, content: m.content }));

    const finalText = await orchestrate(
      claudeMessages,
      systemPrompt,
      ANTHROPIC_API_KEY,
      adminClient,
      userId,
      colaboradorId || null,
    );

    const stream = streamText(finalText);
    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("crm-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
