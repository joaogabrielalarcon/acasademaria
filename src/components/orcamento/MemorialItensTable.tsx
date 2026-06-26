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
import { AlertTriangle, Check, CircleHelp, Link2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnidadeCell } from "./UnidadeCell";

export interface SugestaoCatalogoLite {
  item_id: string;
  nome: string;
  nome_secundario: string | null;
  score: number;
  fonte: string;
  tipo: "planta" | "insumo";
}

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
  sugestoes?: SugestaoCatalogoLite[];
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
  plantasCatalogo?: PlantaCatalogoLite[];
  onLinkPlanta?: (idx: number, planta: PlantaCatalogoLite | null) => void;
  onOpenCadastro?: (idx: number) => void;
  virtualizeThreshold?: number;
}

// Linha enxuta: barra confiança · # · nome popular · nome científico · categoria · porte · qtd · unidade · catálogo (ícone) · excluir
const COLS =
  "grid-cols-[0.25rem_2rem_minmax(11rem,1.6fr)_minmax(10rem,1.4fr)_minmax(7.5rem,0.8fr)_4.5rem_4.5rem_minmax(6rem,0.6fr)_1.75rem_1.75rem]";


function normalizar(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ConfiancaBarra({ c }: { c: ItemMemorialLike["confianca"] }) {
  const cor =
    c === "alta"
      ? "bg-primary"
      : c === "media"
        ? "bg-muted-foreground/30"
        : "bg-yellow-500";
  const titulo =
    c === "alta"
      ? "Confiança alta"
      : c === "media"
        ? "Confiança média — revise se possível"
        : "Confiança baixa — revise antes de continuar";
  return <div className={cn("w-full h-full rounded-l-md", cor)} title={titulo} aria-label={titulo} />;
}

function ConfiancaIcone({ c }: { c: ItemMemorialLike["confianca"] }) {
  if (c === "alta") return <Check className="w-3 h-3 text-primary" aria-hidden />;
  if (c === "media") return <CircleHelp className="w-3 h-3 text-muted-foreground" aria-hidden />;
  return <AlertTriangle className="w-3 h-3 text-yellow-600" aria-hidden />;
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

  const sugestoesLista = useMemo(() => {
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

  const sugestaoTop = !ligadaAoCatalogo && it.sugestoes && it.sugestoes.length > 0 ? it.sugestoes[0] : null;
  const aplicarSugestao = () => {
    if (!sugestaoTop || !plantasCatalogo) return;
    const p = plantasCatalogo.find((x) => x.id === sugestaoTop.item_id);
    if (p) onLinkPlanta?.(realIdx, p);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center h-6 w-6 rounded-full transition-colors",
            ligadaAoCatalogo
              ? "text-primary hover:bg-primary/10"
              : sugestaoTop
                ? "text-yellow-600 hover:bg-yellow-500/10"
                : "text-muted-foreground/50 hover:bg-muted hover:text-foreground",
          )}
          title={
            ligadaAoCatalogo
              ? "No catálogo · clique para trocar"
              : sugestaoTop
                ? `Parece: ${sugestaoTop.nome} · clique para vincular`
                : "Não vinculado ao catálogo"
          }
          aria-label={ligadaAoCatalogo ? "No catálogo" : "A vincular ao catálogo"}
        >
          {ligadaAoCatalogo ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Link2 className="w-3.5 h-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[22rem]" align="end">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar no catálogo..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {ligadaAoCatalogo && (
              <CommandGroup heading="Vínculo atual">
                <CommandItem
                  onSelect={() => { onLinkPlanta?.(realIdx, null); setOpen(false); }}
                  className="text-destructive"
                >
                  <X className="w-4 h-4" />
                  Desvincular do catálogo
                </CommandItem>
              </CommandGroup>
            )}
            {it.sugestoes && it.sugestoes.length > 0 && !ligadaAoCatalogo && (
              <CommandGroup heading="Sugestões da Mafe">
                {it.sugestoes.map((s) => {
                  const p = plantasCatalogo?.find((x) => x.id === s.item_id);
                  return (
                    <CommandItem
                      key={s.item_id}
                      onSelect={() => { if (p) { onLinkPlanta?.(realIdx, p); setOpen(false); } }}
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span>{s.nome}</span>
                        {s.nome_secundario && (
                          <span className="text-xs italic text-muted-foreground">{s.nome_secundario}</span>
                        )}
                      </div>
                      <span className="ml-auto text-[10px] text-muted-foreground">{Math.round(s.score * 100)}%</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandGroup heading="Plantas">
              {sugestoesLista.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.nome_popular} ${p.nome_cientifico || ""}`}
                  onSelect={() => { onLinkPlanta?.(realIdx, p); setOpen(false); }}
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
                <CommandItem onSelect={() => { onOpenCadastro(realIdx); setOpen(false); }}>
                  <Plus className="w-4 h-4" />
                  Cadastrar "{it.nome_popular || "novo item"}" no catálogo
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  zebra,
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
  zebra: boolean;
}) {
  const baixa = it.confianca === "baixa";
  return (
    <div
      data-memorial-row
      className={cn(
        "grid items-center gap-2 pl-0 pr-2 py-1.5 border-t text-sm transition-colors group",
        COLS,
        zebra ? "bg-muted/20" : "bg-background",
        baixa && "bg-yellow-50/60",
        "hover:bg-accent/30",
      )}
    >
      {/* Barra de confiança (visual à esquerda) */}
      <div className="self-stretch py-0.5 pl-0.5">
        <ConfiancaBarra c={it.confianca} />
      </div>

      {/* # */}
      <div className="text-xs text-muted-foreground tabular-nums text-right pr-1">{idx + 1}</div>

      {/* Item: nome popular + científico */}
      <div className="min-w-0 space-y-1">
        <Input
          data-field="nome_popular"
          value={it.nome_popular}
          onChange={(e) => onUpdate(realIdx, { nome_popular: e.target.value })}
          placeholder="Nome popular"
          className={cn(
            "h-8 font-medium",
            baixa && "border-yellow-500 focus-visible:ring-yellow-500",
          )}
        />
        <div className="flex items-center gap-1.5">
          <ConfiancaIcone c={it.confianca} />
          <Input
            value={it.nome_cientifico ?? ""}
            onChange={(e) => onUpdate(realIdx, { nome_cientifico: e.target.value || null })}
            placeholder="Nome científico (opcional)"
            className="h-6 italic text-xs border-0 bg-transparent shadow-none px-1 placeholder:text-muted-foreground/60 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Categoria */}
      <div className="min-w-0">
        <Select value={it.categoria} onValueChange={(v) => onUpdate(realIdx, { categoria: v })}>
          <SelectTrigger className="h-8 text-xs">
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

      {/* Porte */}
      <div>
        <Input
          value={it.porte}
          onChange={(e) => onUpdate(realIdx, { porte: e.target.value })}
          placeholder="—"
          className={cn(
            "h-8 text-xs text-center px-1",
            baixa && "border-yellow-500 focus-visible:ring-yellow-500",
          )}
        />
      </div>

      {/* Qtd */}
      <div>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={it.quantidade}
          onChange={(e) => onUpdate(realIdx, { quantidade: parseFloat(e.target.value) || 0 })}
          className={cn(
            "h-8 tabular-nums text-right px-1.5",
            baixa && "border-yellow-500 focus-visible:ring-yellow-500",
          )}
        />
      </div>

      {/* Unidade */}
      <div className="min-w-0">
        <UnidadeCell
          insumoId={it.insumo_id ?? null}
          value={it.unidade}
          unidadesGlobais={unidades}
          onChange={(v) => onUpdate(realIdx, { unidade: v })}
        />
      </div>

      {/* Catálogo */}
      <div className="min-w-0">
        <CatalogoCell
          it={it}
          realIdx={realIdx}
          plantasCatalogo={plantasCatalogo}
          onLinkPlanta={onLinkPlanta}
          onOpenCadastro={onOpenCadastro}
        />
      </div>

      {/* Excluir */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(realIdx)}
          title="Remover item"
        >
          <Trash2 className="w-3.5 h-3.5" />
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
  const indexed = itens.map((it, idx) => ({ it, realIdx: idx }));
  const shouldVirtualize = indexed.length > virtualizeThreshold;

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: indexed.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  const Header = (
    <div
      className={cn(
        "grid gap-2 pl-0 pr-2 py-2 bg-muted/50 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide border-b sticky top-0 z-10",
        COLS,
      )}
    >
      <div />
      <div className="text-right pr-1">#</div>
      <div>Item</div>
      <div>Categoria</div>
      <div className="text-center">Porte</div>
      <div className="text-right pr-1">Qtd</div>
      <div>Unidade</div>
      <div>Catálogo</div>
      <div className="text-center">
        <Trash2 className="w-3 h-3 inline opacity-60" aria-label="Excluir" />
      </div>
    </div>
  );

  if (!shouldVirtualize) {
    return (
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[58rem]">
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
                zebra={displayIdx % 2 === 1}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[58rem]">
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
                      zebra={vi.index % 2 === 1}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
