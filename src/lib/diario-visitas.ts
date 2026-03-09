import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export type StatusArea = "otimo" | "bom" | "requer_atencao" | "critico";
export type PeriodoVisita = "dia_inteiro" | "manha" | "tarde" | "horario_especifico";
export type TipoMidia = "foto" | "video";

export interface DiarioVisitaRow {
  id: string;
  projeto_id: string;
  cliente_id: string;
  data_visita: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  periodo: PeriodoVisita | null;
  status_geral: StatusArea | null;
  observacoes_internas: string | null;
  registrado_por_nome: string | null;
  created_at: string;
}

export interface DiarioAreaRow {
  id: string;
  visita_id: string;
  projeto_id: string;
  nome_area: string;
  servicos: string[] | null;
  status_area: StatusArea | null;
  status_anterior: StatusArea | null;
  houve_melhora: boolean;
  relato: string | null;
  created_at: string;
}

export interface DiarioEquipeRow {
  id: string;
  area_id: string;
  visita_id: string;
  colaborador_id: string | null;
  colaborador_nome: string;
  funcao: string | null;
  descricao_atividade: string | null;
}

export interface DiarioInsumoRow {
  id: string;
  area_id: string;
  visita_id: string;
  insumo_id: string | null;
  insumo_nome: string;
  quantidade: string | null;
  unidade: string | null;
}

export interface DiarioMaquinaRow {
  id: string;
  area_id: string;
  visita_id: string;
  maquina_id: string | null;
  maquina_nome: string;
}

export interface DiarioMidiaRow {
  id: string;
  visita_id: string;
  area_id: string | null;
  tipo: TipoMidia | null;
  url: string;
  thumbnail_url: string | null;
  descricao: string | null;
}

export interface DiarioAreaDetalhe extends DiarioAreaRow {
  equipe: DiarioEquipeRow[];
  insumos: DiarioInsumoRow[];
  maquinas: DiarioMaquinaRow[];
  midias: DiarioMidiaRow[];
}

export interface DiarioVisitaDetalhe extends DiarioVisitaRow {
  areas: DiarioAreaDetalhe[];
  fotoCount: number;
  videoCount: number;
  areasResumo: string[];
  servicosResumo: string[];
  equipeResumo: string[];
  statusResumo: StatusArea | null;
}

export const periodLabels: Record<PeriodoVisita, string> = {
  dia_inteiro: "Dia inteiro",
  manha: "Manhã",
  tarde: "Tarde",
  horario_especifico: "Horário específico",
};

export const statusMeta: Record<StatusArea, { emoji: string; label: string; className: string }> = {
  otimo: { emoji: "🟢", label: "Ótimo", className: "diario-status-otimo" },
  bom: { emoji: "🟡", label: "Bom", className: "diario-status-bom" },
  requer_atencao: { emoji: "🟠", label: "Requer atenção", className: "diario-status-requer_atencao" },
  critico: { emoji: "🔴", label: "Crítico", className: "diario-status-critico" },
};

export const statusRank: Record<StatusArea, number> = {
  critico: 0,
  requer_atencao: 1,
  bom: 2,
  otimo: 3,
};

// Escala numérica 1-5 para qualidade
export type NotaQualidade = 1 | 2 | 3 | 4 | 5;

export const notaQualidadeMeta: Record<NotaQualidade, { label: string; className: string }> = {
  1: { label: "Crítico", className: "diario-nota-1" },
  2: { label: "Ruim", className: "diario-nota-2" },
  3: { label: "Regular", className: "diario-nota-3" },
  4: { label: "Bom", className: "diario-nota-4" },
  5: { label: "Ótimo", className: "diario-nota-5" },
};

// Converte status antigo para nota numérica (retrocompatibilidade)
export function statusToNota(status: StatusArea | null): NotaQualidade | null {
  if (!status) return null;
  const map: Record<StatusArea, NotaQualidade> = {
    critico: 1,
    requer_atencao: 2,
    bom: 4,
    otimo: 5,
  };
  return map[status];
}

