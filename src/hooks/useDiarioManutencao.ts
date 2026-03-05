import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MAINTENANCE_PAGE_SIZE = 20;
const STORAGE_BUCKET = "registros-midia";
const SIGNED_URL_TTL = 60 * 60;

export type MaintenanceStatus = "rascunho" | "finalizado";
export type MaintenanceMood = "otimo" | "bom" | "atencao" | "critico";

export interface MaintenanceMedia {
  url: string;
  tipo: string;
  nome?: string;
  legenda?: string;
  previewUrl?: string;
}

export interface MaintenanceProject {
  id: string;
  titulo: string;
  cliente_id: string;
}

export interface MaintenanceCategory {
  id: string;
  nome: string;
  cor: string | null;
  slug: string;
}

export interface MaintenanceSupplyEntry {
  id?: string;
  registro_id?: string;
  insumo_id: string;
  quantidade: number;
  observacao?: string | null;
  nome?: string;
  unidade?: string | null;
}

export interface MaintenanceMachineEntry {
  id?: string;
  registro_id?: string;
  maquina_id: string;
  horas_utilizadas: number;
  observacao?: string | null;
  nome?: string;
}

export interface MaintenanceRecord {
  id: string;
  projeto_id: string;
  cliente_id: string;
  trecho_id: string | null;
  data_servico: string;
  hora_servico: string | null;
  equipe_presente_ids: string[];
  executores_ids: string[];
  descricao: string;
  observacoes_internas: string | null;
  humor_do_jardim: string | null;
  midia: MaintenanceMedia[];
  categorias_ids: string[];
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  projeto_titulo?: string;
  trecho_nome?: string | null;
  equipe_nomes?: string[];
  categoria_nomes?: string[];
  insumos?: MaintenanceSupplyEntry[];
  maquinas?: MaintenanceMachineEntry[];
}

export interface MaintenanceHistoryFilters {
  projectId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}

export interface SaveMaintenanceRecordInput {
  id?: string;
  projeto_id: string;
  cliente_id: string;
  trecho_id?: string | null;
  data_servico: string;
  hora_servico?: string | null;
  equipe_presente_ids: string[];
  descricao: string;
  observacoes_internas?: string | null;
  humor_do_jardim?: MaintenanceMood | null;
  midia: MaintenanceMedia[];
  categorias_ids: string[];
  status: MaintenanceStatus;
  insumos: MaintenanceSupplyEntry[];
  maquinas: MaintenanceMachineEntry[];
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const normalizeMaintenanceText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const slugifyMaintenanceLabel = (value: string) => normalizeMaintenanceText(value).replace(/\s+/g, "_");

async function signMaintenanceMedia(media: MaintenanceMedia[]) {
  const privatePaths = Array.from(new Set(media.map((item) => item.url).filter((url) => url && !isAbsoluteUrl(url))));

  if (privatePaths.length === 0) {
    return media.map((item) => ({ ...item, previewUrl: item.url }));
  }

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(privatePaths, SIGNED_URL_TTL);

  if (error) {
    console.error("Erro ao assinar mídias do diário:", error);
    return media.map((item) => ({ ...item, previewUrl: isAbsoluteUrl(item.url) ? item.url : "" }));
  }

  const signedMap = new Map((data || []).map((entry) => [entry.path, entry.signedUrl]));

  return media.map((item) => ({
    ...item,
    previewUrl: isAbsoluteUrl(item.url) ? item.url : signedMap.get(item.url) || "",
  }));
}

export function useMaintenanceProjects(scopeProjectId?: string) {
  return useQuery({
    queryKey: ["maintenance-projects", scopeProjectId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("projetos")
        .select("id, titulo, cliente_id")
        .eq("tipo", "manutencao")
        .order("titulo", { ascending: true });

      if (scopeProjectId) {
        query = query.eq("id", scopeProjectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaintenanceProject[];
    },
  });
}

export function useMaintenanceCategories() {
  return useQuery({
    queryKey: ["maintenance-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_servico")
        .select("id, nome, cor")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        slug: slugifyMaintenanceLabel(item.nome),
      })) as MaintenanceCategory[];
    },
  });
}

