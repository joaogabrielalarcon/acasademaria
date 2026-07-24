import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Funil canônico do Negócio (rótulos amigáveis; valores persistidos no banco)
export const FUNIL_STATUS: Array<{ value: string; label: string; tone: "muted" | "navy" | "primary" | "ok" | "danger" }> = [
  { value: "prospeccao", label: "Prospecção", tone: "muted" },
  { value: "qualificacao", label: "Qualificação", tone: "muted" },
  { value: "diagnostico", label: "Diagnóstico", tone: "navy" },
  { value: "proposta", label: "Proposta", tone: "navy" },
  { value: "negociacao", label: "Negociação", tone: "primary" },
  { value: "aprovado", label: "Aprovado", tone: "navy" },
  { value: "em_execucao", label: "Em execução", tone: "navy" },
  { value: "concluido", label: "Concluído", tone: "ok" },
  { value: "pos_venda", label: "Pós-venda", tone: "ok" },
  { value: "nao_aprovado", label: "Não aprovado", tone: "danger" },
];

export const funilLabel = (v?: string | null) =>
  FUNIL_STATUS.find((s) => s.value === v)?.label ?? (v ?? "");

// Tarefas (demandas) do projeto
export interface TarefaProjeto {
  id: string;
  titulo: string;
  prioridade: string | null;
  prazo_final: string | null;
  responsavel_atual_id: string | null;
  responsavel_nome?: string | null;
  status_saida: string | null;
  arquivada: boolean | null;
  notas: string | null;
}

export function useTarefasProjeto(projetoId?: string) {
  return useQuery({
    queryKey: ["painel-tarefas", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select("id, titulo, prioridade, prazo_final, responsavel_atual_id, status_saida, arquivada, notas")
        .eq("projeto_id", projetoId!)
        .order("prazo_final", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const rows = (data ?? []) as TarefaProjeto[];
      const ids = Array.from(new Set(rows.map((r) => r.responsavel_atual_id).filter(Boolean))) as string[];
      let nomes = new Map<string, string>();
      if (ids.length) {
        const { data: cols } = await supabase.from("colaboradores_basico").select("id, nome").in("id", ids);
        nomes = new Map((cols ?? []).map((c: any) => [c.id, c.nome]));
      }
      return rows.map((r) => ({ ...r, responsavel_nome: r.responsavel_atual_id ? nomes.get(r.responsavel_atual_id) : null }));
    },
  });
}

export function useCriarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { projeto_id: string; cliente_id: string; titulo: string; responsavel_atual_id: string; prazo_final?: string | null }) => {
      const { data, error } = await supabase.from("demandas").insert({
        projeto_id: payload.projeto_id,
        cliente_id: payload.cliente_id,
        titulo: payload.titulo,
        responsavel_atual_id: payload.responsavel_atual_id,
        prazo_final: payload.prazo_final || null,
        tipo: "tarefa",
        prioridade: "media",
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["painel-tarefas", v.projeto_id] }),
  });
}

// Feed do projeto
export interface FeedProjetoItem {
  id: string;
  cliente_id: string;
  tipo: string;
  titulo: string;
  dados: any;
  usuario_nome: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  created_at: string;
}

export function useFeedProjeto(projetoId?: string, clienteId?: string) {
  return useQuery({
    queryKey: ["painel-feed", projetoId],
    enabled: !!projetoId && !!clienteId,
    queryFn: async () => {
      // Eventos referenciando o projeto OU manuais registrados no painel via referencia_id=projeto
      const { data, error } = await supabase
        .from("cliente_feed_eventos")
        .select("*")
        .eq("cliente_id", clienteId!)
        .or(`referencia_id.eq.${projetoId},and(referencia_tipo.eq.projeto,referencia_id.eq.${projetoId})`)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as FeedProjetoItem[];
    },
  });
}

export function useRegistrarFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { projeto_id: string; cliente_id: string; tipo: string; titulo: string; dados?: any }) => {
      const { data: userData } = await supabase.auth.getUser();
      const usuario_nome = userData?.user?.email?.split("@")[0] ?? null;
      const { error } = await supabase.from("cliente_feed_eventos").insert({
        cliente_id: p.cliente_id,
        tipo: p.tipo,
        titulo: p.titulo,
        dados: p.dados ?? {},
        usuario_nome,
        referencia_id: p.projeto_id,
        referencia_tipo: "projeto",
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["painel-feed", v.projeto_id] }),
  });
}

export function usePropostasDoProjeto(projetoId?: string) {
  return useQuery({
    queryKey: ["painel-propostas", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("id, codigo, titulo, status, data_envio, valor")
        .eq("projeto_id", projetoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAtualizarProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, feed }: { id: string; patch: Record<string, any>; feed?: { cliente_id: string; titulo: string; dados?: any } }) => {
      const { error } = await supabase.from("projetos").update(patch).eq("id", id);
      if (error) throw error;
      if (feed) {
        const { data: userData } = await supabase.auth.getUser();
        const usuario_nome = userData?.user?.email?.split("@")[0] ?? null;
        await supabase.from("cliente_feed_eventos").insert({
          cliente_id: feed.cliente_id,
          tipo: "projeto_alteracao",
          titulo: feed.titulo,
          dados: feed.dados ?? {},
          usuario_nome,
          referencia_id: id,
          referencia_tipo: "projeto",
        });
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["projeto", v.id] });
      qc.invalidateQueries({ queryKey: ["painel-feed", v.id] });
    },
  });
}
