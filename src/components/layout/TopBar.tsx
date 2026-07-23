import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertasPendentesDialog } from "@/components/diario/AlertasPendentesDialog";
import { useAuth, useHighestRole } from "@/hooks/useAuth";
import { usePendingDiarioAlertas } from "@/hooks/useDiarioAlertas";
import { alertNavigationItem } from "./navigation";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { user } = useAuth();
  const role = useHighestRole(user?.id);
  const canAccessAlerts = alertNavigationItem.roles.includes(role);
  const { data: pendingAlerts = [] } = usePendingDiarioAlertas(canAccessAlerts);
  const count = pendingAlerts.length;

  return (
    <>
      <div className="hidden lg:flex fixed top-3 right-4 z-40 items-center gap-2">
        {canAccessAlerts && (
          <button
            onClick={() => setAlertsOpen(true)}
            aria-label="Alertas pendentes"
            className="relative h-9 w-9 rounded-full bg-card hover:bg-foreground/5 border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors shadow-subtle"
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {count > 0 && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1",
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        )}
        <Button variant="ghost" size="icon-sm" asChild className="text-foreground/70 hover:text-foreground">
          <Link to="/registros/novo" aria-label="Novo registro">
            <Plus className="w-5 h-5" />
          </Link>
        </Button>
      </div>
      <AlertasPendentesDialog open={alertsOpen} onOpenChange={setAlertsOpen} />
    </>
  );
}
