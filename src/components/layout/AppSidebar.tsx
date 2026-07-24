import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  Settings,
  ChevronDown,
  DollarSign,
  Lock,
  UserCircle,
  MoreVertical,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth, useHighestRole } from "@/hooks/useAuth";
import {
  navigationGroups,
  comprasNavigationItems,
  comprasIcon as ComprasIcon,
  configNavigationItems,
  financeiroNavigationItems,
  type NavigationItem,
} from "./navigation";
import { useSidebarPinned, setSidebarPinned } from "@/lib/sidebar-store";

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pinned = useSidebarPinned();
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  const collapsed = !expanded;

  const [configOpen, setConfigOpen] = useState(false);
  const [financeiroOpen, setFinanceiroOpen] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userRole = useHighestRole(user?.id);

  const visibleConfigItems = configNavigationItems.filter((i) => i.roles.includes(userRole));
  const visibleFinanceiroItems = financeiroNavigationItems.filter((i) => i.roles.includes(userRole));
  const visibleComprasItems = comprasNavigationItems.filter((i) => i.roles.includes(userRole));

  const isComprasActive = location.pathname.startsWith("/compras");
  const isFinanceiroActive = visibleFinanceiroItems.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href),
  );
  const isConfigActive = visibleConfigItems.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href),
  );

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isItemActive = (item: NavigationItem) => {
    if (item.href.includes("?")) return location.pathname + location.search === item.href;
    if (item.href === "/") return location.pathname === "/";
    return location.pathname === item.href || location.pathname.startsWith(item.href + "/");
  };

  const renderNavItem = (item: NavigationItem, opts?: { subItem?: boolean }) => {
    const active = isItemActive(item);
    const isSub = opts?.subItem;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "relative flex items-center rounded-md transition-colors duration-150 h-10",
          collapsed ? "justify-center px-0" : "gap-3 px-3",
          isSub && "h-9 text-[13px]",
          active
            ? "text-primary font-semibold"
            : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
        )}
        style={active ? { backgroundColor: "hsl(var(--primary-soft) / 0.10)" } : undefined}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-primary"
          />
        )}
        <item.icon className={cn("flex-shrink-0", isSub ? "w-4 h-4" : "w-[18px] h-[18px]")} />
        {!collapsed && (
          <span className="text-[14px] font-medium whitespace-nowrap transition-opacity duration-150">
            {item.title}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <li key={item.title}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right" className="ml-2">{item.title}</TooltipContent>
          </Tooltip>
        </li>
      );
    }
    return <li key={item.title}>{linkContent}</li>;
  };

  const GroupLabel = ({ label }: { label: string }) =>
    collapsed ? (
      <div className="mt-4 mb-1 mx-2 h-px bg-border/60" />
    ) : (
      <div className="mt-5 mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    );

  const userName = user?.email?.split("@")[0] || "Usuário";

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-[width] duration-200 ease-out z-40",
        expanded ? "w-60 shadow-e2" : "w-14",
        className,
      )}
    >
      {/* Logo → Início */}
      <Link
        to="/"
        className={cn(
          "flex items-center py-6 border-b border-sidebar-border hover:bg-foreground/5 transition-colors",
          collapsed ? "px-2 justify-center" : "px-4",
        )}
      >
        <Logo variant={collapsed ? "icon" : "compact"} />
      </Link>


      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navigationGroups.map((group, gi) => {
          const items = group.items.filter((i) => i.roles.includes(userRole));
          if (!items.length) return null;
          return (
            <div key={gi}>
              {group.label && <GroupLabel label={group.label} />}
              <ul className="space-y-0.5 px-2">
                {items.map((item) => renderNavItem(item))}
              </ul>
            </div>
          );
        })}

        {visibleComprasItems.length > 0 && (
          <>
            <GroupLabel label="Compras" />
            <div className="px-2">
              <Collapsible
                open={collapsed ? false : comprasOpen || isComprasActive}
                onOpenChange={setComprasOpen}
              >
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        to="/compras"
                        className={cn(
                          "flex items-center justify-center h-10 rounded-md transition-colors",
                          isComprasActive ? "text-primary" : "text-foreground/80 hover:bg-foreground/5",
                        )}
                        style={isComprasActive ? { backgroundColor: "hsl(var(--primary-soft) / 0.10)" } : undefined}
                      >
                        <ComprasIcon className="w-[18px] h-[18px]" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">Compras</TooltipContent>
                  </Tooltip>
                ) : (
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full h-10 px-3 rounded-md transition-colors",
                        isComprasActive
                          ? "text-primary font-semibold"
                          : "text-foreground/80 hover:bg-foreground/5",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ComprasIcon className="w-[18px] h-[18px]" />
                        <span className="text-[14px] font-medium">Compras</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          (comprasOpen || isComprasActive) && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent className="mt-1">
                  <ul className="space-y-0.5 pl-6 pr-2">
                    {visibleComprasItems.map((item) => renderNavItem(item, { subItem: true }))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}

        {visibleFinanceiroItems.length > 0 && (
          <>
            <GroupLabel label="Financeiro" />
            <div className="px-2">
              <Collapsible
                open={collapsed ? false : financeiroOpen || isFinanceiroActive}
                onOpenChange={setFinanceiroOpen}
              >
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        to="/financeiro/a-receber"
                        className={cn(
                          "flex items-center justify-center h-10 rounded-md transition-colors",
                          isFinanceiroActive ? "text-primary" : "text-foreground/80 hover:bg-foreground/5",
                        )}
                      >
                        <DollarSign className="w-[18px] h-[18px]" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">Financeiro</TooltipContent>
                  </Tooltip>
                ) : (
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full h-10 px-3 rounded-md transition-colors",
                        isFinanceiroActive
                          ? "text-primary font-semibold"
                          : "text-foreground/80 hover:bg-foreground/5",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-[18px] h-[18px]" />
                        <span className="text-[14px] font-medium">Financeiro</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          (financeiroOpen || isFinanceiroActive) && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent className="mt-1">
                  <ul className="space-y-0.5 pl-6 pr-2">
                    {visibleFinanceiroItems.map((item) => renderNavItem(item, { subItem: true }))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}

        {visibleConfigItems.length > 0 && (
          <>
            <GroupLabel label="Configurações" />
            <div className="px-2">
              <Collapsible
                open={collapsed ? false : configOpen || isConfigActive}
                onOpenChange={setConfigOpen}
              >
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        to="/areas"
                        className={cn(
                          "flex items-center justify-center h-10 rounded-md transition-colors",
                          isConfigActive ? "text-primary" : "text-foreground/80 hover:bg-foreground/5",
                        )}
                      >
                        <Settings className="w-[18px] h-[18px]" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">Configurações</TooltipContent>
                  </Tooltip>
                ) : (
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full h-10 px-3 rounded-md transition-colors",
                        isConfigActive
                          ? "text-primary font-semibold"
                          : "text-foreground/80 hover:bg-foreground/5",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-[18px] h-[18px]" />
                        <span className="text-[14px] font-medium">Configurações</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          (configOpen || isConfigActive) && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent className="mt-1">
                  <ul className="space-y-0.5 pl-6 pr-2">
                    {visibleConfigItems.map((item) => renderNavItem(item, { subItem: true }))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        )}
      </nav>

      {/* Pin discreto — só quando expandido */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-1 flex justify-end">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSidebarPinned(!pinned)}
                aria-label={pinned ? "Desafixar sidebar" : "Fixar sidebar aberta"}
                aria-pressed={pinned}
                className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                  pinned
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-foreground",
                )}
              >
                {pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[11px]">
              {pinned ? "Desafixar" : "Fixar aberta"}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Footer — usuário */}
      <div className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full h-10 flex items-center justify-center rounded-md hover:bg-foreground/5">
                <UserCircle className="w-5 h-5 text-foreground/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem asChild>
                <Link to="/alterar-senha"><Lock className="w-4 h-4 mr-2" /> Alterar senha</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-foreground/5">
            <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-5 h-5 text-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-foreground capitalize">{userName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email || "—"}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-foreground/50 hover:text-foreground flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/alterar-senha"><Lock className="w-4 h-4 mr-2" /> Alterar senha</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

    </aside>
  );
}
