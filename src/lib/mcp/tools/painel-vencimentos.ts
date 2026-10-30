import { defineTool } from "@lovable.dev/mcp-js";
import { operation } from "../../../../supabase/functions/_shared/operations/painel-vencimentos";
import { operationResult } from "../../../../supabase/functions/_shared/operations/contracts";
import { operationContext } from "../operation-context";

export default defineTool({
  name: operation.name, title: operation.title, description: operation.description,
  inputSchema: operation.inputSchema, annotations: operation.annotations,
  handler: async (input, context) => operationResult(await operation.execute(input, operationContext(context))),
});