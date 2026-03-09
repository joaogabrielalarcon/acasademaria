import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type StatusArea, statusMeta } from "@/lib/diario-visitas";

export interface DiarioFiltersState {
  status: StatusArea | "all";
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
  status: "all",
  area: "all",
  colaborador: "all",
  periodo: "all",
};

export function DiarioFilters({ filters, onChange, areas, colaboradores }: DiarioFiltersProps) {
  const hasActiveFilters =
    filters.status !== "all" ||
    filters.area !== "all" ||
    filters.colaborador !== "all" ||
    filters.periodo !== "all";

  const clearFilters = () => onChange(defaultFilters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />

      {/* Status */}
      <Select
        value={filters.status}
        onValueChange={(value) => onChange({ ...filters, status: value as StatusArea | "all" })}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {Object.entries(statusMeta).map(([key, meta]) => (
            <SelectItem key={key} value={key}>
              {meta.emoji} {meta.label}
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
