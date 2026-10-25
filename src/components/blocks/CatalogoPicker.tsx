import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCatalogoBusca, type CatalogoTipo, type PlantaBusca, type InsumoBusca, type FornecedorBusca } from "@/hooks/useCatalogoBusca";

type Item = PlantaBusca | InsumoBusca | FornecedorBusca;

interface Props<T extends Item> {
  tipo: CatalogoTipo;
  value: string | null;
  /** Label shown on the trigger for the current value. */
  valueLabel?: string | null;
  onSelect: (item: T) => void;
  placeholder?: string;
  className?: string;
}

function rotulo(item: Item): { titulo: string; sub: ReactNode } {
  if ("nome_popular" in item) return { titulo: item.nome_popular, sub: item.nome_cientifico ? <i>{item.nome_cientifico}</i> : null };
  if ("categoria" in item) return { titulo: item.nome, sub: item.categoria };
  return { titulo: item.nome, sub: [item.cidade, item.estado].filter(Boolean).join(" · ") || null };
}

/** Type-to-search picker backed by the server (max 30 results). Nothing loads until it opens. */
export function CatalogoPicker<T extends Item>({ tipo, value, valueLabel, onSelect, placeholder = "Selecione...", className }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [termo, setTermo] = useState("");
  const { data = [], isFetching, isError, refetch } = useCatalogoBusca(tipo, termo, open);
  const precisaTermo = tipo === "plantas" && termo.trim().length < 2;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between font-normal", className)}>
          <span className={cn("truncate", !valueLabel && "text-muted-foreground")}>{valueLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[18rem]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Digite para buscar..." value={termo} onValueChange={setTermo} />
          <CommandList>
            {precisaTermo ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Digite ao menos 2 letras do nome popular ou científico.</div>
            ) : isFetching && data.length === 0 ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : isError ? (
              <div className="px-3 py-4 text-sm">
                Não consegui buscar agora.{" "}
                <button type="button" className="underline" onClick={() => refetch()}>Tentar de novo</button>
              </div>
            ) : (
              <>
                <CommandEmpty>Nada encontrado com esse nome. Tente outra grafia.</CommandEmpty>
                <CommandGroup>
                  {(data as Item[]).map((item) => {
                    const r = rotulo(item);
                    return (
                      <CommandItem key={item.id} value={item.id} onSelect={() => { onSelect(item as T); setOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span>{r.titulo}</span>
                          {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
