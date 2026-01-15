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
  Wrench
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
import { useAuth, useUserRoles } from "@/hooks/useAuth";

// Definição dos perfis de acesso
type UserRole = "admin" | "gestor" | "operador";

// Mapeamento de itens por permissão
// diretoria (admin) = vê tudo
// administrativo (admin) = vê tudo
// gestão de operações (gestor) = só Clientes e Equipe
// operacional (operador) = mesma visão do gestor

const allNavigationItems = [
  {
    title: "Clientes",
    icon: Users,
    href: "/",
    roles: ["admin", "gestor", "operador"] as UserRole[],
  },
  {
    title: "Equipe",
    icon: UserCircle,
    href: "/equipe",
    roles: ["admin", "gestor", "operador"] as UserRole[],
  },
  {
    title: "Plantas",
    icon: Leaf,
    href: "/plantas",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Produtos e Insumos",
    icon: Package,
    href: "/insumos",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Fornecedores",
    icon: Truck,
    href: "/fornecedores",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Máquinas",
    icon: Wrench,
    href: "/maquinas",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Categorias de Plantas",
    icon: Tags,
    href: "/categorias-plantas",
    roles: ["admin"] as UserRole[],
  },
];

const configItems = [
  {
    title: "Áreas Internas",
    icon: Building2,
    href: "/areas",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Controle de Acessos",
    icon: Shield,
    href: "/acessos",
    roles: ["admin"] as UserRole[],
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
  const { data: userRoles = [] } = useUserRoles(user?.id);

  // Determina o maior nível de acesso do usuário
  // Se não há roles definidas, assume admin para não bloquear acesso
  const getUserHighestRole = (): UserRole => {
    if (userRoles.length === 0) return "admin"; // Fallback para admin se sem roles
    if (userRoles.some(r => r.role === "admin")) return "admin";
    if (userRoles.some(r => r.role === "gestor")) return "gestor";
    return "operador";
  };

  const userRole = getUserHighestRole();

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
            ? "bg-sidebar-accent text-sidebar-foreground" 
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
      <div className={cn(
        "flex items-center justify-center py-6 border-b border-sidebar-border",
        collapsed ? "px-2" : "px-4"
      )}>
        <Logo variant={collapsed ? "icon" : "compact"} />
      </div>

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
                          ? "bg-sidebar-accent text-sidebar-foreground" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
                        ? "bg-sidebar-accent/50 text-sidebar-foreground" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
          className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 mb-2"
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
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/30">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email?.split('@')[0] || "Usuário"}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || "Não logado"}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
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
