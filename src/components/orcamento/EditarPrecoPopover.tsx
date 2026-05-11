import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditarPrecoPopoverProps {
  itemId: string;
  itemTipo: "planta" | "insumo";
  fornecedorId: string;
  fornecedorNome?: string | null;
  precoAtual: number | null;
  ultimaAtualizacao?: string | null; // ISO date
  atualizadoPorNome?: string | null;
  unidade?: string | null;
  onSaved?: () => void;
  trigger?: React.ReactNode;
}

const formatBRL = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

const formatData = (iso?: string | null) => {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "sem data";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function EditarPrecoPopover({
  itemId,
  itemTipo,
  fornecedorId,
  fornecedorNome,
  precoAtual,
  ultimaAtualizacao,
  atualizadoPorNome,
  unidade,
  onSaved,
  trigger,
}: EditarPrecoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState<string>(
    precoAtual != null ? String(precoAtual).replace(".", ",") : "",
  );
  const [observacao, setObservacao] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const numStr = valor.replace(/\./g, "").replace(",", ".").trim();
      const novo = Number(numStr);
      if (!isFinite(novo) || novo <= 0) throw new Error("Informe um valor numérico maior que zero.");

      const tabela = itemTipo === "planta" ? "plantas" : "insumos";
      const hoje = new Date().toISOString().slice(0, 10);

      // Atualiza catálogo (trigger cria entrada automática em historico_precos + audit_price_changes)
      const { error: upErr } = await (supabase as any)
        .from(tabela)
        .update({ preco_unitario: novo, ultima_compra: hoje })
        .eq("id", itemId)
        .eq("fornecedor_id", fornecedorId);
      if (upErr) throw upErr;

      // Se houver observação, anexa à entrada de histórico recém-criada
      if (observacao.trim()) {
        const { data: ultima } = await (supabase as any)
          .from("historico_precos")
          .select("id")
          .eq("item_id", itemId)
          .eq("item_tipo", itemTipo)
          .eq("fornecedor_id", fornecedorId)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ultima?.id) {
          await (supabase as any)
            .from("historico_precos")
            .update({ observacoes: observacao.trim() })
            .eq("id", ultima.id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Preço atualizado");
      queryClient.invalidateQueries({ queryKey: ["historico-fornecedores-orc"] });
      queryClient.invalidateQueries({ queryKey: ["plantas"] });
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
      setOpen(false);
      setObservacao("");
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar preço"),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="text-muted-foreground hover:text-primary p-0.5"
            title="Atualizar preço"
            aria-label="Atualizar preço"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <p className="font-medium text-sm">Atualizar preço</p>
            {fornecedorNome && (
              <p className="text-xs text-muted-foreground">{fornecedorNome}</p>
            )}
          </div>

          <div className="rounded-md border bg-muted/40 p-2 text-xs leading-tight">
            <div>
              <span className="text-muted-foreground">Valor atual:</span>{" "}
              <strong>{formatBRL(precoAtual)}</strong>
              {unidade && <span className="text-muted-foreground"> / {unidade}</span>}
            </div>
            <div className="text-muted-foreground">
              Atualizado por <strong>{atualizadoPorNome || "—"}</strong> em{" "}
              <strong>{formatData(ultimaAtualizacao)}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="novo-preco" className="text-xs">Novo valor (R$)</Label>
            <Input
              id="novo-preco"
              autoFocus
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="obs-preco" className="text-xs">Observação (opcional)</Label>
            <Textarea
              id="obs-preco"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: cotação por WhatsApp em 11/05"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
