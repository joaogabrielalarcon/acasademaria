import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjetoPipeline {
  id: string;
  cliente_id: string;
  titulo: string;
  tipo: string;
  status: string;
  substatus: string | null;
  temperatura: string | null;
  responsavel_id: string | null;
  local_id: string | null;
  valor_total: number | null;
  data_prometida_cliente: string | null;
  data_alvo_interna: string | null;
  proximo_contato_em: string | null;
  data_retorno_prometida: string | null;
  created_at: string;
  updated_at: string;
  cliente_nome?: string | null;
  local_apelido?: string | null;
  responsavel_nome?: string | null;
  responsavel_foto?: string | null;
}

// Cada etapa tem cor própria da paleta MFM (argila → marinho → âmbar → terracota → sálvia → floresta)
// para dar salto visível de uma etapa para a outra.
export const PIPELINE_STATUSES: Array<{ value: string; label: string; color: string; soft: string }> = [
  { value: "prospeccao",   label: "Prospecção",            color: "var(--argila-400)",   soft: "var(--argila-100)" },
  { value: "qualificacao", label: "Qualificação",          color: "var(--argila-600)",   soft: "var(--argila-200)" },
  { value: "projeto",      label: "Projeto",               color: "var(--marinho-400)",  soft: "var(--marinho-100)" },
  { value: "orcamento",    label: "Orçamento",             color: "hsl(var(--warn))",    soft: "var(--terracota-100)" },
  { value: "proposta",     label: "Em negociação",         color: "var(--terracota-500)",soft: "var(--terracota-100)" },
  { value: "aprovado",     label: "Aprovado",              color: "var(--verde-500)",    soft: "var(--verde-100)" },
  { value: "em_execucao",  label: "Execução",              color: "var(--marinho-700)",  soft: "var(--marinho-100)" },
  { value: "concluido",    label: "Concluído / Pós-venda", color: "var(--verde-900)",    soft: "var(--verde-100)" },
];

// pos_venda foi fundido em concluido; arquivado some do funil.
export const PIPELINE_STATUS_VALUES = PIPELINE_STATUSES.map((s) => s.value);
const STATUS_ALIAS: Record<string, string> = { pos_venda: "concluido" };
export const normalizeStatus = (v?: string | null) => STATUS_ALIAS[v ?? ""] ?? (v ?? "prospeccao");

export function statusLabel(v?: string | null) {
  const n = normalizeStatus(v);
  return PIPELINE_STATUSES.find((s) => s.value === n)?.label ?? (v ?? "—");
}
export function statusColor(v?: string | null) {
  const n = normalizeStatus(v);
  return PIPELINE_STATUSES.find((s) => s.value === n)?.color ?? "hsl(var(--muted-foreground) / 0.4)";
}
export function statusSoft(v?: string | null) {
  const n = normalizeStatus(v);
  return PIPELINE_STATUSES.find((s) => s.value === n)?.soft ?? "hsl(var(--muted))";
}

export const TIPO_OPTIONS = [
  { value: "implantacao", label: "Implantação" },
  { value: "manutencao", label: "Manutenção" },
  { value: "obra", label: "Obra" },
  { value: "fornecimento", label: "Fornecimento" },
];

export const TEMPERATURA_OPTIONS = [
  { value: "quente", label: "Quente" },
  { value: "morno", label: "Morno" },
  { value: "frio", label: "Frio" },
];

export function tipoLabel(v?: string | null) {
  return TIPO_OPTIONS.find((o) => o.value === v)?.label ?? (v ?? "—");
}
export function temperaturaLabel(v?: string | null) {
  return TEMPERATURA_OPTIONS.find((o) => o.value === v)?.label ?? null;
}

