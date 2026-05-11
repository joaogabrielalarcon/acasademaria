import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PackageX, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface IndisponibilidadeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string;
  itemTipo: "planta" | "insumo";
  fornecedorId: string;
  fornecedorNome?: string | null;
  itemNome?: string;
}

export function IndisponibilidadeDialog({
  open,
  onOpenChange,
  itemId,
  itemTipo,
  fornecedorId,
  fornecedorNome,
  itemNome,
}: IndisponibilidadeDialogProps) {
  const [observacao, setObservacao] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("cotacao_indisponibilidades")
        .insert({
          item_id: itemId,
          item_tipo: itemTipo,
          fornecedor_id: fornecedorId,
          observacao: observacao.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcado como indisponível");
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades-orc"] });
      setObservacao("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="w-4 h-4 text-amber-700" />
            Marcar como "não tinha o item"
          </DialogTitle>
          <DialogDescription>
            <span className="text-foreground font-medium">{fornecedorNome || "Fornecedor"}</span>
            {itemNome && (
              <> não tinha <span className="font-medium text-foreground">{itemNome}</span> hoje.</>
            )}
            {" "}A marcação fica registrada com data e responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="obs-indisp" className="text-xs">Observação (opcional)</Label>
          <Textarea
            id="obs-indisp"
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder='Ex: "Sob encomenda para 30 dias", "Não trabalha mais com essa espécie"'
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Registrando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface IndisponibilidadeRow {
  id: string;
  data_marcacao: string;
  observacao: string | null;
  registrado_por_nome: string | null;
  fornecedor_id: string;
  item_id: string;
  item_tipo: string;
}

export function useIndisponibilidades(itemIds: string[]) {
  return useQuery({
    queryKey: ["indisponibilidades-orc", itemIds.slice().sort().join(",")],
    enabled: itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cotacao_indisponibilidades")
        .select("id, data_marcacao, observacao, registrado_por_nome, fornecedor_id, item_id, item_tipo")
        .in("item_id", itemIds)
        .order("data_marcacao", { ascending: false });
      if (error) throw error;
      // Latest per (item_id, fornecedor_id) wins
      const map = new Map<string, IndisponibilidadeRow>();
      (data || []).forEach((r: IndisponibilidadeRow) => {
        const key = `${r.item_id}::${r.fornecedor_id}`;
        if (!map.has(key)) map.set(key, r);
      });
      return map;
    },
  });
}

interface DesfazerProps {
  marcacaoId: string;
  fornecedorNome?: string | null;
}

export function DesfazerIndisponibilidadeButton({ marcacaoId, fornecedorNome }: DesfazerProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("cotacao_indisponibilidades")
        .delete()
        .eq("id", marcacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcação removida");
      queryClient.invalidateQueries({ queryKey: ["indisponibilidades-orc"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao desfazer"),
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title={`Desfazer marcação de ${fornecedorNome || "fornecedor"}`}
    >
      <RotateCcw className="w-3 h-3" />
      Desfazer
    </Button>
  );
}
