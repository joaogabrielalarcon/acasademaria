export type MafeDiarioPhase = "collecting" | "awaiting_registration" | "ready_to_save";

export interface MafeDiarioTeamDraft {
  colaborador_id?: string | null;
  colaborador_nome: string;
  funcao?: string | null;
  descricao_atividade?: string | null;
}

export interface MafeDiarioSupplyDraft {
  insumo_id?: string | null;
  insumo_nome: string;
  quantidade?: string | null;
  unidade?: string | null;
}

export interface MafeDiarioMachineDraft {
  maquina_id?: string | null;
  maquina_nome: string;
}

export interface MafeDiarioMediaDraft {
  tipo: "foto" | "video";
  url: string;
  thumbnail_url?: string | null;
  descricao?: string | null;
}

export interface MafeDiarioAreaDraft {
  nome_area: string;
  servicos: string[];
  status_area?: "otimo" | "bom" | "requer_atencao" | "critico" | null;
  status_anterior?: "otimo" | "bom" | "requer_atencao" | "critico" | null;
  houve_melhora?: boolean;
  relato?: string | null;
  equipe: MafeDiarioTeamDraft[];
  insumos: MafeDiarioSupplyDraft[];
  maquinas: MafeDiarioMachineDraft[];
  midias: MafeDiarioMediaDraft[];
}

export interface MafeDiarioDraftPayload {
  projeto_id: string;
  cliente_id: string;
  data_visita: string;
  periodo?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  status_geral?: "otimo" | "bom" | "requer_atencao" | "critico" | null;
  observacoes_internas?: string | null;
  criar_alerta?: boolean;
  areas: MafeDiarioAreaDraft[];
  midias_gerais: MafeDiarioMediaDraft[];
}

export interface MafeDiarioHiddenState {
  phase: MafeDiarioPhase;
  ready_to_save: boolean;
  draft: MafeDiarioDraftPayload;
}

const HIDDEN_TAG = "draft_state";
const HIDDEN_BLOCK_REGEX = new RegExp(`<${HIDDEN_TAG}>([\\s\\S]*?)<\\/${HIDDEN_TAG}>`, "i");
const OPENING_TAG_REGEX = new RegExp(`<${HIDDEN_TAG}>[\\s\\S]*$`, "i");

export function createInitialMafeDiarioDraft(projetoId: string, clienteId: string): MafeDiarioHiddenState {
  return {
    phase: "collecting",
    ready_to_save: false,
    draft: {
      projeto_id: projetoId,
      cliente_id: clienteId,
      data_visita: new Date().toISOString().slice(0, 10),
      periodo: null,
      hora_inicio: null,
      hora_fim: null,
      status_geral: null,
      observacoes_internas: null,
      criar_alerta: false,
      areas: [],
      midias_gerais: [],
    },
  };
}

export function getVisibleMafeDiarioContent(rawContent: string) {
  if (!rawContent) return "";

  return rawContent
    .replace(HIDDEN_BLOCK_REGEX, "")
    .replace(OPENING_TAG_REGEX, "")
    .trim();
}

export function extractMafeDiarioHiddenState(rawContent: string): MafeDiarioHiddenState | null {
  const match = rawContent.match(HIDDEN_BLOCK_REGEX);
  if (!match?.[1]) return null;

  try {
    return JSON.parse(match[1]) as MafeDiarioHiddenState;
  } catch (error) {
    console.error("Erro ao interpretar estado oculto da Mafe:", error);
    return null;
  }
}