export function useProjetosPipeline() {
  return useQuery({
    queryKey: ["projetos-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, cliente_id, titulo, tipo, status, substatus, temperatura, responsavel_id, local_id, valor_total, data_prometida_cliente, data_alvo_interna, proximo_contato_em, data_retorno_prometida, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ProjetoPipeline[];

      const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter(Boolean)));
      const localIds = Array.from(new Set(rows.map((r) => r.local_id).filter(Boolean))) as string[];
      const respIds = Array.from(new Set(rows.map((r) => r.responsavel_id).filter(Boolean))) as string[];

      const [clientesRes, locaisRes, colsRes] = await Promise.all([
        clienteIds.length ? supabase.from("clientes").select("id, nome").in("id", clienteIds) : Promise.resolve({ data: [] as any[] }),
        localIds.length ? supabase.from("locais_cliente").select("id, apelido").in("id", localIds) : Promise.resolve({ data: [] as any[] }),
        respIds.length ? supabase.from("colaboradores_basico").select("id, nome, foto_url").in("id", respIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const clientes = new Map((clientesRes.data ?? []).map((c: any) => [c.id, c.nome]));
      const locais = new Map((locaisRes.data ?? []).map((l: any) => [l.id, l.apelido]));
      const cols = new Map((colsRes.data ?? []).map((c: any) => [c.id, c]));

      return rows.map((r) => ({
        ...r,
        status: normalizeStatus(r.status), // funde pos_venda em concluido
        cliente_nome: clientes.get(r.cliente_id) ?? null,
        local_apelido: r.local_id ? locais.get(r.local_id) ?? null : null,
        responsavel_nome: r.responsavel_id ? cols.get(r.responsavel_id)?.nome ?? null : null,
        responsavel_foto: r.responsavel_id ? cols.get(r.responsavel_id)?.foto_url ?? null : null,
      })) as ProjetoPipeline[];
    },
    staleTime: 30_000,
  });
}

export function useMoverProjetoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, novo, anterior, cliente_id }: { id: string; novo: string; anterior?: string | null; cliente_id: string }) => {
      const { error } = await supabase.from("projetos").update({ status: novo }).eq("id", id);
      if (error) throw error;
      const { data: userData } = await supabase.auth.getUser();
      const usuario_nome = userData?.user?.email?.split("@")[0] ?? null;
      await supabase.from("cliente_feed_eventos").insert({
        cliente_id,
        tipo: "projeto_status",
        titulo: `Status alterado para ${statusLabel(novo)}`,
        dados: { de: anterior ?? null, para: novo },
        usuario_nome,
        referencia_id: id,
        referencia_tipo: "projeto",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projetos-pipeline"] }),
  });
}

export function useArquivarProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cliente_id, motivo }: { id: string; cliente_id: string; motivo?: string | null }) => {
      const { error } = await supabase.from("projetos").update({ status: "arquivado" }).eq("id", id);
      if (error) throw error;
      const { data: userData } = await supabase.auth.getUser();
      const usuario_nome = userData?.user?.email?.split("@")[0] ?? null;
      await supabase.from("cliente_feed_eventos").insert({
        cliente_id,
        tipo: "projeto_status",
        titulo: "Projeto arquivado",
        dados: { motivo: motivo ?? null, para: "arquivado" },
        usuario_nome,
        referencia_id: id,
        referencia_tipo: "projeto",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projetos-pipeline"] }),
  });
}

export interface CriarProjetoInput {
  cliente_id: string;
  titulo: string;
  tipo: string;
  local_id?: string | null;
  temperatura?: string | null;
  origem?: string | null;
  responsavel_id?: string | null;
}

export function useCriarProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CriarProjetoInput) => {
      const { data, error } = await supabase
        .from("projetos")
        .insert({
          cliente_id: payload.cliente_id,
          titulo: payload.titulo,
          tipo: payload.tipo,
          local_id: payload.local_id ?? null,
          temperatura: payload.temperatura ?? null,
          responsavel_id: payload.responsavel_id ?? null,
          status: "prospeccao",
          observacoes: payload.origem ? `Origem: ${payload.origem}` : null,
        })
        .select("id, cliente_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projetos-pipeline"] }),
  });
}

export function useCriarClienteRapido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, tipo_pessoa }: { nome: string; tipo_pessoa: "fisica" | "juridica" }) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({ nome, tipo_pessoa, status: "ativo" })
        .select("id, nome")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes-simples"] }),
  });
}
