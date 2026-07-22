import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";

export default defineTool({
  name: "list_storage",
  title: "Listar Storage",
  description:
    "Lista buckets ou arquivos do Storage. Sem parâmetro, devolve buckets (nome, público/privado). Com 'bucket' (e 'prefixo' opcional), lista arquivos (nome, tamanho, criado em), máximo 100. Não devolve conteúdo nem URLs assinadas.",
  inputSchema: {
    bucket: z.string().trim().optional().describe("Nome do bucket."),
    prefixo: z.string().trim().optional().describe("Prefixo (pasta) dentro do bucket."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bucket, prefixo }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);

    if (!bucket) {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      const buckets = (data ?? []).map((b) => ({
        nome: b.name,
        publico: b.public,
        criado_em: b.created_at,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(buckets, null, 2) }],
        structuredContent: { buckets },
      };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefixo ?? "", { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const arquivos = (data ?? []).map((f) => ({
      nome: f.name,
      tamanho: f.metadata?.size ?? null,
      mimetype: f.metadata?.mimetype ?? null,
      criado_em: f.created_at,
      atualizado_em: f.updated_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(arquivos, null, 2) }],
      structuredContent: { bucket, prefixo: prefixo ?? "", count: arquivos.length, arquivos },
    };
  },
});
