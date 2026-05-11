import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditarMercadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedorId: string;
  fornecedorNome?: string | null;
  mercadoAtual?: string | null;
  sugestoes?: string[];
  /** chamado após salvar com sucesso, recebe o novo mercado */
  onSaved?: (novoMercado: string) => void;
}

/**
 * Modal sobre a tela atual para preencher o campo Mercado de um fornecedor.
 * Mantém o operador no contexto do orçamento — não navega para outra rota.
 */
export function EditarMercadoDialog({
  open,
  onOpenChange,
  fornecedorId,
  fornecedorNome,
  mercadoAtual,
  sugestoes = [],
  onSaved,
}: EditarMercadoDialogProps) {
  const [mercado, setMercado] = useState(mercadoAtual || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setMercado(mercadoAtual || "");
      // foco automático no campo
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, mercadoAtual]);

  const sugestoesUnicas = Array.from(
    new Set((sugestoes || []).map((s) => String(s || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const mutation = useMutation({
    mutationFn: async () => {
      const valor = mercado.trim();
      if (!valor) throw new Error("Informe o mercado do fornecedor.");
      const { error } = await (supabase as any)
        .from("fornecedores")
        .update({ mercado: valor })
        .eq("id", fornecedorId);
      if (error) throw error;
      return valor;
    },
    onSuccess: (valor) => {
      toast.success("Mercado atualizado");
      queryClient.invalidateQueries({ queryKey: ["historico-fornecedores-orc"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores-ativos-lista"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      onSaved?.(valor);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar mercado"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir mercado</DialogTitle>
          <DialogDescription>
            {fornecedorNome ? (
              <>
                <strong>{fornecedorNome}</strong> ainda não tem mercado cadastrado.
                Preencha sem sair da etapa de fornecedores.
              </>
            ) : (
              "Preencha o mercado do fornecedor."
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <Label htmlFor="mercado-input" className="text-xs">Mercado</Label>
            <Input
              ref={inputRef}
              id="mercado-input"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              placeholder="Ex: Holambra, Cotia, Ibiúna…"
              list="mercado-sugestoes"
              autoComplete="off"
            />
            <datalist id="mercado-sugestoes">
              {sugestoesUnicas.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {sugestoesUnicas.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {sugestoesUnicas.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMercado(s)}
                    className="text-[11px] px-2 py-0.5 rounded-md border bg-secondary text-secondary-foreground hover:border-primary/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !mercado.trim()}>
              {mutation.isPending ? "Salvando..." : "Salvar e voltar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