export const DIARIO_STORAGE_BUCKET = "diario-midias";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export function formatDate(value: string) {
  return format(new Date(`${value}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
}

export function formatHour(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export function formatPeriodo(visita: Pick<DiarioVisitaRow, "periodo" | "hora_inicio" | "hora_fim">) {
  const periodoLabel = visita.periodo ? periodLabels[visita.periodo] : null;
  const hourRange = [formatHour(visita.hora_inicio), formatHour(visita.hora_fim)].filter(Boolean).join("–");

  if (periodoLabel && hourRange) return `${periodoLabel} ${hourRange}`;
  if (periodoLabel) return periodoLabel;
  if (hourRange) return hourRange;
  return "Horário não informado";
}

export function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function getTrend(area: DiarioAreaRow) {
  if (area.status_area && area.status_anterior) {
    const current = statusRank[area.status_area];
    const previous = statusRank[area.status_anterior];
    if (current > previous) return "up" as const;
    if (current < previous) return "down" as const;
  }

  if (area.houve_melhora) return "up" as const;
  return null;
}

export function getVisitStatus(visita: DiarioVisitaRow, areas: DiarioAreaRow[]) {
  if (visita.status_geral) return visita.status_geral;
  const statuses = areas.map((area) => area.status_area).filter(Boolean) as StatusArea[];
  if (!statuses.length) return null;
  return statuses.sort((a, b) => statusRank[a] - statusRank[b])[0];
}

export async function fetchDiarioVisitasDetalhes({
  projetoId,
  visitaIds,
}: {
  projetoId?: string;
  visitaIds?: string[];
}) {
  const filteredVisitIds = Array.from(new Set((visitaIds || []).filter(Boolean)));
  if (!projetoId && filteredVisitIds.length === 0) return [] as DiarioVisitaDetalhe[];

  let visitasQuery = supabase.from("diario_visitas" as never).select("*");

  if (projetoId) {
    visitasQuery = visitasQuery.eq("projeto_id", projetoId);
  }

  if (filteredVisitIds.length > 0) {
    visitasQuery = visitasQuery.in("id", filteredVisitIds);
  }

  const { data: visitasData, error: visitasError } = await visitasQuery.order("data_visita", { ascending: false });
  if (visitasError) throw visitasError;

  const visitasRows = ((visitasData as unknown as DiarioVisitaRow[]) ?? []);
  if (!visitasRows.length) return [] as DiarioVisitaDetalhe[];

  const ids = visitasRows.map((visita) => visita.id);

  const [areasResult, equipeResult, insumosResult, maquinasResult, midiasResult] = await Promise.all([
    supabase
      .from("diario_areas" as never)
      .select("*")
      .in("visita_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("diario_equipe_area" as never)
      .select("*")
      .in("visita_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("diario_insumos_area" as never)
      .select("*")
      .in("visita_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("diario_maquinas_area" as never)
      .select("*")
      .in("visita_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("diario_midia" as never)
      .select("*")
      .in("visita_id", ids)
      .order("created_at", { ascending: true }),
  ]);

  if (areasResult.error) throw areasResult.error;
  if (equipeResult.error) throw equipeResult.error;
  if (insumosResult.error) throw insumosResult.error;
  if (maquinasResult.error) throw maquinasResult.error;
  if (midiasResult.error) throw midiasResult.error;

  const areasRows = ((areasResult.data as unknown as DiarioAreaRow[]) ?? []);
  const equipeRows = ((equipeResult.data as unknown as DiarioEquipeRow[]) ?? []);
  const insumoRows = ((insumosResult.data as unknown as DiarioInsumoRow[]) ?? []);
  const maquinaRows = ((maquinasResult.data as unknown as DiarioMaquinaRow[]) ?? []);
  const midiaRows = ((midiasResult.data as unknown as DiarioMidiaRow[]) ?? []);

  const privatePaths = Array.from(
    new Set(
      midiaRows
        .flatMap((item) => [item.url, item.thumbnail_url])
        .filter((value): value is string => Boolean(value) && !isAbsoluteUrl(value)),
    ),
  );

  let signedMap = new Map<string, string>();
  if (privatePaths.length > 0) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(DIARIO_STORAGE_BUCKET)
      .createSignedUrls(privatePaths, 60 * 60);

    if (signedError) {
      console.error("Erro ao assinar mídias do diário:", signedError);
    } else {
      signedMap = new Map((signedData || []).map((item) => [item.path, item.signedUrl]));
    }
  }

  const resolvedMidiaRows = midiaRows.map((item) => ({
    ...item,
    url: isAbsoluteUrl(item.url) ? item.url : signedMap.get(item.url) || "",
    thumbnail_url: item.thumbnail_url
      ? isAbsoluteUrl(item.thumbnail_url)
        ? item.thumbnail_url
        : signedMap.get(item.thumbnail_url) || null
      : null,
  }));

  return visitasRows.map((visita) => {
    const areas = areasRows
      .filter((area) => area.visita_id === visita.id)
      .map((area) => ({
        ...area,
        equipe: equipeRows.filter((item) => item.area_id === area.id),
        insumos: insumoRows.filter((item) => item.area_id === area.id),
        maquinas: maquinaRows.filter((item) => item.area_id === area.id),
        midias: resolvedMidiaRows.filter((item) => item.area_id === area.id),
      }));

    const visitMidias = resolvedMidiaRows.filter((item) => item.visita_id === visita.id);

    return {
      ...visita,
      areas,
      fotoCount: visitMidias.filter((item) => item.tipo === "foto").length,
      videoCount: visitMidias.filter((item) => item.tipo === "video").length,
      areasResumo: uniqueValues(areas.map((area) => area.nome_area)),
      servicosResumo: uniqueValues(areas.flatMap((area) => area.servicos || [])),
      equipeResumo: uniqueValues(areas.flatMap((area) => area.equipe.map((item) => item.colaborador_nome))),
      statusResumo: getVisitStatus(visita, areas),
    } satisfies DiarioVisitaDetalhe;
  });
}