export function useMaintenanceHistory(filters: MaintenanceHistoryFilters) {
  const page = filters.page || 1;

  return useQuery({
    queryKey: ["maintenance-history", filters.projectId || "all", filters.status || "all", filters.startDate || "", filters.endDate || "", page],
    queryFn: async () => {
      let query = supabase
        .from("registros")
        .select(
          "id, projeto_id, cliente_id, trecho_id, data_servico, hora_servico, equipe_presente_ids, executores_ids, descricao, observacoes_internas, humor_do_jardim, midia, categorias_ids, status, created_by, created_at, updated_at",
          { count: "exact" }
        )
        .eq("tipo", "manutencao")
        .order("data_servico", { ascending: false })
        .order("created_at", { ascending: false })
        .range((page - 1) * MAINTENANCE_PAGE_SIZE, page * MAINTENANCE_PAGE_SIZE - 1);

      if (filters.projectId) query = query.eq("projeto_id", filters.projectId);
      if (filters.status && filters.status !== "todos") query = query.eq("status", filters.status);
      if (filters.startDate) query = query.gte("data_servico", filters.startDate);
      if (filters.endDate) query = query.lte("data_servico", filters.endDate);

      const { data, error, count } = await query;
      if (error) throw error;

      const rawRecords = (data || []) as any[];
      const recordIds = rawRecords.map((record) => record.id);

      const [projectsRes, trechosRes, colaboradoresRes, categoriasRes, insumosRes, maquinasRes, registroInsumosRes, registroMaquinasRes] = await Promise.all([
        supabase.from("projetos").select("id, titulo, cliente_id").eq("tipo", "manutencao"),
        supabase.from("trechos").select("id, nome"),
        supabase.from("colaboradores_basico").select("id, nome").eq("ativo", true),
        supabase.from("categorias_servico").select("id, nome").eq("ativo", true),
        supabase.from("insumos").select("id, nome, unidade").eq("ativo", true),
        supabase.from("maquinas").select("id, nome").eq("ativo", true),
        recordIds.length
          ? supabase.from("registro_insumos").select("id, registro_id, insumo_id, quantidade, observacao").in("registro_id", recordIds)
          : Promise.resolve({ data: [], error: null }),
        recordIds.length
          ? supabase.from("registro_maquinas").select("id, registro_id, maquina_id, horas_utilizadas, observacao").in("registro_id", recordIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (trechosRes.error) throw trechosRes.error;
      if (colaboradoresRes.error) throw colaboradoresRes.error;
      if (categoriasRes.error) throw categoriasRes.error;
      if (insumosRes.error) throw insumosRes.error;
      if (maquinasRes.error) throw maquinasRes.error;
      if (registroInsumosRes.error) throw registroInsumosRes.error;
      if (registroMaquinasRes.error) throw registroMaquinasRes.error;

      const projectMap = new Map((projectsRes.data || []).map((item) => [item.id, item.titulo]));
      const trechoMap = new Map((trechosRes.data || []).map((item) => [item.id, item.nome]));
      const colaboradorMap = new Map((colaboradoresRes.data || []).map((item) => [item.id, item.nome]));
      const categoriaMap = new Map((categoriasRes.data || []).map((item) => [item.id, item.nome]));
      const insumoMap = new Map((insumosRes.data || []).map((item) => [item.id, item]));
      const maquinaMap = new Map((maquinasRes.data || []).map((item) => [item.id, item.nome]));

      const insumosByRecord = new Map<string, MaintenanceSupplyEntry[]>();
      for (const item of (registroInsumosRes.data || []) as any[]) {
        const entry: MaintenanceSupplyEntry = {
          id: item.id,
          registro_id: item.registro_id,
          insumo_id: item.insumo_id,
          quantidade: Number(item.quantidade || 0),
          observacao: item.observacao,
          nome: insumoMap.get(item.insumo_id)?.nome,
          unidade: insumoMap.get(item.insumo_id)?.unidade || null,
        };
        const current = insumosByRecord.get(item.registro_id) || [];
        current.push(entry);
        insumosByRecord.set(item.registro_id, current);
      }

      const maquinasByRecord = new Map<string, MaintenanceMachineEntry[]>();
      for (const item of (registroMaquinasRes.data || []) as any[]) {
        const entry: MaintenanceMachineEntry = {
          id: item.id,
          registro_id: item.registro_id,
          maquina_id: item.maquina_id,
          horas_utilizadas: Number(item.horas_utilizadas || 0),
          observacao: item.observacao,
          nome: maquinaMap.get(item.maquina_id),
        };
        const current = maquinasByRecord.get(item.registro_id) || [];
        current.push(entry);
        maquinasByRecord.set(item.registro_id, current);
      }

      const uniqueMedia = rawRecords.flatMap((record) => (Array.isArray(record.midia) ? (record.midia as MaintenanceMedia[]) : []));
      const signedMedia = await signMaintenanceMedia(uniqueMedia);
      let cursor = 0;

      const enriched = rawRecords.map((record) => {
        const mediaItems = Array.isArray(record.midia) ? (record.midia as MaintenanceMedia[]) : [];
        const signedSlice = signedMedia.slice(cursor, cursor + mediaItems.length);
        cursor += mediaItems.length;

        return {
          ...record,
          midia: signedSlice,
          projeto_titulo: projectMap.get(record.projeto_id),
          trecho_nome: record.trecho_id ? trechoMap.get(record.trecho_id) || null : null,
          equipe_nomes: (record.equipe_presente_ids || []).map((id: string) => colaboradorMap.get(id)).filter(Boolean) as string[],
          categoria_nomes: (record.categorias_ids || []).map((id: string) => categoriaMap.get(id)).filter(Boolean) as string[],
          insumos: insumosByRecord.get(record.id) || [],
          maquinas: maquinasByRecord.get(record.id) || [],
        } as MaintenanceRecord;
      });

      return {
        records: enriched,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / MAINTENANCE_PAGE_SIZE)),
      };
    },
  });
}

export function useSaveMaintenanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveMaintenanceRecordInput) => {
      const payload = {
        projeto_id: input.projeto_id,
        cliente_id: input.cliente_id,
        trecho_id: input.trecho_id || null,
        data_servico: input.data_servico,
        hora_servico: input.hora_servico || null,
        tipo: "manutencao",
        equipe_presente_ids: input.equipe_presente_ids,
        executores_ids: input.equipe_presente_ids,
        descricao: input.descricao,
        observacoes_internas: input.observacoes_internas || null,
        humor_do_jardim: input.humor_do_jardim || null,
        midia: input.midia.map((item) => ({
          url: item.url,
          tipo: item.tipo,
          nome: item.nome || "",
          legenda: item.legenda || "",
        })),
        categorias_ids: input.categorias_ids,
        status: input.status,
      };

      let recordId = input.id;

      if (input.id) {
        const { error } = await supabase.from("registros").update(payload).eq("id", input.id);
        if (error) throw error;

        const [deleteInsumos, deleteMaquinas] = await Promise.all([
          supabase.from("registro_insumos").delete().eq("registro_id", input.id),
          supabase.from("registro_maquinas").delete().eq("registro_id", input.id),
        ]);

        if (deleteInsumos.error) throw deleteInsumos.error;
        if (deleteMaquinas.error) throw deleteMaquinas.error;
      } else {
        const { data, error } = await supabase.from("registros").insert(payload).select("id").single();
        if (error) throw error;
        recordId = data.id;
      }

      if (!recordId) {
        throw new Error("Não foi possível identificar o registro salvo.");
      }

      if (input.insumos.length > 0) {
        const { error } = await supabase.from("registro_insumos").insert(
          input.insumos.map((item) => ({
            registro_id: recordId,
            insumo_id: item.insumo_id,
            quantidade: item.quantidade,
            observacao: item.observacao || null,
          }))
        );

        if (error) throw error;
      }

      if (input.maquinas.length > 0) {
        const { error } = await supabase.from("registro_maquinas").insert(
          input.maquinas.map((item) => ({
            registro_id: recordId,
            maquina_id: item.maquina_id,
            horas_utilizadas: item.horas_utilizadas,
            observacao: item.observacao || null,
          }))
        );

        if (error) throw error;
      }

      return recordId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
      queryClient.invalidateQueries({ queryKey: ["registros-projeto"] });
      queryClient.invalidateQueries({ queryKey: ["registros"] });
    },
  });
}

export function useDeleteMaintenanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const [deleteInsumos, deleteMaquinas] = await Promise.all([
        supabase.from("registro_insumos").delete().eq("registro_id", recordId),
        supabase.from("registro_maquinas").delete().eq("registro_id", recordId),
      ]);

      if (deleteInsumos.error) throw deleteInsumos.error;
      if (deleteMaquinas.error) throw deleteMaquinas.error;

      const { error } = await supabase.from("registros").delete().eq("id", recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-history"] });
      queryClient.invalidateQueries({ queryKey: ["registros-projeto"] });
      queryClient.invalidateQueries({ queryKey: ["registros"] });
    },
  });
}
