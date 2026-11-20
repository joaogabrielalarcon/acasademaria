import { defineTool } from "@lovable.dev/mcp-js";
import { writeOperation } from "../../../../supabase/functions/_shared/operations/caixa";
import { operationContext } from "../operation-context";
import { operationResult } from "../../../../supabase/functions/_shared/operations/contracts";
export default defineTool({ ...writeOperation, handler: async (input,ctx) => operationResult(await writeOperation.execute(input,operationContext(ctx))) });