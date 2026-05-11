import { ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton padrão para listagens. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vazio padrão para listagens e seções. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed border-border rounded-lg bg-card/40">
      <div className="text-muted-foreground mb-3">
        {icon ?? <Inbox className="w-10 h-10" />}
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/** Estado de erro padrão. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-destructive/30 rounded-lg bg-destructive/5">
      <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">
        Não foi possível carregar
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {message ?? "Tente novamente em instantes."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Loader2 className="w-3.5 h-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
