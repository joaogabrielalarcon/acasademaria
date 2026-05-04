import { useMemo, useState, ReactNode } from "react";
import { Filter, X, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ColumnType = "text" | "number" | "enum";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => any;
  render?: (row: T) => ReactNode;
  type?: ColumnType;
  /** width in px for sticky horizontal layout */
  width?: number;
  /** disable filtering on this column */
  disableFilter?: boolean;
  /** disable sorting on this column */
  disableSort?: boolean;
}

type Operator =
  | "contains" | "equals" | "not_equals" | "starts_with" | "ends_with" | "is_empty" | "is_not_empty"
  | "gt" | "gte" | "lt" | "lte" | "between";

interface AdvRule {
  id: string;
  columnKey: string;
  operator: Operator;
  value: string;
  value2?: string;
}

const TEXT_OPS: { v: Operator; label: string }[] = [
  { v: "contains", label: "contém" },
  { v: "equals", label: "igual a" },
  { v: "not_equals", label: "diferente de" },
  { v: "starts_with", label: "começa com" },
  { v: "ends_with", label: "termina com" },
  { v: "is_empty", label: "está vazio" },
  { v: "is_not_empty", label: "não está vazio" },
];
const NUM_OPS: { v: Operator; label: string }[] = [
  { v: "equals", label: "=" },
  { v: "not_equals", label: "≠" },
  { v: "gt", label: ">" },
  { v: "gte", label: "≥" },
  { v: "lt", label: "<" },
  { v: "lte", label: "≤" },
  { v: "between", label: "entre" },
  { v: "is_empty", label: "está vazio" },
  { v: "is_not_empty", label: "não está vazio" },
];

function asString(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function asNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function matchRule<T>(row: T, rule: AdvRule, col?: DataTableColumn<T>): boolean {
  if (!col) return true;
  const raw = col.accessor(row);
  const isNum = col.type === "number";
  if (rule.operator === "is_empty") return raw === null || raw === undefined || asString(raw).trim() === "";
  if (rule.operator === "is_not_empty") return !(raw === null || raw === undefined || asString(raw).trim() === "");

  if (isNum) {
    const n = asNumber(raw);
    const a = asNumber(rule.value);
    const b = asNumber(rule.value2);
    if (n === null) return false;
    switch (rule.operator) {
      case "equals": return a !== null && n === a;
      case "not_equals": return a !== null && n !== a;
      case "gt": return a !== null && n > a;
      case "gte": return a !== null && n >= a;
      case "lt": return a !== null && n < a;
      case "lte": return a !== null && n <= a;
      case "between": return a !== null && b !== null && n >= a && n <= b;
      default: return true;
    }
  } else {
    const s = asString(raw).toLowerCase();
    const v = (rule.value ?? "").toLowerCase();
    switch (rule.operator) {
      case "contains": return s.includes(v);
      case "equals": return s === v;
      case "not_equals": return s !== v;
      case "starts_with": return s.startsWith(v);
      case "ends_with": return s.endsWith(v);
      default: return true;
    }
  }
}

interface Props<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** unique key per row */
  rowKey: (row: T) => string;
  /** rendered at the right end of every row (actions) */
  rowActions?: (row: T) => ReactNode;
  /** initial number of rows visible */
  initialVisible?: number;
  pageSize?: number;
  emptyMessage?: string;
  loading?: boolean;
  /** global text search placeholder */
  searchPlaceholder?: string;
  /** keys searched by global search */
  globalSearchKeys?: string[];
}

