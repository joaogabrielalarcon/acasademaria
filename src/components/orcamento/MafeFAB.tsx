// MafeFAB — Sub-PR 2D
// Botão flutuante "Atualizar via Mafe" disponível durante toda a Etapa 3.
// Ao clicar abre uma sheet de seleção rápida de fornecedor (ordenada por idade
// da cotação mais antiga). Em seguida o IAChatPanel (controlado pelo pai) é
// aberto para o fornecedor escolhido.

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FornecedorAtualizacaoItem } from "@/components/orcamento/AtualizarCotacoesPanel";

interface MafeFABProps {
  fornecedoresEnvolvidos: FornecedorAtualizacaoItem[];
  /** Quando há um único bloco expandido, dá prioridade aos fornecedores desse item. */
  fornecedoresContextoPrioritario?: FornecedorAtualizacaoItem[];
  contextoLabel?: string | null;
  onSelecionar: (f: FornecedorAtualizacaoItem) => void;
}

function ultimaCotacaoMaisAntiga(f: FornecedorAtualizacaoItem): number {
  const datas = f.itens
    .map((i) => i.ultima_cotacao)
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime())
    .filter((t) => !isNaN(t));
  if (datas.length === 0) return 0; // sem data = mais antigo possível
  return Math.min(...datas);
}

function formatIdade(f: FornecedorAtualizacaoItem): string {
  const t = ultimaCotacaoMaisAntiga(f);
  if (!t) return "sem cotação";
  const dias = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  if (dias < 1) return "hoje";
  if (dias < 30) return `${dias}d`;
  const meses = Math.floor(dias / 30);
  return `${meses}m`;
}

export function MafeFAB({
  fornecedoresEnvolvidos,
  fornecedoresContextoPrioritario,
  contextoLabel,
  onSelecionar,
}: MafeFABProps) {
  const [open, setOpen] = useState(false);

  const ordenados = useMemo(() => {
    return [...fornecedoresEnvolvidos].sort(
      (a, b) => ultimaCotacaoMaisAntiga(a) - ultimaCotacaoMaisAntiga(b),
    );
  }, [fornecedoresEnvolvidos]);

  const prioritarios = fornecedoresContextoPrioritario || [];
  const idsPrioritarios = new Set(prioritarios.map((f) => f.fornecedorId));
  const outros = ordenados.filter((f) => !idsPrioritarios.has(f.fornecedorId));

  const escolher = (f: FornecedorAtualizacaoItem) => {
    setOpen(false);
    onSelecionar(f);
  };

  if (fornecedoresEnvolvidos.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Atualizar cotações via Mafe"
        className={cn(
          "fixed bottom-6 right-6 z-40 h-12 px-4 gap-2 rounded-full shadow-lg",
          "bg-[hsl(var(--terracota,18_60%_45%))] text-[hsl(var(--creme,30_40%_96%))]",
          "hover:opacity-90 hover:bg-[hsl(var(--terracota,18_60%_45%))]",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--terracota,18_60%_45%))]",
        )}
      >
        <Sparkles className="w-4 h-4" />
        Atualizar via Mafe
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-display text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Atualizar via Mafe
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Escolha o fornecedor para conversar com a Mafe e atualizar as cotações.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {prioritarios.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                  {contextoLabel ? `Do item ${contextoLabel}` : "Em contexto"}
                </h4>
                <ul className="space-y-1.5">
                  {prioritarios.map((f) => (
                    <FornecedorRow key={f.fornecedorId} f={f} onClick={() => escolher(f)} />
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
                {prioritarios.length > 0 ? "Outros fornecedores" : "Fornecedores do orçamento"}{" "}
                <span className="text-muted-foreground/60 normal-case">
                  · mais antigos primeiro
                </span>
              </h4>
              {outros.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">Nenhum outro fornecedor.</p>
              ) : (
                <ul className="space-y-1.5">
                  {outros.map((f) => (
                    <FornecedorRow key={f.fornecedorId} f={f} onClick={() => escolher(f)} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FornecedorRow({
  f,
  onClick,
}: {
  f: FornecedorAtualizacaoItem;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-md border bg-background hover:bg-muted/40 transition-colors",
          "p-2.5 flex items-center justify-between gap-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{f.fornecedorNome}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {f.itens.length} {f.itens.length === 1 ? "item" : "itens"}
            {f.mercado ? ` · ${f.mercado}` : ""}
          </p>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground shrink-0">
          {formatIdade(f)}
        </span>
      </button>
    </li>
  );
}
