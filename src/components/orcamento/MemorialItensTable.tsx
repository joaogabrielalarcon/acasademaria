import { useRef, useState, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AlertTriangle, Check, Link2, Minus, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnidadeCell } from "./UnidadeCell";

export interface ItemMemorialLike {
  nome_popular: string;
  nome_cientifico: string | null;
  porte: string;
  quantidade: number;
  unidade: string;
  categoria: string;
  confianca: "alta" | "media" | "baixa";
  planta_id?: string | null;
  insumo_id?: string | null;
}

export interface PlantaCatalogoLite {
  id: string;
  nome_popular: string;
  nome_cientifico: string | null;
  unidade?: string | null;
  porte?: string | null;
}

interface Props {
  itens: ItemMemorialLike[];
  categorias: string[];
  unidades: string[];
  onUpdate: (idx: number, patch: Partial<ItemMemorialLike>) => void;
  onRemove: (idx: number) => void;
  /** Catálogo real de plantas para casar/escolher por linha. */
  plantasCatalogo?: PlantaCatalogoLite[];
  /** Liga (ou desliga, passando null) o item a uma planta do catálogo. */
  onLinkPlanta?: (idx: number, planta: PlantaCatalogoLite | null) => void;
  /** Abre o cadastro rápido (Mafe) para criar o item no catálogo. */
  onOpenCadastro?: (idx: number) => void;
  /** Limite a partir do qual virtualiza. Default 80. */
  virtualizeThreshold?: number;
}

const COLS =
  "grid-cols-[3rem_minmax(11rem,1fr)_minmax(13rem,1.3fr)_minmax(13rem,1.3fr)_minmax(8rem,0.7fr)_minmax(6rem,0.5fr)_minmax(7rem,0.6fr)_minmax(11rem,0.9fr)_5rem_4rem]";

function ConfiancaIcon({ c }: { c: ItemMemorialLike["confianca"] }) {
  if (c === "alta") return <Check className="w-4 h-4 text-primary inline" />;
  if (c === "media") return <Minus className="w-4 h-4 text-muted-foreground inline" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-600 inline" />;
}

function normalizar(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function CatalogoCell({
  it,
  realIdx,
  plantasCatalogo,
  onLinkPlanta,
  onOpenCadastro,
}: {
  it: ItemMemorialLike;
  realIdx: number;
  plantasCatalogo?: PlantaCatalogoLite[];
  onLinkPlanta?: Props["onLinkPlanta"];
  onOpenCadastro?: Props["onOpenCadastro"];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const ligadaAoCatalogo = !!it.planta_id || !!it.insumo_id;

  // top 30 sugestões: começa por matches de nome
  const sugestoes = useMemo(() => {
    if (!plantasCatalogo || plantasCatalogo.length === 0) return [];
    const q = normalizar(query || it.nome_popular || "");
    if (!q) return plantasCatalogo.slice(0, 30);
    const filtradas = plantasCatalogo.filter((p) => {
      const a = normalizar(p.nome_popular);
      const b = normalizar(p.nome_cientifico || "");
      return a.includes(q) || b.includes(q);
    });
    return filtradas.slice(0, 60);
  }, [plantasCatalogo, query, it.nome_popular]);

  if (!onLinkPlanta && !onOpenCadastro) {
    return <div className="text-xs text-muted-foreground">—</div>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-2 gap-1.5 text-xs flex-1 justify-start",
              ligadaAoCatalogo
                ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-dashed text-muted-foreground",
            )}
            title={ligadaAoCatalogo ? "Item vinculado ao catálogo · clique para trocar" : "Buscar no catálogo"}
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{ligadaAoCatalogo ? "Catálogo" : "Novo / a conferir"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[22rem]" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar planta no catálogo..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Nada encontrado.</CommandEmpty>
              {ligadaAoCatalogo && (
                <CommandGroup heading="Vínculo atual">
                  <CommandItem
                    onSelect={() => {
                      onLinkPlanta?.(realIdx, null);
                      setOpen(false);
                    }}
                    className="text-destructive"
                  >
                    <X className="w-4 h-4" />
                    Desvincular do catálogo
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading="Plantas">
                {sugestoes.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.nome_popular} ${p.nome_cientifico || ""}`}
                    onSelect={() => {
                      onLinkPlanta?.(realIdx, p);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span>{p.nome_popular}</span>
                      {p.nome_cientifico && (
                        <span className="text-xs italic text-muted-foreground">{p.nome_cientifico}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {onOpenCadastro && (
                <CommandGroup heading="Não está aqui?">
                  <CommandItem
                    onSelect={() => {
                      onOpenCadastro(realIdx);
                      setOpen(false);
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Cadastrar "{it.nome_popular || "novo item"}" no catálogo
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!ligadaAoCatalogo && onOpenCadastro && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          title="Cadastrar no catálogo"
          onClick={() => onOpenCadastro(realIdx)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

function Row({
  it,
  idx,
  realIdx,
  categorias,
  unidades,
  onUpdate,
  onRemove,
  plantasCatalogo,
  onLinkPlanta,
  onOpenCadastro,
}: {
  it: ItemMemorialLike;
  idx: number;
  realIdx: number;
  categorias: string[];
  unidades: string[];
  onUpdate: Props["onUpdate"];
  onRemove: Props["onRemove"];
  plantasCatalogo?: PlantaCatalogoLite[];
  onLinkPlanta?: Props["onLinkPlanta"];
  onOpenCadastro?: Props["onOpenCadastro"];
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
        <UnidadeCell
          insumoId={it.insumo_id ?? null}
          value={it.unidade}
          unidadesGlobais={unidades}
          onChange={(v) => onUpdate(realIdx, { unidade: v })}
        />
      </div>
      <div>
        <CatalogoCell
          it={it}
          realIdx={realIdx}
          plantasCatalogo={plantasCatalogo}
          onLinkPlanta={onLinkPlanta}
          onOpenCadastro={onOpenCadastro}
        />
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
  plantasCatalogo,
  onLinkPlanta,
  onOpenCadastro,
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
      <div>Catálogo</div>
      <div className="text-center">Confiança</div>
      <div className="text-center">Excluir</div>
    </div>
  );

  if (!shouldVirtualize) {
    return (
      <div className="border rounded-lg overflow-x-auto max-w-full">
        <div className="min-w-[1280px]">
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
              plantasCatalogo={plantasCatalogo}
              onLinkPlanta={onLinkPlanta}
              onOpenCadastro={onOpenCadastro}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto max-w-full">
      <div className="min-w-[1280px]">
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
                    plantasCatalogo={plantasCatalogo}
                    onLinkPlanta={onLinkPlanta}
                    onOpenCadastro={onOpenCadastro}
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
