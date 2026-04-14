import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  UserCircle,
  LogOut,
  Settings,
  ChevronDown,
  DollarSign,
  Lock,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetClose } from "@/components/ui/sheet";
import { AlertasPendentesDialog } from "@/components/diario/AlertasPendentesDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useHighestRole } from "@/hooks/useAuth";
import { usePendingDiarioAlertas } from "@/hooks/useDiarioAlertas";
import { useState } from "react";
import { alertNavigationItem, appNavigationItems, comprasNavigationItems, comprasRoles, configNavigationItems, financeiroNavigationItems } from "./navigation";

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userRole = useHighestRole(user?.id);
  const [configOpen, setConfigOpen] = useState(false);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const canAccessAlerts = alertNavigationItem.roles.includes(userRole);
  const { data: pendingAlerts = [] } = usePendingDiarioAlertas(canAccessAlerts);

  const visibleNavigationItems = appNavigationItems.filter(item => item.roles.includes(userRole));
  const visibleConfigItems = configNavigationItems.filter(item => item.roles.includes(userRole));
  const visibleFinanceiroItems = financeiroNavigationItems.filter(item => item.roles.includes(userRole));

  const isConfigActive = visibleConfigItems.some(
    item => location.pathname === item.href || location.pathname.startsWith(item.href)
  );

  const isFinanceiroActive = visibleFinanceiroItems.some(
    item => location.pathname === item.href || location.pathname.startsWith(item.href)
  );

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full text-foreground">
      {/* Logo */}
      <Link to="/" className="flex items-center justify-center py-6 border-b border-border hover:bg-secondary/50 transition-colors">
        <Logo variant="compact" />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {visibleNavigationItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <li key={item.title}>
                <SheetClose asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-secondary text-foreground font-bold" 
                        : "text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </SheetClose>
              </li>
            );
          })}
        </ul>

        {/* Financeiro */}
        {visibleFinanceiroItems.length > 0 && (
          <div className="mt-4 px-3">
            <Collapsible open={financeiroOpen || isFinanceiroActive} onOpenChange={setFinanceiroOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200",
                    isFinanceiroActive 
                      ? "bg-secondary/50 text-foreground" 
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">Financeiro</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    (financeiroOpen || isFinanceiroActive) && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <ul className="space-y-1 pl-4">
                  {visibleFinanceiroItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.title}>
                        <SheetClose asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isActive 
                                ? "bg-secondary text-foreground font-bold" 
                                : "text-foreground hover:bg-secondary/50"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Configurações */}
        {visibleConfigItems.length > 0 && (
          <div className="mt-6 px-3">
            <Collapsible open={configOpen || isConfigActive} onOpenChange={setConfigOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200",
                    isConfigActive 
                      ? "bg-secondary/50 text-foreground" 
                      : "text-foreground hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Configurações</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    (configOpen || isConfigActive) && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <ul className="space-y-1 pl-4">
                  {visibleConfigItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.title}>
                        <SheetClose asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isActive 
                                ? "bg-secondary text-foreground font-bold" 
                                : "text-foreground hover:bg-secondary/50"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        {canAccessAlerts && (
          <Button variant="outline" className="w-full mb-3 justify-between" onClick={() => setAlertsOpen(true)}>
            <span className="flex items-center gap-2">
              <alertNavigationItem.icon className="w-4 h-4" />
              Alertas pendentes
            </span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {pendingAlerts.length}
            </Badge>
          </Button>
        )}

        <SheetClose asChild>
          <Link to="/alterar-senha" className={cn(buttonVariants({ variant: "outline" }), "w-full mb-3 justify-start")}>
            <Lock className="w-4 h-4" />
            Alterar senha
          </Link>
        </SheetClose>

        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-secondary/50">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-foreground">{user?.email?.split('@')[0] || "Usuário"}</p>
            <p className="text-sm text-foreground/60 truncate">{user?.email || "Não logado"}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            className="text-foreground/50 hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <AlertasPendentesDialog open={alertsOpen} onOpenChange={setAlertsOpen} />
    </div>
  );
}

