import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItemMemorialLike {
  nome_popular: string;
  nome_cientifico: string | null;
  porte: string;
  quantidade: number;
  unidade: string;
  categoria: string;
  confianca: "alta" | "media" | "baixa";
}

interface Props {
  itens: ItemMemorialLike[];
  categorias: string[];
  unidades: string[];
  onUpdate: (idx: number, patch: Partial<ItemMemorialLike>) => void;
  onRemove: (idx: number) => void;
  /** Limite a partir do qual virtualiza. Default 80. */
  virtualizeThreshold?: number;
}

const COLS =
  "grid-cols-[3rem_minmax(11rem,1fr)_minmax(14rem,1.4fr)_minmax(14rem,1.4fr)_minmax(8rem,0.7fr)_minmax(6rem,0.5fr)_minmax(7rem,0.6fr)_5rem_4rem]";

function ConfiancaIcon({ c }: { c: ItemMemorialLike["confianca"] }) {
  if (c === "alta") return <Check className="w-4 h-4 text-primary inline" />;
  if (c === "media") return <Minus className="w-4 h-4 text-muted-foreground inline" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-600 inline" />;
}

function Row({
  it,
  idx,
  realIdx,
  categorias,
  unidades,
  onUpdate,
  onRemove,
}: {
  it: ItemMemorialLike;
  idx: number;
  realIdx: number;
  categorias: string[];
  unidades: string[];
  onUpdate: Props["onUpdate"];
  onRemove: Props["onRemove"];
}) {
  const baixa = it.confianca === "baixa";
  return (
    <div
      data-memorial-row
      className={cn(
        "grid items-center gap-2 px-2 py-1 border-t text-sm",
        COLS,
        baixa && "bg-yellow-50 border-l-4 border-l-yellow-500",
      )}
    >
      <div className="text-muted-foreground">{idx + 1}</div>
      <div>
        <Select value={it.categoria} onValueChange={(v) => onUpdate(realIdx, { categoria: v })}>
          <SelectTrigger className="h-8 gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Input
          data-field="nome_popular"
          value={it.nome_popular}
          onChange={(e) => onUpdate(realIdx, { nome_popular: e.target.value })}
          className={cn("h-8", baixa && "border-yellow-500 focus-visible:ring-yellow-500")}
        />
      </div>
      <div>
        <Input
          value={it.nome_cientifico ?? ""}
          onChange={(e) => onUpdate(realIdx, { nome_cientifico: e.target.value || null })}
          className="h-8 italic"
        />
      </div>
      <div>
        <Input
          value={it.porte}
          onChange={(e) => onUpdate(realIdx, { porte: e.target.value })}
          className={cn("h-8", baixa && "border-yellow-500 focus-visible:ring-yellow-500")}
        />
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={it.quantidade}
          onChange={(e) =>
            onUpdate(realIdx, { quantidade: parseFloat(e.target.value) || 0 })
          }
          className={cn(
            "h-8 tabular-nums",
            baixa && "border-yellow-500 focus-visible:ring-yellow-500",
          )}
        />
      </div>
      <div>
        <Select value={it.unidade} onValueChange={(v) => onUpdate(realIdx, { unidade: v })}>
          <SelectTrigger className="h-8 gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unidades.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-center">
        <ConfiancaIcon c={it.confianca} />
      </div>
      <div className="text-center">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(realIdx)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function MemorialItensTable({
  itens,
  categorias,
  unidades,
  onUpdate,
  onRemove,
  virtualizeThreshold = 80,
}: Props) {
  // Preserva o índice real para callbacks
  const indexed = itens.map((it, idx) => ({ it, realIdx: idx }));
  const shouldVirtualize = indexed.length > virtualizeThreshold;

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: indexed.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  const Header = (
    <div
      className={cn(
        "grid gap-2 px-2 py-2 bg-muted/50 text-muted-foreground text-xs font-medium border-b",
        COLS,
      )}
    >
      <div>#</div>
      <div>Categoria</div>
      <div>Nome Popular</div>
      <div>Nome Científico</div>
      <div>Porte</div>
      <div>Qtd</div>
      <div>Unidade</div>
      <div className="text-center">Confiança</div>
      <div className="text-center">Excluir</div>
    </div>
  );

  if (!shouldVirtualize) {
    return (
      <div className="border rounded-lg overflow-x-auto max-w-full">
        <div className="min-w-[1100px]">
          {Header}
          {indexed.map(({ it, realIdx }, displayIdx) => (
            <Row
              key={realIdx}
              it={it}
              idx={displayIdx}
              realIdx={realIdx}
              categorias={categorias}
              unidades={unidades}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto max-w-full">
      <div className="min-w-[1100px]">
        {Header}
        <div ref={parentRef} className="overflow-y-auto" style={{ maxHeight: 560 }}>
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const { it, realIdx } = indexed[vi.index];
              return (
                <div
                  key={vi.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <Row
                    it={it}
                    idx={vi.index}
                    realIdx={realIdx}
                    categorias={categorias}
                    unidades={unidades}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
