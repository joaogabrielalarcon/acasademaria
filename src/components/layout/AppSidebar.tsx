import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { 
  Users, 
  UserCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Leaf,
  Package,
  Truck,
  Tags,
  Settings,
  ChevronDown,
  Building2,
  Shield,
  Wrench,
  BookOpen,
  CalendarDays,
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
import { useAuth, useHighestRole, type AppRole } from "@/hooks/useAuth";

const allNavigationItems = [
  {
    title: "Clientes",
    icon: Users,
    href: "/clientes",
    roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] as AppRole[],
  },
  {
    title: "Equipe",
    icon: UserCircle,
    href: "/equipe",
    roles: ["admin", "administrativo", "gestao_campo"] as AppRole[],
  },
  {
    title: "Calendário",
    icon: CalendarDays,
    href: "/calendario",
    roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] as AppRole[],
  },
  {
    title: "Plantas",
    icon: Leaf,
    href: "/plantas",
    roles: ["admin", "administrativo", "arquitetura"] as AppRole[],
  },
  {
    title: "Produtos e Insumos",
    icon: Package,
    href: "/insumos",
    roles: ["admin", "administrativo", "gestao_campo"] as AppRole[],
  },
  {
    title: "Fornecedores",
    icon: Truck,
    href: "/fornecedores",
    roles: ["admin", "administrativo", "gestao_campo"] as AppRole[],
  },
  {
    title: "Máquinas",
    icon: Wrench,
    href: "/maquinas",
    roles: ["admin", "administrativo", "gestao_campo"] as AppRole[],
  },
  {
    title: "Processos Internos",
    icon: BookOpen,
    href: "/processos",
    roles: ["admin", "administrativo"] as AppRole[],
  },
];

const configItems = [
  {
    title: "Áreas Internas",
    icon: Building2,
    href: "/areas",
    roles: ["admin"] as AppRole[],
  },
  {
    title: "Gestão de Usuários",
    icon: Shield,
    href: "/acessos",
    roles: ["admin"] as AppRole[],
  },
  {
    title: "Categorias de Plantas",
    icon: Tags,
    href: "/categorias-plantas",
    roles: ["admin"] as AppRole[],
  },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const userRole = useHighestRole(user?.id);

  // Filtra itens de navegação baseado no perfil do usuário
  const visibleNavigationItems = allNavigationItems.filter(
    item => item.roles.includes(userRole)
  );

  const visibleConfigItems = configItems.filter(
    item => item.roles.includes(userRole)
  );

  // Auto-expand config if current route is inside
  const isConfigActive = visibleConfigItems.some(
    item => location.pathname === item.href || location.pathname.startsWith(item.href)
  );

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderNavItem = (item: typeof allNavigationItems[0], isSubItem = false) => {
    const isActive = location.pathname === item.href || 
      (item.href !== "/" && location.pathname.startsWith(item.href));
    
    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg transition-all duration-200",
          isSubItem ? "px-3 py-2 text-sm" : "px-3 py-2.5",
          isActive 
            ? "bg-secondary text-foreground font-bold" 
            : "text-foreground hover:bg-secondary/50"
        )}
      >
        <item.icon className={cn("flex-shrink-0", isSubItem ? "w-4 h-4" : "w-5 h-5")} />
        {!collapsed && (
          <span className="font-medium text-sm">{item.title}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <li key={item.title}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              {item.title}
            </TooltipContent>
          </Tooltip>
        </li>
      );
    }

    return <li key={item.title}>{linkContent}</li>;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Logo */}
      <Link to="/" className={cn(
        "flex items-center justify-center py-6 border-b border-sidebar-border hover:bg-secondary/50 transition-colors cursor-pointer",
        collapsed ? "px-2" : "px-4"
      )}
        onClick={(e) => {
          e.preventDefault();
          window.location.href = "/";
        }}
      >
        <Logo variant={collapsed ? "icon" : "compact"} />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleNavigationItems.map((item) => renderNavItem(item))}
        </ul>

        {/* Configurações Collapsible Section - apenas para admin */}
        {visibleConfigItems.length > 0 && (
          <div className="mt-6 px-2">
            <Collapsible 
              open={collapsed ? false : (configOpen || isConfigActive)} 
              onOpenChange={setConfigOpen}
            >
              {collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/areas"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        isConfigActive 
                          ? "bg-secondary text-foreground font-bold" 
                          : "text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <Settings className="w-5 h-5 flex-shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    Configurações
                  </TooltipContent>
                </Tooltip>
              ) : (
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200",
                      isConfigActive 
                        ? "bg-secondary/50 text-foreground" 
                        : "text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium text-sm">Configurações</span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        (configOpen || isConfigActive) && "rotate-180"
                      )} 
                    />
                  </button>
                </CollapsibleTrigger>
              )}
              
              <CollapsibleContent className="mt-1">
                <ul className="space-y-1 pl-4">
                  {visibleConfigItems.map((item) => renderNavItem(item, true))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-foreground/70 hover:text-foreground hover:bg-secondary/50 mb-2"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 w-full justify-center">
              <ChevronLeft className="w-4 h-4" />
              {!collapsed && <span className="text-xs">Recolher</span>}
            </div>
          )}
        </Button>

        {/* User Info */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-secondary/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user?.email?.split('@')[0] || "Usuário"}</p>
              <p className="text-xs text-foreground/60 truncate">{user?.email || "Não logado"}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="text-foreground/50 hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
