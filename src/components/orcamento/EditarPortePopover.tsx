import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Ruler, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditarPortePopoverProps {
  itemId: string;
  itemTipo: "planta" | "insumo";
  fornecedorId: string;
  fornecedorNome?: string | null;
  itemNome?: string | null;
  porteAtual: string | null;
  precoAtual: number | null;
  unidade?: string | null;
  /** Portes já cadastrados para este item+fornecedor (sem duplicatas) */
  portesExistentes: string[];
  onSaved?: () => void;
}

const norm = (s: string | null | undefined) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export function EditarPortePopover({
  itemId,
  itemTipo,
  fornecedorId,
  fornecedorNome,
  itemNome,
  porteAtual,
  precoAtual,
  unidade,
  portesExistentes,
  onSaved,
}: EditarPortePopoverProps) {
  const [open, setOpen] = useState(false);
  const [porte, setPorte] = useState<string>(porteAtual || "");
  const [observacao, setObservacao] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();

  const portesNorm = useMemo(
    () => Array.from(new Set(portesExistentes.map(norm).filter(Boolean))),
    [portesExistentes],
  );
  const portesDisplay = useMemo(
    () =>
      Array.from(
        new Map(
          portesExistentes
            .filter((p) => p && p.trim())
            .map((p) => [norm(p), p.trim()]),
        ).values(),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [portesExistentes],
  );

  const novoPorte = porte.trim();
  const novoNorm = norm(novoPorte);
  const igualAtual = novoNorm === norm(porteAtual);
  const jaExiste = portesNorm.includes(novoNorm);
  const ehNovaVariacao = !!novoPorte && !igualAtual && !jaExiste;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!novoPorte) throw new Error("Informe um porte.");
      if (igualAtual) throw new Error("Porte igual ao atual.");

      // Cria nova entrada em historico_precos representando a nova variação
      // Triggers cuidam de auditoria; observação fica no próprio registro.
      const hoje = new Date().toISOString().slice(0, 10);
      const { error } = await (supabase as any).from("historico_precos").insert({
        item_id: itemId,
        item_tipo: itemTipo,
        fornecedor_id: fornecedorId,
        preco: precoAtual,
        porte: novoPorte,
        unidade: unidade || null,
        data_orcamento: hoje,
        observacoes: observacao.trim() || (ehNovaVariacao ? "Nova variação de porte" : null),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(ehNovaVariacao ? "Nova variação de porte registrada" : "Porte atualizado");
      queryClient.invalidateQueries({ queryKey: ["historico-fornecedores-orc"] });
      setOpen(false);
      setObservacao("");
      setConfirmando(false);
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar porte"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPorte) {
      toast.error("Informe um porte.");
      return;
    }
    if (igualAtual) {
      setOpen(false);
      return;
    }
    if (ehNovaVariacao && !confirmando) {
      setConfirmando(true);
      return;
    }
    mutation.mutate();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirmando(false);
          setPorte(porteAtual || "");
          setObservacao("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-primary p-0.5 ml-1"
          title="Editar porte"
          aria-label="Editar porte"
        >
          <Ruler className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="font-medium text-sm">Editar porte</p>
            <p className="text-xs text-muted-foreground">
              {itemNome}
              {fornecedorNome && <> · {fornecedorNome}</>}
            </p>
          </div>

          <div className="rounded-md border bg-muted/40 p-2 text-xs leading-tight">
            <div>
              <span className="text-muted-foreground">Porte atual:</span>{" "}
              <strong>{porteAtual || "—"}</strong>
            </div>
            {portesDisplay.length > 0 && (
              <div className="text-muted-foreground mt-1">
                Portes já cadastrados: <strong>{portesDisplay.join(", ")}</strong>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="novo-porte" className="text-xs">Novo porte</Label>
            <Input
              id="novo-porte"
              autoFocus
              value={porte}
              onChange={(e) => {
                setPorte(e.target.value);
                setConfirmando(false);
              }}
              placeholder="Ex: 0,40 m"
            />
          </div>

          {ehNovaVariacao && confirmando && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Esse porte não existe para <strong>{itemNome || "este item"}</strong> do{" "}
                <strong>{fornecedorNome || "fornecedor"}</strong>.
                {portesDisplay.length > 0 && (
                  <> Portes já cadastrados: <strong>{portesDisplay.join(", ")}</strong>.</>
                )}{" "}
                Deseja criar uma nova variação de <strong>{novoPorte}</strong>?
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="obs-porte" className="text-xs">Observação (opcional)</Label>
            <Textarea
              id="obs-porte"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: confirmado por WhatsApp"
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
            <Button type="submit" size="sm" disabled={mutation.isPending || !novoPorte || igualAtual}>
              {mutation.isPending
                ? "Salvando..."
                : ehNovaVariacao && !confirmando
                  ? "Continuar"
                  : ehNovaVariacao && confirmando
                    ? "Criar variação"
                    : "Salvar"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
