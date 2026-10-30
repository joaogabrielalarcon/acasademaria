import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@4.4.3";
import { authenticatedContext } from "../_shared/operations/endpoint.ts";
import { executeOperation } from "../_shared/operations/registry.ts";
const schema = z.object({ operation: z.string(), input: z.unknown(), confirmed: z.boolean().optional() }).strict();
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const context = await authenticatedContext(request);
    const body = schema.parse(await request.json());
    const writes = ["criar_registros", "atualizar_registro"].includes(body.operation);
    if (writes && body.confirmed !== true) return Response.json({ error: "Confirme os dados antes de gravar." }, { status: 409, headers: corsHeaders });
    const result = await executeOperation(body.operation, body.input, { ...context, confirmed: body.confirmed });
    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível executar." }, { status: error instanceof z.ZodError ? 400 : 403, headers: corsHeaders });
  }
});