export function DataTableExcel<T>({
  data, columns, rowKey, rowActions,
  initialVisible = 30, pageSize = 30,
  emptyMessage = "Nenhum registro encontrado",
  loading = false,
  searchPlaceholder = "Buscar...",
  globalSearchKeys,
}: Props<T>) {
  const [globalSearch, setGlobalSearch] = useState("");
  // per-column funnel: selected values (checkboxes)
  const [colFilters, setColFilters] = useState<Record<string, Set<string>>>({});
  const [colSearch, setColSearch] = useState<Record<string, string>>({});
  const [advRules, setAdvRules] = useState<AdvRule[]>([]);
  const [showAdv, setShowAdv] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialVisible);

  const colByKey = useMemo(() => {
    const m = new Map<string, DataTableColumn<T>>();
    columns.forEach((c) => m.set(c.key, c));
    return m;
  }, [columns]);

  // Distinct values per column (for funnel)
  const distinctValues = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const col of columns) {
      if (col.disableFilter) continue;
      const set = new Set<string>();
      for (const row of data) {
        const v = asString(col.accessor(row)).trim();
        set.add(v === "" ? "(vazio)" : v);
      }
      m[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    return m;
  }, [data, columns]);

  const filtered = useMemo(() => {
    let out = data;

    // global search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      const keys = globalSearchKeys ?? columns.map((c) => c.key);
      out = out.filter((row) =>
        keys.some((k) => {
          const c = colByKey.get(k);
          if (!c) return false;
          return asString(c.accessor(row)).toLowerCase().includes(q);
        })
      );
    }

    // column funnel filters
    for (const [k, set] of Object.entries(colFilters)) {
      if (!set || set.size === 0) continue;
      const c = colByKey.get(k);
      if (!c) continue;
      out = out.filter((row) => {
        const raw = asString(c.accessor(row)).trim();
        const norm = raw === "" ? "(vazio)" : raw;
        return set.has(norm);
      });
    }

    // advanced rules (AND)
    if (advRules.length > 0) {
      out = out.filter((row) =>
        advRules.every((r) => matchRule(row, r, colByKey.get(r.columnKey)))
      );
    }

    // sort
    if (sort) {
      const c = colByKey.get(sort.key);
      if (c) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const va = c.accessor(a);
          const vb = c.accessor(b);
          if (c.type === "number") {
            const na = asNumber(va), nb = asNumber(vb);
            if (na === null && nb === null) return 0;
            if (na === null) return 1;
            if (nb === null) return -1;
            return (na - nb) * dir;
          }
          return asString(va).localeCompare(asString(vb), "pt-BR") * dir;
        });
      }
    }

    return out;
  }, [data, globalSearch, globalSearchKeys, colFilters, advRules, sort, columns, colByKey]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const activeFilterCount =
    Object.values(colFilters).filter((s) => s && s.size > 0).length + advRules.length;

  const clearAll = () => {
    setColFilters({});
    setAdvRules([]);
    setGlobalSearch("");
  };

  const toggleSort = (key: string) => {
    setSort((s) =>
      !s || s.key !== key ? { key, dir: "asc" }
      : s.dir === "asc" ? { key, dir: "desc" }
      : null
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showAdv ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAdv((v) => !v)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtros avançados
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
            <X className="w-4 h-4" /> Limpar
          </Button>
        )}
        <span className="text-xs text-muted-foreground sm:ml-2">
          {filtered.length} de {data.length}
        </span>
      </div>

      {/* Advanced filter bar */}
      {showAdv && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          {advRules.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma regra. Adicione condições combinadas (E).
            </p>
          )}
          {advRules.map((rule) => {
            const col = colByKey.get(rule.columnKey);
            const ops = col?.type === "number" ? NUM_OPS : TEXT_OPS;
            const needsValue = !["is_empty", "is_not_empty"].includes(rule.operator);
            return (
              <div key={rule.id} className="flex flex-wrap items-center gap-2">
                <Select
                  value={rule.columnKey}
                  onValueChange={(v) =>
                    setAdvRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, columnKey: v, operator: "contains", value: "", value2: "" } : r))
                  }
                >
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.filter((c) => !c.disableFilter).map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.operator}
                  onValueChange={(v: Operator) =>
                    setAdvRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, operator: v } : r))
                  }
                >
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ops.map((op) => (
                      <SelectItem key={op.v} value={op.v}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsValue && (
                  <Input
                    className="w-40 h-9"
                    placeholder="valor"
                    value={rule.value}
                    onChange={(e) => setAdvRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, value: e.target.value } : r))}
                  />
                )}
                {rule.operator === "between" && (
                  <Input
                    className="w-40 h-9"
                    placeholder="e"
                    value={rule.value2 ?? ""}
                    onChange={(e) => setAdvRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, value2: e.target.value } : r))}
                  />
                )}
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={() => setAdvRules((rs) => rs.filter((r) => r.id !== rule.id))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={() => {
              const first = columns.find((c) => !c.disableFilter);
              if (!first) return;
              setAdvRules((rs) => [...rs, {
                id: Math.random().toString(36).slice(2),
                columnKey: first.key,
                operator: first.type === "number" ? "equals" : "contains",
                value: "",
              }]);
            }}
          >
            <Plus className="w-4 h-4" /> Adicionar regra
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const selected = colFilters[col.key];
                const hasFilter = selected && selected.size > 0;
                const allValues = distinctValues[col.key] ?? [];
                const search = colSearch[col.key] ?? "";
                const visibleVals = allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
                return (
                  <TableHead
                    key={col.key}
                    style={col.width ? { minWidth: col.width, width: col.width } : undefined}
                    className="whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={col.disableSort}
                        onClick={() => !col.disableSort && toggleSort(col.key)}
                        className={cn(
                          "flex items-center gap-1 font-semibold text-foreground",
                          !col.disableSort && "hover:text-primary"
                        )}
                      >
                        {col.header}
                        {!col.disableSort && (
                          sort?.key === col.key
                            ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                            : <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                      {!col.disableFilter && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "p-1 rounded hover:bg-muted",
                                hasFilter ? "text-primary" : "text-muted-foreground"
                              )}
                              title="Filtrar"
                            >
                              <Filter className="w-3.5 h-3.5" fill={hasFilter ? "currentColor" : "none"} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <Input
                              placeholder="Buscar valores..."
                              value={search}
                              onChange={(e) => setColSearch((s) => ({ ...s, [col.key]: e.target.value }))}
                              className="h-8 mb-2"
                            />
                            <div className="flex items-center justify-between text-xs mb-1">
                              <button
                                className="text-primary hover:underline"
                                onClick={() => setColFilters((f) => ({ ...f, [col.key]: new Set(visibleVals) }))}
                              >
                                Selecionar todos
                              </button>
                              <button
                                className="text-muted-foreground hover:underline"
                                onClick={() => setColFilters((f) => ({ ...f, [col.key]: new Set() }))}
                              >
                                Limpar
                              </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-1">
                              {visibleVals.map((v) => {
                                const checked = selected?.has(v) ?? false;
                                return (
                                  <label key={v} className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-muted rounded text-sm">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(c) => {
                                        setColFilters((f) => {
                                          const next = new Set(f[col.key] ?? []);
                                          if (c) next.add(v); else next.delete(v);
                                          return { ...f, [col.key]: next };
                                        });
                                      }}
                                    />
                                    <span className="truncate">{v}</span>
                                  </label>
                                );
                              })}
                              {visibleVals.length === 0 && (
                                <p className="text-xs text-muted-foreground p-2">Sem valores</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableHead>
                );
              })}
              {rowActions && <TableHead className="w-24 sticky right-0 bg-secondary"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (rowActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (rowActions ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      style={col.width ? { minWidth: col.width, width: col.width } : undefined}
                      className="align-middle"
                    >
                      {col.render ? col.render(row) : (asString(col.accessor(row)) || <span className="text-muted-foreground">—</span>)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="sticky right-0 bg-card">
                      {rowActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((c) => c + pageSize)}>
            Carregar mais ({filtered.length - visibleCount} restantes)
          </Button>
        </div>
      )}
    </div>
  );
}
