import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./_supabase";
import type { OperationContext } from "../../../supabase/functions/_shared/operations/contracts";

export function operationContext(context: ToolContext): OperationContext {
  return {
    db: supabaseForUser(context), userId: context.getUserId() ?? "", email: context.getUserEmail(),
    getUserId: () => context.getUserId() ?? "", getUserEmail: () => context.getUserEmail(),
    isAuthenticated: () => context.isAuthenticated(),
  };
}
