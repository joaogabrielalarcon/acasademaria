import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useInsumoUnidades, useAdicionarInsumoUnidade } from "@/hooks/useInsumoUnidades";
import { toast } from "sonner";

interface Props {
  insumoId?: string | null;
  value: string;
  unidadesGlobais: string[];
  onChange: (v: string) => void;
}

/**
 * Seletor de unidade do item.
 * - Quando o item está ligado a um insumo do catálogo, lista as FORMAS DE COMPRA
 *   cadastradas em insumo_unidades, com opção de adicionar uma nova ali mesmo.
 * - Quando não está (planta ou item solto), cai na lista global de unidades.
 */
export function UnidadeCell({ insumoId, value, unidadesGlobais, onChange }: Props) {
  const { data: formas = [] } = useInsumoUnidades(insumoId);
  const addUnidade = useAdicionarInsumoUnidade();

  const opcoes = useMemo(() => {
    if (!insumoId) return unidadesGlobais;
    const set = new Set<string>();
    for (const f of formas) if (f.unidade) set.add(f.unidade);
    if (value) set.add(value);
    return Array.from(set);
  }, [formas, insumoId, unidadesGlobais, value]);

  const [addOpen, setAddOpen] = useState(false);
  const [novaUn, setNovaUn] = useState("");

  async function gravarNovaForma() {
    if (!insumoId) return;
    const u = novaUn.trim();
    if (!u) return;
    try {
      await addUnidade.mutateAsync({ insumo_id: insumoId, unidade: u });
      onChange(u);
      setNovaUn("");
      setAddOpen(false);
      toast.success("Forma de compra adicionada");
    } catch (e: any) {
      toast.error(e?.message || "Não consegui adicionar");
    }
  }

  return (
    <div className="flex gap-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 gap-2 flex-1 min-w-0">
          <SelectValue placeholder="Unidade" />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
          {opcoes.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Nenhuma forma cadastrada
            </div>
          )}
        </SelectContent>
      </Select>
      {insumoId && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Adicionar forma de compra"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="text-xs font-medium mb-2">Nova forma de compra</div>
            <Input
              autoFocus
              placeholder="ex: saco 25kg, m³, rolo"
              value={novaUn}
              onChange={(e) => setNovaUn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  gravarNovaForma();
                }
              }}
              className="h-8"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAddOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={gravarNovaForma}
                disabled={!novaUn.trim() || addUnidade.isPending}
              >
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
