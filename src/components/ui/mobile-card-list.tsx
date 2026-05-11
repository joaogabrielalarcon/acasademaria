import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/ui/list-states";

export interface MobileCardField {
  label?: string;
  value: ReactNode;
  /** when true, hides the row if value is falsy */
  hideIfEmpty?: boolean;
}

export interface MobileCardItem {
  key: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  fields?: MobileCardField[];
  /** primary tap area (whole card) */
  onTap?: () => void;
  /** action buttons row (each min 44px) */
  actions?: ReactNode;
}

interface MobileCardListProps {
  items: MobileCardItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** wrap parent so this only renders <md */
  className?: string;
}

/**
 * Tap-friendly list for mobile/field use.
 * Tap targets ≥44px, single column, no horizontal scroll.
 */
export function MobileCardList({
  items,
  loading,
  emptyTitle = "Nada por aqui",
  emptyDescription = "Nenhum item encontrado.",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  className = "",
}: MobileCardListProps) {
  return (
    <div className={`md:hidden space-y-3 ${className}`}>
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-11"
            inputMode="search"
          />
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const Wrapper: any = it.onTap ? "button" : "div";
            return (
              <li key={it.key}>
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <Wrapper
                    onClick={it.onTap}
                    type={it.onTap ? "button" : undefined}
                    className={`w-full text-left p-4 min-h-[44px] ${
                      it.onTap ? "active:bg-muted/40 transition-colors" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground break-words">
                          {it.title}
                        </div>
                        {it.subtitle && (
                          <div className="text-sm text-muted-foreground mt-0.5 break-words">
                            {it.subtitle}
                          </div>
                        )}
                      </div>
                      {it.badges && <div className="shrink-0">{it.badges}</div>}
                    </div>

                    {it.fields && it.fields.length > 0 && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        {it.fields.map((f, i) => {
                          if (f.hideIfEmpty && !f.value) return null;
                          return (
                            <div key={i} className="min-w-0">
                              {f.label && (
                                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {f.label}
                                </dt>
                              )}
                              <dd className="text-foreground break-words">
                                {f.value || <span className="text-muted-foreground">—</span>}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}
                  </Wrapper>

                  {it.actions && (
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30 [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11 [&_a]:min-w-11">
                      {it.actions}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
