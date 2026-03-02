import { useRef } from "react";
import { Plus, Trash2, Users, Loader2, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MaoDeObraDescritivoProps {
  projetoId: string;
  isAdmin: boolean;
}

interface MaoDeObraItem {
  id: string;
  projeto_id: string;
  descricao: string;
  quantidade_funcionarios: number;
  dias_previstos: number;
  observacoes: string | null;
  ordem: number | null;
  created_at: string;
  updated_at: string;
}

export function MaoDeObraDescritivo({ projetoId, isAdmin }: MaoDeObraDescritivoProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["projeto-mao-de-obra", projetoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_mao_de_obra")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as MaoDeObraItem[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projeto_mao_de_obra").insert({
        projeto_id: projetoId,
        descricao: "Equipe de campo",
        quantidade_funcionarios: 1,
        dias_previstos: 1,
        ordem: itens.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projeto-mao-de-obra", projetoId] });
      toast({ title: "Item adicionado" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<MaoDeObraItem>) => {
      const { error } = await supabase
        .from("projeto_mao_de_obra")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projeto-mao-de-obra", projetoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projeto_mao_de_obra")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projeto-mao-de-obra", projetoId] });
      toast({ title: "Item removido" });
    },
  });

  const handleInlineUpdate = (id: string, field: string, value: string) => {
    const numVal = parseInt(value) || 1;
    updateMutation.mutate({ id, [field]: numVal });
  };

  const handleDescricaoUpdate = (id: string, value: string) => {
    updateMutation.mutate({ id, descricao: value });
  };

  const calcSemanas = (dias: number) => {
    const semanas = dias / 5;
    const semanasInteiras = Math.floor(semanas);
    const diasRestantes = dias % 5;
    if (diasRestantes === 0) return `${semanasInteiras} semana${semanasInteiras !== 1 ? "s" : ""}`;
    return `${semanasInteiras > 0 ? `${semanasInteiras} semana${semanasInteiras !== 1 ? "s" : ""} e ` : ""}${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""}`;
  };

  // Totais
  const totalDias = itens.reduce((s, i) => s + i.dias_previstos, 0);
  const totalHomemDia = itens.reduce((s, i) => s + i.quantidade_funcionarios * i.dias_previstos, 0);

  return (
    <section className="card-botanical p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <HardHat className="w-5 h-5 text-primary" />
          Descritivo de Mão de Obra
        </h3>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length > 0 ? (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-3 pb-1">
            <div className="col-span-4">Descrição</div>
            <div className="col-span-2 text-center">Funcionários</div>
            <div className="col-span-2 text-center">Dias</div>
            <div className="col-span-3 text-center">Semanas</div>
            <div className="col-span-1" />
          </div>

          {itens.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-muted/50">
              <div className="col-span-4">
                {isAdmin ? (
                  <Input
                    defaultValue={item.descricao}
                    onBlur={(e) => {
                      if (e.target.value !== item.descricao) handleDescricaoUpdate(item.id, e.target.value);
                    }}
                    className="h-8 text-sm border-transparent hover:border-primary/30 focus-visible:border-primary"
                  />
                ) : (
                  <span className="text-sm font-medium text-foreground">{item.descricao || "—"}</span>
                )}
              </div>
              <div className="col-span-2">
                {isAdmin ? (
                  <Input
                    type="number"
                    min={1}
                    defaultValue={item.quantidade_funcionarios}
                    onBlur={(e) => handleInlineUpdate(item.id, "quantidade_funcionarios", e.target.value)}
                    className="h-8 text-sm text-center border-transparent hover:border-primary/30 focus-visible:border-primary"
                  />
                ) : (
                  <span className="flex items-center justify-center gap-1 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {item.quantidade_funcionarios}
                  </span>
                )}
              </div>
              <div className="col-span-2">
                {isAdmin ? (
                  <Input
                    type="number"
                    min={1}
                    defaultValue={item.dias_previstos}
                    onBlur={(e) => handleInlineUpdate(item.id, "dias_previstos", e.target.value)}
                    className="h-8 text-sm text-center border-transparent hover:border-primary/30 focus-visible:border-primary"
                  />
                ) : (
                  <span className="text-sm text-center block">{item.dias_previstos} dias</span>
                )}
              </div>
              <div className="col-span-3 text-center text-sm text-muted-foreground">
                {calcSemanas(item.dias_previstos)}
              </div>
              <div className="col-span-1 flex justify-end">
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Totais */}
          <div className="grid grid-cols-12 gap-2 items-center px-3 pt-2 border-t border-border/50">
            <div className="col-span-4 text-sm font-semibold text-foreground">Total</div>
            <div className="col-span-2 text-center text-sm font-semibold">—</div>
            <div className="col-span-2 text-center text-sm font-semibold">{totalDias} dias</div>
            <div className="col-span-3 text-center text-sm font-semibold text-primary">
              {calcSemanas(totalDias)}
            </div>
            <div className="col-span-1" />
          </div>
          <div className="px-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Total homem/dia: <span className="font-medium text-foreground">{totalHomemDia}</span> (funcionários × dias)
            </p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum item de mão de obra cadastrado</p>
      )}
    </section>
  );
}
