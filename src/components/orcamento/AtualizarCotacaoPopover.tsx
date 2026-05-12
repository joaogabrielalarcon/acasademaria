// AtualizarCotacaoPopover — Sub-PR 2D
// Popover unificado de "Atualizar cotação" para uma linha de fornecedor x item.
// Substitui EditarPrecoPopover + EditarPortePopover + ícone de "não tinha".
//
// Características:
// - Renderização lazy (conteúdo só monta quando o operador abre).
// - Navegação por teclado (Tab entre campos, Enter salva, Esc cancela).
// - Aviso de "nova variação" quando o porte digitado não existe para o par item+fornecedor.
// - Salva em transação única em historico_precos com todos os campos + observação.
// - Botão secundário "Marcar indisponibilidade" abre o IndisponibilidadeDialog.

import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, PackageX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UNIDADES_COTACAO } from "@/lib/unidades";
import { IndisponibilidadeDialog } from "@/components/orcamento/IndisponibilidadeDialog";

interface Props {
  itemId: string;
  itemTipo: "planta" | "insumo";
  fornecedorId: string;
  fornecedorNome?: string | null;
  itemNome?: string | null;
  precoAtual: number | null;
  porteAtual: string | null;
  unidadeAtual: string | null;
  ultimaAtualizacao?: string | null;
  atualizadoPorNome?: string | null;
  /** Portes já cadastrados para esse item+fornecedor (para detectar nova variação) */
  portesExistentes: string[];
  onSaved?: () => void;
  /** Trigger clicável (cell). Deve ser um único elemento React. */
  children: React.ReactNode;
  /** Marcação de indisponibilidade existente — quando presente, esconde o botão "Marcar indisponibilidade". */
  jaIndisponivel?: boolean;
}

