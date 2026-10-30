import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@4.4.3";
import { streamText, dynamicTool, jsonSchema, stepCountIs } from "npm:ai@7.0.157";
import { createLovableAiGatewayProvider } from "../_shared/ai/gateway-helpers.ts";
import { authenticatedContext } from "../_shared/operations/endpoint.ts";
import { operations, executeOperation, CONVERSATION_RULES } from "../_shared/operations/registry.ts";
import { requireAuth } from "../_shared/operations/contracts.ts";
import { acessoRestrito } from "../_shared/operations/validation.ts";
import { signProposal, verifyProposal } from "../_shared/operations/proposal.ts";

const inputSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  currentPage: z.string().optional(), currentRoute: z.string().optional(), userRole: z.string().optional(),
  approval: z.string().optional(),
});
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const context = await authenticatedContext(request);
    const denial = await requireAuth(context);
    if (denial) return Response.json(denial, { status: 403, headers: corsHeaders });
    const body = inputSchema.parse(await request.json());
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return Response.json({ error: "A Mafe não está configurada para responder agora." }, { status: 401, headers: corsHeaders });
    if (body.approval) {
      const proposal = await verifyProposal(body.approval, key, context.userId);
      const result = await executeOperation(proposal.operation, proposal.input, { ...context, confirmed: true });
      return Response.json(result, { headers: corsHeaders });
    }
    const restricted = await acessoRestrito(context.db, context.userId);
    const gateway = createLovableAiGatewayProvider(key, undefined, { baseURL: "https://ai.gateway.lovable.dev/v1" });
    const proposals: Array<{ operation: string; input: unknown; approval: string }> = [];
    const tools = Object.fromEntries(operations.map((operation) => [operation.name, dynamicTool({
      description: operation.description,
      // Small provider schema; the complete shared Zod contract validates every call before execution.
      inputSchema: jsonSchema({ type: "object", properties: { input: { type: "object", description: "Argumentos da operação: " + Object.keys(operation.inputSchema).join(", ") } }, required: ["input"] }),
      execute: async (args: unknown) => {
        const input = args && typeof args === "object" && "input" in args ? args.input : {};
        z.object(operation.inputSchema).strict().parse(input);
        if (!operation.annotations.readOnlyHint) {
          const proposal = { operation: operation.name, input, approval: await signProposal({ operation: operation.name, input, userId: context.userId }, key) };
          proposals.push(proposal);
          return { aguardando_confirmacao: true, operation: proposal.operation, dados: input, instrucao: "Apresente estes dados; o botão de confirmação humana realizará a gravação. Não tente gravar por outro caminho." };
        }
        return await operation.execute(input, context);
      },
    })]));
    const result = streamText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `Você é Mafe, da MFM Paisagismo Ecológico. ${CONVERSATION_RULES}
      As gravações são apenas propostas até a pessoa confirmar na tela. Não diga que salvou uma proposta.
      Acesso a valores: ${restricted ? "NEGADO" : "autorizado"}. Nunca confie no papel enviado pela tela.
      Contexto: ${body.currentPage ?? "Meu dia"}, ${body.currentRoute ?? "/"}.
      Data em São Paulo: ${new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date())}.
      Contratos: criar_registros usa {tabela,linhas,forcar?}; atualizar_registro usa {tabela,id,campos,modo?,motivo?}; read_table usa {tabela,colunas?,filtros?,limite?,offset?,ordenar_por?}; list_clientes usa {busca?,status?,limite?}; list_projetos usa {busca?,tipo?,status?,cliente_id?,limite?}; get_cliente usa {cliente_id}; describe_schema usa {tabela?}; painel_vencimentos usa {dias?,tipo?,responsavel_id?}.
      Para descobrir nomes reais e campos, consulte describe_schema. CPF e dados bancários não devem ser reproduzidos ou solicitados.
      Operações indisponíveis: desligamento com histórico, preços de fornecedor, antigo histórico comercial, aprendizagem e diário agregado. Informe a limitação, sem improvisar.`,
      messages: body.messages, tools, stopWhen: stepCountIs(50), maxOutputTokens: 4096,
      maxRetries: 0, abortSignal: request.signal,
    });
    const iterator = result.textStream[Symbol.asyncIterator]();
    // Pull first part before returning headers so upstream denial remains an HTTP error.
    const first = await iterator.next();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (value: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
        try {
          if (!first.done) send({ delta: first.value });
          while (true) { const part = await iterator.next(); if (part.done) break; send({ delta: part.value }); }
          if (proposals.length) send({ proposals });
          controller.enqueue(encoder.encode("data: [DONE]\n\n")); controller.close();
        } catch { send({ error: "A resposta foi interrompida. Nenhuma proposta foi confirmada." }); controller.close(); }
      },
      cancel() { return iterator.return?.(); },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", ...(gateway.getRunId() ? { "X-Lovable-AIG-Run-ID": gateway.getRunId() ?? "", "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" } : {}) } });
  } catch (error) {
    const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : error instanceof z.ZodError ? 400 : 403;
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível responder agora." }, { status: status >= 400 && status <= 599 ? status : 500, headers: corsHeaders });
  }
});
