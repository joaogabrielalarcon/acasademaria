import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, requireAuth } from "../_supabase";
import {
  CAMPOS_TEXTO_ACUMULAVEL,
  TEM_AUTORIA,
  acrescentarTexto,
  nomeDoUsuario,
  normalizarValor,
  registrarMudancaStatus,
  validarStatusRegistroComTipo,
  PRIORIDADES,
  SOLICITANTES,
  AREAS_FUNCIONAIS,
  STATUS_POR_TABELA,

} from "./_validacao";

const TABELAS = [
  "clientes",
  "locais_cliente",
  "colaboradores",
  "maquinas",
  "insumos",
  "insumo_unidades",
  "plantas",
  "fornecedores",
  "fornecedor_atendentes",
  "estoque_movimentacoes",
  "projetos",
  "registros",
  "diarias",
  "escala_alocacoes",
  "registro_insumos",
  "registro_maquinas",
] as const;
type Tabela = (typeof TABELAS)[number];

/** Tabelas com atualização restrita: só estes campos podem ser corrigidos. */
const CAMPOS_UPDATE: Partial<Record<Tabela, string[]>> = {
  projetos: [
    "tipo",
    "status",
    "substatus",
    "observacoes",
    "titulo",

    "responsavel_id",
    "data_inicio",
    "data_fim",
    "data_previsao",
    "data_conclusao",
    "valor_mensal",
    "dia_vencimento",
    "local_id",
    "lider_responsavel_id",
    "escala_periodicidade",
    "escala_dias_semana",
    "escala_duracao_dias",
    "escala_equipe_qtd",
  ],
  registros: [
    "status",
    "descricao",
    "observacoes_internas",
    "prioridade",
    "data_alerta",
    "status_solicitacao",
    "tags",
    "midia",
    "trecho_id",
    "area_funcional",
    "equipe_presente_ids",
    "executores_ids",
    "solicitante",
  ],
  diarias: [
    "status",
    "comentarios_jardim",
    "observacoes_internas",
    "equipe_presente_ids",
    "periodo",
    "data_alerta",
    "trecho_id",
  ],
  escala_alocacoes: ["status", "lider_id", "observacoes", "diaria_id"],
  registro_insumos: ["quantidade", "observacao"],
  registro_maquinas: ["horas_utilizadas", "observacao"],
};

/** Campos explicitamente bloqueados, com o motivo em português. */
const CAMPOS_BLOQUEADOS: Partial<Record<Tabela, Record<string, string>>> = {
  registros: {
    cliente_id:
      "mover um registro de casa por engano é pior que apagar e refazer. Crie um novo registro na casa certa e cancele este.",
    local_id:
      "mover um registro de local por engano é pior que apagar e refazer. Crie um novo registro no local certo e cancele este.",
    projeto_id:
      "mover um registro de projeto por engano é pior que apagar e refazer. Crie um novo registro no projeto certo e cancele este.",
  },
};

