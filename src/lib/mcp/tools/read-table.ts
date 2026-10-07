import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";
import {
  acessoRestrito,
  colunaCortada,
  cortarLinhas,
  tabelaBloqueadaParaCampo,
  MSG_FORA_DO_ACESSO,
} from "./_validacao";

export default defineTool({
  name: "read_table",
  title: "Ler tabela",
  description:
    "Leitura genérica de qualquer tabela do schema public, respeitando as permissões (RLS) do usuário autenticado. Só retorna o que o usuário tem permissão para ver.",
  inputSchema: {
    tabela: z.string().trim().min(1).describe("Nome da tabela do schema public."),
    colunas: z
      .string()
      .trim()
      .optional()
      .describe("Lista de colunas separadas por vírgula (padrão '*')."),
    filtros: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Objeto campo→valor para igualdade estrita."),
    ordenar_por: z
      .string()
      .trim()
      .optional()
      .describe("Coluna para ordenar. Prefixe com '-' para descendente (ex.: '-created_at')."),
    limite: z.number().int().min(1).max(100).optional().describe("Padrão 25, máximo 100."),
    offset: z.number().int().min(0).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tabela, colunas, filtros, ordenar_por, limite, offset }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;

    const supabase = supabaseForUser(ctx);

    // Validate table name against the actual public schema list (no string interpolation).
    const { data: tabelas, error: eList } = await supabase.rpc("mcp_list_public_tables");
    if (eList) return { content: [{ type: "text", text: eList.message }], isError: true };
    const nomes = new Set(
      (tabelas as Array<{ tabela: string }> | null)?.map((t) => t.tabela) ?? [],
    );
    if (!nomes.has(tabela)) {
      return {
        content: [{ type: "text", text: `Tabela "${tabela}" não existe no schema public.` }],
        isError: true,
      };
    }

    // Corte por cargo: feito no servidor, antes de qualquer consulta.
    const restrito = await acessoRestrito(supabase, ctx.getUserId()!);
    if (restrito && tabelaBloqueadaParaCampo(tabela)) {
      return { content: [{ type: "text", text: MSG_FORA_DO_ACESSO }], isError: true };
    }
    if (restrito) {
      // Também não deixa filtrar/ordenar por coluna cortada (evita adivinhar o valor).
      const usadas = [
        ...Object.keys(filtros ?? {}),
        ...(ordenar_por ? [ordenar_por.replace(/^-/, "")] : []),
      ];
      if (usadas.some((c) => colunaCortada(tabela, c))) {
        return { content: [{ type: "text", text: MSG_FORA_DO_ACESSO }], isError: true };
      }
    }

    const lim = Math.min(limite ?? 25, 100);
    const off = offset ?? 0;

    // Stock money columns have no column grant: never ask for them directly.
    const ehEstoque = tabela === "estoque_movimentacoes";
    let colunasPedidas = colunas ?? (ehEstoque ? COLUNAS_ESTOQUE_LIVRES : "*");
    if (ehEstoque && colunas) {
      const lista = colunas.split(",").map((c) => c.trim()).filter(Boolean);
      const livres = lista.filter((c) => !COLUNAS_ESTOQUE_VALOR.includes(c));
      if (!livres.includes("id")) livres.unshift("id");
      colunasPedidas = livres.join(",");
    }
    if (ehEstoque && ordenar_por && COLUNAS_ESTOQUE_VALOR.includes(ordenar_por.replace(/^-/, ""))) {
      return { content: [{ type: "text", text: MSG_FORA_DO_ACESSO }], isError: true };
    }

    let q = supabase.from(tabela).select(colunasPedidas).range(off, off + lim - 1);

    if (filtros && typeof filtros === "object") {
      for (const [k, v] of Object.entries(filtros)) {
        q = v === null ? q.is(k, null) : q.eq(k, v as string | number | boolean);
      }
    }
    if (ordenar_por) {
      const desc = ordenar_por.startsWith("-");
      const col = desc ? ordenar_por.slice(1) : ordenar_por;
      q = q.order(col, { ascending: !desc });
    }

    const { data, error } = await q;
    if (error) {
      const msg = /permission denied|row-level security/i.test(error.message)
        ? `Acesso negado à tabela "${tabela}" para o usuário atual (RLS).`
        : error.message;
      return { content: [{ type: "text", text: msg }], isError: true };
    }

    let base = (data ?? []) as unknown as Record<string, unknown>[];

    // Management gets stock values through the role-checked function.
    if (ehEstoque && !restrito && base.length) {
      const { data: v } = await supabase.rpc("estoque_valores", {
        _ids: base.map((r) => r.id as string),
      });
      const mapa = new Map(
        ((v ?? []) as Array<{ id: string; preco_unitario: number | null; valor_total: number | null }>).map(
          (x) => [x.id, x],
        ),
      );
      base = base.map((r) => {
        const x = mapa.get(r.id as string);
        return { ...r, preco_unitario: x?.preco_unitario ?? null, valor_total: x?.valor_total ?? null };
      });
    }

    const linhas = restrito ? cortarLinhas(tabela, base) : base;

    return {
      content: [{ type: "text", text: JSON.stringify(linhas, null, 2) }],
      structuredContent: { tabela, count: linhas.length, linhas },
    };
  },
});

const COLUNAS_ESTOQUE_VALOR = ["preco_unitario", "valor_total"];
const COLUNAS_ESTOQUE_LIVRES =
  "id, item_id, item_tipo, tipo_movimento, quantidade, fornecedor_id, origem, referencia_id, observacoes, registrado_por_nome, created_at";
