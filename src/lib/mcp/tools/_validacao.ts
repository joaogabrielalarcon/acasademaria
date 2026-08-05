// Validação, normalização, idempotência e auditoria compartilhadas pelas tools
// de escrita do MCP. Tudo roda na edge function: nenhum enum, nenhum CHECK no banco.
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─────────── normalização ─────────── */

export function normalizarValor(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizarTexto(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* ─────────── listas de valores ─────────── */

export const TIPOS_REGISTRO = [
  "manutencao",
  "implantacao",
  "entrega",
  "visita_tecnica",
  "reuniao",
  "outro",
  "visita",
  "tarefa",
  "acompanhamento",
  "intercorrencia",
  "solicitacao",
  "observacao",
  "irrigacao",
] as const;

/**
 * Vocabulário real da operação (board "*Perfil Base" do Monday) + 4 estados
 * genéricos que já estavam em uso. Serve para registros.status e projetos.substatus.
 */
export const STATUS_REGISTRO = [
  // rotina da visita
  "programado",
  "realizado",
  "reportado",
  "validado",
  // análise e orçamento
  "solicitado",
  "a_quantificar",
  "quantificando",
  "a_orcar",
  "orcando",
  "aguardando_aprovacao",
  // preparação
  "planejar_execucao",
  "aguardando_material",
  "retirar_material",
  // execução
  "executando",
  "a_fazer",
  "em_andamento",
  "travado",
  // acompanhamento
  "pos_execucao",
  "em_observacao",
  "em_cuidado",
  "reaberto",
  // encerramento
  "concluido",
  "nao_aprovado",
  "cancelado",
] as const;

/**
 * MAPA DAS FASES (referência, ainda não implementado).
 * Régua única para comparar áreas diferentes da empresa:
 *
 *   solicitado                                         → Solicitado
 *   a_quantificar, quantificando, a_orcar, orcando     → Em análise
 *   aguardando_aprovacao                               → Aguardando decisão
 *   planejar_execucao, aguardando_material,
 *   retirar_material, programado, a_fazer              → A programar
 *   executando, em_andamento, travado, realizado,
 *   reportado, validado                                → Em execução
 *   pos_execucao, em_observacao, em_cuidado, reaberto  → Em acompanhamento
 *   concluido                                          → Encerrado
 *   nao_aprovado, cancelado                            → Encerrado sem entrega
 */


export const TIPOS_ESCALA = ["projeto", "mao_de_obra_extra"] as const;
export const STATUS_ESCALA = [
  "planejada",
  "confirmada",
  "realizada",
  "cancelada",
] as const;

/** Vocabulário próprio de projetos (funil comercial + entrega). */
export const TIPOS_PROJETO = [
  "implantacao",
  "obra",
  "manutencao",
  "fornecimento",
  "projeto",
  "mao_de_obra",
] as const;

export const STATUS_PROJETO = [
  "prospeccao",
  "qualificacao",
  "projeto",
  "orcamento",
  "proposta",
  "aprovado",
  "em_execucao",
  "concluido",
  "perdido",
  "cancelado",
] as const;

export const PRIORIDADES = ["alta", "normal", "baixa"] as const;
export const SOLICITANTES = ["equipe", "cliente", "caseiro", "contrato"] as const;
export const AREAS_FUNCIONAIS = [
  "campo",
  "projetos",
  "administrativo",
  "direcao",
] as const;

/** Valores aceitos por tabela. diarias não tem CHECK no banco: segue a lista de registros. */
export const TIPOS_POR_TABELA: Record<string, readonly string[]> = {
  registros: TIPOS_REGISTRO,
  escala_alocacoes: TIPOS_ESCALA,
  diarias: TIPOS_REGISTRO,
  projetos: TIPOS_PROJETO,
};

export const STATUS_POR_TABELA: Record<string, readonly string[]> = {
  registros: STATUS_REGISTRO,
  escala_alocacoes: STATUS_ESCALA,
  diarias: STATUS_REGISTRO,
  projetos: STATUS_PROJETO,
};

const STATUS_POR_TIPO: Record<string, readonly string[]> = {
  visita: ["programado", "realizado", "cancelado"],
  tarefa: ["a_fazer", "em_andamento", "travado", "concluido", "cancelado"],
  acompanhamento: ["em_observacao", "em_cuidado", "concluido", "reaberto"],
};

/**
 * Normaliza e valida os campos de lista de uma tabela da operação.
 * Devolve { erro } com mensagem em português ou { valores } já normalizados.
 */
export function validarValoresRegistro(
  campos: Record<string, unknown>,
  tabela = "registros",
): { erro: string } | { valores: Record<string, unknown> } {
  const out: Record<string, unknown> = { ...campos };

  const checar = (
    campo: string,
    permitidos: readonly string[] | undefined,
  ): string | null => {
    if (!permitidos) return null;
    if (campos[campo] === undefined || campos[campo] === null) return null;
    const v = normalizarValor(campos[campo]);
    if (!permitidos.includes(v)) {
      return `${campo} '${campos[campo]}' não vale para ${tabela}. Use: ${permitidos.join(", ")}.`;
    }
    out[campo] = v;
    return null;
  };

  const ehRegistros = tabela === "registros";

  const erros = [
    checar("tipo", TIPOS_POR_TABELA[tabela]),
    checar("status", STATUS_POR_TABELA[tabela]),
    ehRegistros ? checar("prioridade", PRIORIDADES) : null,
    ehRegistros ? checar("solicitante", SOLICITANTES) : null,
    ehRegistros ? checar("area_funcional", AREAS_FUNCIONAIS) : null,
  ].filter(Boolean) as string[];

  if (erros.length) return { erro: erros.join(" ") };

  if (ehRegistros) {
    const tipo = out.tipo as string | undefined;
    const status = out.status as string | undefined;
    if (tipo && status) {
      const permitidos = STATUS_POR_TIPO[tipo];
      if (permitidos && !permitidos.includes(status)) {
        return {
          erro: `status '${status}' não vale para tipo=${tipo}. Para tipo=${tipo} use: ${permitidos.join(", ")}.`,
        };
      }
    }
  }

  return { valores: out };
}

/**
 * Valida só o status contra o tipo já gravado (usado no update).
 */
export function validarStatusRegistroComTipo(
  statusBruto: unknown,
  tipoAtual: unknown,
  tabela = "registros",
): { erro: string } | { status: string } {
  const status = normalizarValor(statusBruto);
  const permitidosTabela = STATUS_POR_TABELA[tabela] ?? STATUS_REGISTRO;
  if (!permitidosTabela.includes(status)) {
    return {
      erro: `status '${statusBruto}' não vale para ${tabela}. Use: ${permitidosTabela.join(", ")}.`,
    };
  }
  if (tabela === "registros") {
    const tipo = normalizarValor(tipoAtual);
    const permitidos = STATUS_POR_TIPO[tipo];
    if (permitidos && !permitidos.includes(status)) {
      return {
        erro: `status '${status}' não vale para tipo=${tipo}. Para tipo=${tipo} use: ${permitidos.join(", ")}.`,
      };
    }
  }
  return { status };
}


/* ─────────── campos de texto acumuláveis ─────────── */

export const CAMPOS_TEXTO_ACUMULAVEL = new Set([
  "observacoes",
  "observacoes_internas",
  "descricao",
  "assessores",
  "funcionarios_casa",
  "comentarios_jardim",
  "ocorrencias",
]);

export function acrescentarTexto(atual: unknown, novo: unknown): string {
  const a = typeof atual === "string" ? atual.trim() : "";
  const b = String(novo ?? "").trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} | ${b}`;
}

/* ─────────── whitelist de campos ─────────── */

export function filtrarCampos(
  linha: Record<string, unknown>,
  permitidos: readonly string[],
  obrigatorios: readonly string[],
  tabela: string,
): { erro: string } | { payload: Record<string, unknown> } {
  const desconhecidos = Object.keys(linha).filter(
    (k) => !permitidos.includes(k),
  );
  if (desconhecidos.length) {
    return {
      erro: `Campo(s) não aceito(s) em '${tabela}': ${desconhecidos.join(", ")}. Aceitos: ${permitidos.join(", ")}.`,
    };
  }
  const faltando = obrigatorios.filter(
    (k) => linha[k] === undefined || linha[k] === null || linha[k] === "",
  );
  if (faltando.length) {
    return {
      erro: `Faltam campos obrigatórios em '${tabela}': ${faltando.join(", ")}.`,
    };
  }
  return { payload: { ...linha } };
}

/* ─────────── autoria ─────────── */

export const TEM_AUTORIA = new Set([
  "projetos",
  "registros",
  "diarias",
  "clientes",
  "colaboradores",
  "fornecedor_atendentes",
  "fornecedores",
  "insumo_unidades",
  "insumos",
  "maquinas",
  "plantas",
  "locais_cliente",
]);

export async function nomeDoUsuario(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<string> {
  try {
    const { data: col } = await supabase
      .from("colaboradores")
      .select("nome")
      .eq("user_id", userId)
      .maybeSingle();
    const nomeCol = (col as { nome?: string } | null)?.nome;
    if (nomeCol) return nomeCol;
  } catch {
    /* segue */
  }
  try {
    const { data: p } = await supabase
      .from("profiles")
      .select("nome,email")
      .eq("id", userId)
      .maybeSingle();
    const prof = p as { nome?: string; email?: string } | null;
    if (prof?.nome) return prof.nome;
    if (prof?.email) return prof.email;
  } catch {
    /* segue */
  }
  return email ?? userId;
}

/* ─────────── auditoria de status ─────────── */

export async function registrarMudancaStatus(
  supabase: SupabaseClient,
  params: {
    entityTable: string;
    entityId: string;
    statusAnterior: unknown;
    statusNovo: unknown;
    changedBy: string;
    changedByNome: string;
    motivo?: string | null;
    quemExecutou?: string | null;
    observacao?: string | null;
  },
): Promise<{ ok: true } | { ok: false; aviso: string }> {
  const { error } = await supabase.from("audit_status_changes").insert({
    entity_table: params.entityTable,
    entity_id: params.entityId,
    status_anterior:
      params.statusAnterior === null || params.statusAnterior === undefined
        ? null
        : String(params.statusAnterior),
    status_novo:
      params.statusNovo === null || params.statusNovo === undefined
        ? null
        : String(params.statusNovo),
    changed_by: params.changedBy,
    changed_by_nome: params.changedByNome,
    metadata: {
      motivo: params.motivo ?? "",
      quem_executou: params.quemExecutou ?? params.changedByNome,
      observacao: params.observacao ?? "",
    },
  } as never);

  if (error) {
    return {
      ok: false,
      aviso: `A alteração foi gravada, mas o histórico de status não pôde ser registrado (${error.message}). Avise a administração para liberar a escrita em audit_status_changes.`,
    };
  }
  return { ok: true };
}