export default defineTool({
  name: "atualizar_registro",
  title: "Atualizar registro por id",
  description:
    "Atualiza UMA linha por id em tabelas de cadastro e da operação de campo (whitelist), com campos restritos por tabela. " +
    "Use modo='acrescentar' para somar texto ao que já existe (separado por ' | ') em vez de sobrescrever. " +
    "Toda mudança de status é gravada em audit_status_changes com metadata padronizado (motivo, quem_executou, observacao). " +
    "Escreve com o token do usuário (RLS ativa). Retorna antes → depois.",
  inputSchema: {
    tabela: z.enum(TABELAS).describe("Tabela alvo. Aceita: " + TABELAS.join(", ")),
    id: z.string().uuid().describe("UUID da linha."),
    campos: z
      .record(z.string(), z.unknown())
      .describe("Campos a atualizar (objeto). Não passe id."),
    modo: z
      .enum(["substituir", "acrescentar"])
      .optional()
      .describe(
        "substituir (padrão) troca o valor. acrescentar soma o texto novo ao existente, separado por ' | ', nos campos de texto livre.",
      ),
    motivo: z
      .string()
      .optional()
      .describe("Por que o status mudou (vai para o histórico)."),
    quem_executou: z
      .string()
      .optional()
      .describe("Quem de fato executou (vai para o histórico)."),
    observacao: z
      .string()
      .optional()
      .describe("Observação livre sobre a mudança (vai para o histórico)."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (
    { tabela, id, campos, modo, motivo, quem_executou, observacao },
    ctx,
  ) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    const tbl = tabela as Tabela;
    const acrescentar = modo === "acrescentar";
    const entries = Object.entries(campos as Record<string, unknown>).filter(
      ([k]) => k !== "id" && k !== "created_by" && k !== "updated_by",
    );
    if (entries.length === 0) {
      return {
        content: [{ type: "text", text: "Nenhum campo para atualizar." }],
        isError: true,
      };
    }

    // Campos bloqueados com motivo
    const bloqueados = CAMPOS_BLOQUEADOS[tbl];
    if (bloqueados) {
      const batidos = entries.filter(([k]) => bloqueados[k]);
      if (batidos.length) {
        return {
          content: [
            {
              type: "text",
              text: batidos
                .map(([k]) => `Não é permitido alterar '${k}' em ${tbl}: ${bloqueados[k]}`)
                .join(" "),
            },
          ],
          isError: true,
        };
      }
    }

    // Whitelist de campos por tabela
    const permitidos = CAMPOS_UPDATE[tbl];
    if (permitidos) {
      const invalidos = entries.filter(([k]) => !permitidos.includes(k)).map(([k]) => k);
      if (invalidos.length) {
        return {
          content: [
            {
              type: "text",
              text: `Em '${tbl}' só é permitido atualizar: ${permitidos.join(", ")}. Rejeitados: ${invalidos.join(", ")}.`,
            },
          ],
          isError: true,
        };
      }
    }

    const colunasSet = new Set(entries.map(([k]) => k));
    if (tbl === "registros") colunasSet.add("tipo");
    if (colunasSet.has("status") === false) {
      // nada
    } else {
      colunasSet.add("status");
    }
    const colunas = Array.from(colunasSet).join(",");

    const { data: antes, error: eAntes } = await supabase
      .from(tbl)
      .select(`id,${colunas}`)
      .eq("id", id)
      .maybeSingle();
    if (eAntes) {
      return { content: [{ type: "text", text: eAntes.message }], isError: true };
    }
    if (!antes) {
      return {
        content: [
          {
            type: "text",
            text: `Registro ${id} não encontrado em ${tbl} (ou sem permissão de leitura).`,
          },
        ],
        isError: true,
      };
    }
    const antesObj = antes as unknown as Record<string, unknown>;

    // Normalização e validação de valores de lista
    const patch: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      let valor = v;

      if (k === "status" && STATUS_POR_TABELA[tbl]) {
        const r = validarStatusRegistroComTipo(v, antesObj.tipo, tbl);
        if ("erro" in r) {
          return { content: [{ type: "text", text: r.erro }], isError: true };
        }
        valor = r.status;
      } else if (tbl === "projetos" && k === "substatus") {
        const n = normalizarValor(v);
        if (n && !(SUBSTATUS_PROJETO as readonly string[]).includes(n)) {
          return {
            content: [
              {
                type: "text",
                text: `substatus '${v}' não existe. Use: ${SUBSTATUS_PROJETO.join(", ")}.`,
              },
            ],
            isError: true,
          };
        }
        valor = n || null;
      } else if (tbl === "registros" && k === "prioridade") {


        const n = normalizarValor(v);
        if (!(PRIORIDADES as readonly string[]).includes(n)) {
          return {
            content: [
              {
                type: "text",
                text: `prioridade '${v}' não existe. Use: ${PRIORIDADES.join(", ")}.`,
              },
            ],
            isError: true,
          };
        }
        valor = n;
      } else if (tbl === "registros" && k === "solicitante") {
        const n = normalizarValor(v);
        if (!(SOLICITANTES as readonly string[]).includes(n)) {
          return {
            content: [
              {
                type: "text",
                text: `solicitante '${v}' não existe. Use: ${SOLICITANTES.join(", ")}.`,
              },
            ],
            isError: true,
          };
        }
        valor = n;
      } else if (tbl === "registros" && k === "area_funcional") {
        const n = normalizarValor(v);
        if (!(AREAS_FUNCIONAIS as readonly string[]).includes(n)) {
          return {
            content: [
              {
                type: "text",
                text: `area_funcional '${v}' não existe. Use: ${AREAS_FUNCIONAIS.join(", ")}.`,
              },
            ],
            isError: true,
          };
        }
        valor = n;
      }

      // Modo acrescentar em campo de texto livre
      if (acrescentar && CAMPOS_TEXTO_ACUMULAVEL.has(k) && typeof valor === "string") {
        valor = acrescentarTexto(antesObj[k], valor);
      }

      patch[k] = valor;
    }

    // Autoria
    if (TEM_AUTORIA.has(tbl)) {
      patch.updated_by = userId;
    }

    const { data: depois, error } = await supabase
      .from(tbl)
      .update(patch as never)
      .eq("id", id)
      .select(`id,${colunas}`)
      .maybeSingle();

    if (error) {
      const msg = /permission denied|row-level security/i.test(error.message)
        ? `acesso negado por RLS: ${error.message}`
        : error.message;
      return { content: [{ type: "text", text: msg }], isError: true };
    }

    const depoisObj = (depois ?? {}) as unknown as Record<string, unknown>;
    const diff: Record<string, { antes: unknown; depois: unknown }> = {};
    for (const [k] of entries) {
      const a = antesObj[k];
      const d = depoisObj[k];
      if (JSON.stringify(a) !== JSON.stringify(d)) {
        diff[k] = { antes: a, depois: d };
      }
    }

    // Histórico de status: grava sempre que o status mudar, com ou sem motivo.
    const avisos: string[] = [];
    if (diff.status) {
      const nome = await nomeDoUsuario(supabase, userId, ctx.getUserEmail?.());
      const res = await registrarMudancaStatus(supabase, {
        entityTable: tbl,
        entityId: id,
        statusAnterior: diff.status.antes,
        statusNovo: diff.status.depois,
        changedBy: userId,
        changedByNome: nome,
        motivo,
        quemExecutou: quem_executou,
        observacao,
      });
      if (res.ok === false) avisos.push(res.aviso);
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Registro ${id} em ${tbl} atualizado (${Object.keys(diff).length} campo(s) alterado(s))` +
            (acrescentar ? ", modo acrescentar" : "") +
            "." +
            (avisos.length ? " " + avisos.join(" ") : ""),
        },
      ],
      structuredContent: {
        tabela: tbl,
        id,
        modo: acrescentar ? "acrescentar" : "substituir",
        alteracoes: diff,
        avisos,
      },
    };
  },
});
