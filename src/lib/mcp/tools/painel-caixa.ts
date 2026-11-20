import { defineTool } from "@lovable.dev/mcp-js";
import { panelOperation } from "../../../../supabase/functions/_shared/operations/caixa";
import { operationContext } from "../operation-context";
import { operationResult } from "../../../../supabase/functions/_shared/operations/contracts";
export default defineTool({ ...panelOperation, handler: async (input,ctx) => operationResult(await panelOperation.execute(input,operationContext(ctx))) });