import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type NotaQualidade, notaQualidadeMeta } from "@/lib/diario-visitas";

export interface DiarioFiltersState {
  nota: NotaQualidade | "all";
  area: string;
  colaborador: string;
  periodo: "all" | "7dias" | "30dias" | "90dias";
}

interface DiarioFiltersProps {
  filters: DiarioFiltersState;
  onChange: (filters: DiarioFiltersState) => void;
  areas: string[];
  colaboradores: string[];
}

export const defaultFilters: DiarioFiltersState = {
  nota: "all",
  area: "all",
  colaborador: "all",
  periodo: "all",
};

export function DiarioFilters({ filters, onChange, areas, colaboradores }: DiarioFiltersProps) {
  const hasActiveFilters =
    filters.nota !== "all" ||
    filters.area !== "all" ||
    filters.colaborador !== "all" ||
    filters.periodo !== "all";

  const clearFilters = () => onChange(defaultFilters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />

      {/* Nota de qualidade 1-5 */}
      <Select
        value={filters.nota === "all" ? "all" : String(filters.nota)}
        onValueChange={(value) => onChange({ ...filters, nota: value === "all" ? "all" : (Number(value) as NotaQualidade) })}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Qualidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as notas</SelectItem>
          {([5, 4, 3, 2, 1] as NotaQualidade[]).map((nota) => (
            <SelectItem key={nota} value={String(nota)}>
              {nota} - {notaQualidadeMeta[nota].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Área */}
      <Select
        value={filters.area}
        onValueChange={(value) => onChange({ ...filters, area: value })}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Colaborador */}
      <Select
        value={filters.colaborador}
        onValueChange={(value) => onChange({ ...filters, colaborador: value })}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Colaborador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {colaboradores.map((colaborador) => (
            <SelectItem key={colaborador} value={colaborador}>
              {colaborador}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Período */}
      <Select
        value={filters.periodo}
        onValueChange={(value) => onChange({ ...filters, periodo: value as DiarioFiltersState["periodo"] })}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="7dias">Últimos 7 dias</SelectItem>
          <SelectItem value="30dias">Últimos 30 dias</SelectItem>
          <SelectItem value="90dias">Últimos 90 dias</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 px-2 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
