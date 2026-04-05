import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AgendaTarefa {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string | null;
  prioridade: "urgente" | "semana" | "mes";
  prazo: string | null;
  status: "pendente" | "em_andamento" | "concluida";
  created_at: string;
  updated_at: string;
  dependencias?: AgendaDependencia[];
}

export interface AgendaDependencia {
  id: string;
  tarefa_id: string;
  colaborador_id: string | null;
  descricao_entrega: string;
  tempo_estimado_dias: number;
  status_entrega: "pendente" | "entregue" | "atrasado";
  created_at: string;
}

export function useAgendaTarefas(colaboradorId: string | undefined) {
  return useQuery({
    queryKey: ["assessor_tarefas", colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];
      const { data, error } = await supabase
        .from("assessor_tarefas")
        .select("*")
        .eq("usuario_id", colaboradorId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch dependencies for each task
      const ids = (data || []).map((t: any) => t.id);
      let deps: any[] = [];
      if (ids.length > 0) {
        const { data: depsData } = await supabase
          .from("assessor_dependencias")
          .select("*")
          .in("tarefa_id", ids);
        deps = depsData || [];
      }

      return (data || []).map((t: any) => ({
        ...t,
        dependencias: deps.filter((d: any) => d.tarefa_id === t.id),
      })) as AgendaTarefa[];
    },
    enabled: !!colaboradorId,
  });
}

export function useSalvarTarefas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tarefas,
      colaboradorId,
    }: {
      tarefas: Array<{
        titulo: string;
        descricao?: string;
        prioridade: string;
        prazo?: string | null;
        dependencias?: Array<{
          nome_colaborador: string;
          descricao_entrega: string;
          tempo_estimado_dias: number;
        }>;
      }>;
      colaboradorId: string;
    }) => {
      // Fetch all colaboradores for name matching
      const { data: colaboradores } = await supabase
        .from("colaboradores")
        .select("id, nome")
        .eq("ativo", true);

      for (const tarefa of tarefas) {
        const { data: inserted, error } = await supabase
          .from("assessor_tarefas")
          .insert({
            usuario_id: colaboradorId,
            titulo: tarefa.titulo,
            descricao: tarefa.descricao || null,
            prioridade: tarefa.prioridade,
            prazo: tarefa.prazo || null,
          })
          .select("id")
          .single();

        if (error) throw error;

        if (tarefa.dependencias?.length) {
          for (const dep of tarefa.dependencias) {
            // Try to match colaborador by name
            const match = colaboradores?.find((c: any) =>
              c.nome.toLowerCase().includes(dep.nome_colaborador.toLowerCase())
            );

            await supabase.from("assessor_dependencias").insert({
              tarefa_id: inserted.id,
              colaborador_id: match?.id || null,
              descricao_entrega: dep.descricao_entrega,
              tempo_estimado_dias: dep.tempo_estimado_dias,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessor_tarefas"] });
      toast({ title: "Tarefas salvas com sucesso!", duration: 3000 });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar tarefas", description: e.message, variant: "destructive" });
    },
  });
}

export function useAtualizarStatusTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("assessor_tarefas")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessor_tarefas"] });
    },
  });
}

export function useExcluirTarefa() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessor_tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessor_tarefas"] });
      toast({ title: "Tarefa excluída", duration: 3000 });
    },
  });
}
