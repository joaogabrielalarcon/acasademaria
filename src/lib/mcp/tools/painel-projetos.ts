import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";
import { acessoRestrito } from "./_validacao";

type ProjetoRow = {
  id: string;
  titulo: string | null;
  tipo: string | null;
  status: string | null;
  substatus: string | null;
  temperatura: string | null;
  cliente_id: string | null;
  local_id: string | null;
  responsavel_id: string | null;
  lider_responsavel_id: string | null;
  proximo_contato_em: string | null;
  data_prometida_cliente: string | null;
  data_alvo_interna: string | null;
  valor_total: number | null;
  created_at: string;
};

const ORDENACOES = [
  "dias_no_status",
  "proximo_contato_em",
  "data_prometida_cliente",
  "data_alvo_interna",
  "demandas_abertas",
  "valor_total",
] as const;

const DIA_MS = 86_400_000;

function nomesPorId(rows: Array<{ id: string; nome: string | null }> | null): Map<string, string> {
  return new Map((rows ?? []).map((r) => [r.id, r.nome ?? ""]));
}

export default defineTool({
  name: "painel_projetos",
  title: "Painel de projetos",
  description:
    "Vista de acompanhamento da gestão: projetos não concluídos e não cancelados, com cliente, local, responsáveis, datas, " +
    "dias_no_status (desde a última mudança de status registrada, ou desde a criação) e demandas_abertas. " +
    "Para quem só tem o papel operador_campo, valor_total não é devolvido.",
  inputSchema: {
    tipo: z.string().optional(),
    status: z.string().optional(),
    cliente_id: z.string().uuid().optional(),
    responsavel_id: z.string().uuid().optional(),
    ordenar_por: z
      .enum(ORDENACOES)
      .optional()
      .describe("Padrão: dias_no_status (decrescente). Datas ordenam da mais próxima para a mais distante."),
    limite: z.number().int().min(1).max(200).optional().describe("Padrão 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tipo, status, cliente_id, responsavel_id, ordenar_por, limite }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    const restrito = await acessoRestrito(supabase, ctx.getUserId()!);

    let q = supabase
      .from("projetos")
      .select(
        "id,titulo,tipo,status,substatus,temperatura,cliente_id,local_id,responsavel_id,lider_responsavel_id,proximo_contato_em,data_prometida_cliente,data_alvo_interna,valor_total,created_at",
      )
      .not("status", "in", "(concluido,cancelado)")
      .limit(1000);
    if (tipo) q = q.eq("tipo", tipo);
    if (status) q = q.eq("status", status);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    if (responsavel_id) q = q.eq("responsavel_id", responsavel_id);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const projetos = (data ?? []) as unknown as ProjetoRow[];
    if (projetos.length === 0) {
      return {
        content: [{ type: "text", text: "Nenhum projeto em aberto com esses filtros." }],
        structuredContent: { count: 0, projetos: [] },
      };
    }

    const ids = projetos.map((p) => p.id);
    const uniq = (xs: Array<string | null>) => Array.from(new Set(xs.filter((x): x is string => Boolean(x))));
    const clienteIds = uniq(projetos.map((p) => p.cliente_id));
    const localIds = uniq(projetos.map((p) => p.local_id));
    const pessoaIds = uniq(projetos.flatMap((p) => [p.responsavel_id, p.lider_responsavel_id]));

    const [audit, dem, cli, loc, colab, prof] = await Promise.all([
      supabase
        .from("audit_status_changes")
        .select("entity_id,changed_at")
        .eq("entity_table", "projetos")
        .in("entity_id", ids)
        .order("changed_at", { ascending: false }),
      supabase
        .from("demandas")
        .select("projeto_id")
        .in("projeto_id", ids)
        .eq("arquivada", false)
        .is("status_saida", null),
      clienteIds.length
        ? supabase.from("clientes").select("id,nome").in("id", clienteIds)
        : Promise.resolve({ data: [] }),
      localIds.length
        ? supabase.from("locais_cliente").select("id,nome").in("id", localIds)
        : Promise.resolve({ data: [] }),
      pessoaIds.length
        ? supabase.from("colaboradores").select("id,nome,user_id").or(
            `id.in.(${pessoaIds.join(",")}),user_id.in.(${pessoaIds.join(",")})`,
          )
        : Promise.resolve({ data: [] }),
      pessoaIds.length
        ? supabase.from("profiles").select("id,nome").in("id", pessoaIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Última mudança de status por projeto (lista já vem em ordem decrescente).
    const ultimaMudanca = new Map<string, string>();
    for (const a of (audit.data ?? []) as Array<{ entity_id: string; changed_at: string }>) {
      if (!ultimaMudanca.has(a.entity_id)) ultimaMudanca.set(a.entity_id, a.changed_at);
    }
    const abertas = new Map<string, number>();
    for (const d of (dem.data ?? []) as Array<{ projeto_id: string }>) {
      abertas.set(d.projeto_id, (abertas.get(d.projeto_id) ?? 0) + 1);
    }

    const clientes = nomesPorId(cli.data as Array<{ id: string; nome: string | null }>);
    const locais = nomesPorId(loc.data as Array<{ id: string; nome: string | null }>);
    const pessoas = nomesPorId(prof.data as Array<{ id: string; nome: string | null }>);
    for (const c of (colab.data ?? []) as Array<{ id: string; nome: string | null; user_id: string | null }>) {
      pessoas.set(c.id, c.nome ?? "");
      if (c.user_id) pessoas.set(c.user_id, c.nome ?? "");
    }
    const nome = (id: string | null) => (id ? pessoas.get(id) ?? null : null);

    const agora = Date.now();
    const linhas = projetos.map((p) => {
      const desde = ultimaMudanca.get(p.id) ?? p.created_at;
      const linha: Record<string, unknown> = {
        id: p.id,
        cliente: p.cliente_id ? clientes.get(p.cliente_id) ?? null : null,
        local: p.local_id ? locais.get(p.local_id) ?? null : null,
        titulo: p.titulo,
        tipo: p.tipo,
        status: p.status,
        substatus: p.substatus,
        temperatura: p.temperatura,
        responsavel: nome(p.responsavel_id),
        lider_responsavel: nome(p.lider_responsavel_id),
        proximo_contato_em: p.proximo_contato_em,
        data_prometida_cliente: p.data_prometida_cliente,
        data_alvo_interna: p.data_alvo_interna,
        valor_total: p.valor_total,
        dias_no_status: Math.max(0, Math.floor((agora - new Date(desde).getTime()) / DIA_MS)),
        status_desde: desde,
        demandas_abertas: abertas.get(p.id) ?? 0,
      };
      if (restrito) delete linha.valor_total;
      return linha;
    });

    const chave = ordenar_por ?? "dias_no_status";
    const ordemAsc = chave === "proximo_contato_em" || chave === "data_prometida_cliente" || chave === "data_alvo_interna";
    const ordenavel = restrito && chave === "valor_total" ? "dias_no_status" : chave;
    linhas.sort((a, b) => {
      const va = a[ordenavel];
      const vb = b[ordenavel];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return ordemAsc ? cmp : -cmp;
    });

    const resultado = linhas.slice(0, limite ?? 50);
    return {
      content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }],
      structuredContent: { count: resultado.length, total_em_aberto: linhas.length, projetos: resultado },
    };
  },
});