const formatBRL = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? "—" : `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

const formatData = (iso?: string | null) => {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "sem data";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const norm = (s: string | null | undefined) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export function AtualizarCotacaoPopover({
  itemId,
  itemTipo,
  fornecedorId,
  fornecedorNome,
  itemNome,
  precoAtual,
  porteAtual,
  unidadeAtual,
  ultimaAtualizacao,
  atualizadoPorNome,
  portesExistentes,
  onSaved,
  children,
  jaIndisponivel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [indispOpen, setIndispOpen] = useState(false);

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(v) => setOpen(v)}
      >
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          {/* Lazy: corpo só monta quando aberto */}
          {open && (
            <PopoverBody
              itemId={itemId}
              itemTipo={itemTipo}
              fornecedorId={fornecedorId}
              fornecedorNome={fornecedorNome}
              itemNome={itemNome}
              precoAtual={precoAtual}
              porteAtual={porteAtual}
              unidadeAtual={unidadeAtual}
              ultimaAtualizacao={ultimaAtualizacao}
              atualizadoPorNome={atualizadoPorNome}
              portesExistentes={portesExistentes}
              jaIndisponivel={jaIndisponivel}
              onClose={() => setOpen(false)}
              onMarkUnavailable={() => {
                setOpen(false);
                setIndispOpen(true);
              }}
              onSaved={onSaved}
            />
          )}
        </PopoverContent>
      </Popover>

      {indispOpen && (
        <IndisponibilidadeDialog
          open={indispOpen}
          onOpenChange={setIndispOpen}
          itemId={itemId}
          itemTipo={itemTipo}
          fornecedorId={fornecedorId}
          fornecedorNome={fornecedorNome || undefined}
          itemNome={itemNome || undefined}
        />
      )}
    </>
  );
}

interface BodyProps extends Omit<Props, "children"> {
  onClose: () => void;
  onMarkUnavailable: () => void;
}

function PopoverBody({
  itemId,
  itemTipo,
  fornecedorId,
  fornecedorNome,
  itemNome,
  precoAtual,
  porteAtual,
  unidadeAtual,
  ultimaAtualizacao,
  atualizadoPorNome,
  portesExistentes,
  jaIndisponivel,
  onClose,
  onMarkUnavailable,
  onSaved,
}: BodyProps) {
  const [porte, setPorte] = useState<string>(porteAtual || "");
  const [precoStr, setPrecoStr] = useState<string>(
    precoAtual != null ? String(precoAtual).replace(".", ",") : "",
  );
  const [unidade, setUnidade] = useState<string>(unidadeAtual || "");
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
  const novoPorteNorm = norm(novoPorte);
  const porteIgualAtual = novoPorteNorm === norm(porteAtual);
  const porteJaExiste = portesNorm.includes(novoPorteNorm);
  const ehNovaVariacao = !!novoPorte && !porteIgualAtual && !porteJaExiste;

  const parsePreco = (): number | null => {
    if (!precoStr.trim()) return null;
    const numStr = precoStr.replace(/\./g, "").replace(",", ".").trim();
    const n = Number(numStr);
    if (!isFinite(n) || n <= 0) return null;
    return n;
  };

  const novoPreco = parsePreco();
  const precoIgualAtual =
    novoPreco != null && precoAtual != null && Math.abs(novoPreco - precoAtual) < 0.005;
  const unidadeIgualAtual = (unidade || "").trim() === (unidadeAtual || "").trim();

  const houveMudanca =
    !!novoPorte && (!porteIgualAtual || !precoIgualAtual || !unidadeIgualAtual)
      ? true
      : !precoIgualAtual || !unidadeIgualAtual;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!novoPorte) throw new Error("Informe o porte.");
      if (novoPreco == null) throw new Error("Informe um preço válido.");
      if (!unidade) throw new Error("Selecione a unidade.");
      if (!houveMudanca) throw new Error("Nada mudou em relação à cotação atual.");

      const hoje = new Date().toISOString().slice(0, 10);
      const obs =
        observacao.trim() ||
        (ehNovaVariacao ? "Nova variação de porte" : null);

      // Caminho 1: preço mudou — atualiza catálogo (trigger cria historico + audit).
      // Depois, completa a entrada criada com porte/unidade/observacao.
      if (!precoIgualAtual) {
        const tabela = itemTipo === "planta" ? "plantas" : "insumos";
        const updatePayload: Record<string, unknown> = {
          preco_unitario: novoPreco,
          ultima_compra: hoje,
        };
        const { error: upErr } = await (supabase as any)
          .from(tabela)
          .update(updatePayload)
          .eq("id", itemId)
          .eq("fornecedor_id", fornecedorId);
        if (upErr) throw upErr;

        // Pega a entrada recém-criada pelo trigger e completa porte/unidade/obs
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
          const patch: Record<string, unknown> = {
            porte: novoPorte,
            unidade: unidade || null,
          };
          if (obs) patch.observacoes = obs;
          await (supabase as any)
            .from("historico_precos")
            .update(patch)
            .eq("id", ultima.id);
        }
      } else {
        // Caminho 2: só porte/unidade mudaram — insere uma entrada nova diretamente.
        const { error } = await (supabase as any)
          .from("historico_precos")
          .insert({
            item_id: itemId,
            item_tipo: itemTipo,
            fornecedor_id: fornecedorId,
            preco: novoPreco,
            porte: novoPorte,
            unidade: unidade || null,
            data_orcamento: hoje,
            observacoes: obs,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        ehNovaVariacao ? "Cotação atualizada · nova variação registrada" : "Cotação atualizada",
      );
      queryClient.invalidateQueries({ queryKey: ["historico-fornecedores-orc"] });
      queryClient.invalidateQueries({ queryKey: ["plantas"] });
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
      onSaved?.();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar cotação"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPorte || novoPreco == null || !unidade) return;
    if (ehNovaVariacao && !confirmando) {
      setConfirmando(true);
      return;
    }
    mutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      className="p-3 space-y-3"
    >
      <div>
        <p className="font-medium text-sm">Atualizar cotação</p>
        <p className="text-xs text-muted-foreground truncate">
          {itemNome || "Item"}
          {fornecedorNome && <> · {fornecedorNome}</>}
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-2 text-[11px] leading-tight space-y-0.5">
        <div>
          <span className="text-muted-foreground">Cotação atual:</span>{" "}
          <strong>{formatBRL(precoAtual)}</strong>
          <span className="text-muted-foreground"> · Porte </span>
          <strong>{porteAtual || "—"}</strong>
          <span className="text-muted-foreground"> · Unidade </span>
          <strong>{unidadeAtual || "—"}</strong>
        </div>
        <div className="text-muted-foreground">
          atualizado por <strong>{atualizadoPorNome || "—"}</strong> em{" "}
          <strong>{formatData(ultimaAtualizacao)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="ac-porte" className="text-xs">Porte</Label>
          <Input
            id="ac-porte"
            autoFocus
            value={porte}
            onChange={(e) => {
              setPorte(e.target.value);
              setConfirmando(false);
            }}
            placeholder="Ex: 0,40"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ac-preco" className="text-xs">Preço (R$)</Label>
          <Input
            id="ac-preco"
            inputMode="decimal"
            value={precoStr}
            onChange={(e) => setPrecoStr(e.target.value)}
            placeholder="0,00"
            className="h-8 text-sm tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="ac-unidade" className="text-xs">Unidade</Label>
        <Select value={unidade} onValueChange={setUnidade}>
          <SelectTrigger id="ac-unidade" className="h-8 text-sm">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {UNIDADES_COTACAO.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ehNovaVariacao && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-900 flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            Esse porte não existe para <strong>{itemNome || "este item"}</strong> do{" "}
            <strong>{fornecedorNome || "fornecedor"}</strong>.{" "}
            {portesDisplay.length > 0 && (
              <>Portes já cadastrados: <strong>{portesDisplay.join(", ")}</strong>.{" "}</>
            )}
            {confirmando ? (
              <>Confirme para criar a nova variação <strong>{novoPorte}</strong>.</>
            ) : (
              <>Vai criar uma nova variação de <strong>{novoPorte}</strong>.</>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="ac-obs" className="text-xs">Observação (opcional)</Label>
        <Textarea
          id="ac-obs"
          rows={2}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex: cotação por WhatsApp em 11/05"
          className="text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {!jaIndisponivel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onMarkUnavailable}
            disabled={mutation.isPending}
          >
            <PackageX className="w-3.5 h-3.5" />
            Marcar indisponibilidade
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">
            Marcado como indisponível
          </span>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={
              mutation.isPending ||
              !novoPorte ||
              novoPreco == null ||
              !unidade ||
              !houveMudanca
            }
          >
            {mutation.isPending
              ? "Salvando..."
              : ehNovaVariacao && !confirmando
                ? "Continuar"
                : "Salvar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
