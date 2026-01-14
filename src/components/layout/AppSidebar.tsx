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
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  {
    title: "Clientes",
    icon: Users,
    href: "/",
  },
  {
    title: "Equipe",
    icon: UserCircle,
    href: "/equipe",
  },
];

const cadastrosItems = [
  {
    title: "Plantas",
    icon: Leaf,
    href: "/plantas",
  },
  {
    title: "Produtos e Insumos",
    icon: Package,
    href: "/insumos",
  },
  {
    title: "Fornecedores",
    icon: Truck,
    href: "/fornecedores",
  },
  {
    title: "Categorias de Plantas",
    icon: Tags,
    href: "/categorias-plantas",
  },
];

const configItems = [
  {
    title: "Áreas",
    icon: Building2,
    href: "/areas",
  },
];

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
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
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
            
            const linkContent = (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
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
          })}
        </ul>

        {/* Cadastros Section */}
        {!collapsed && (
          <div className="mt-6 px-2">
            <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Cadastros
            </p>
          </div>
        )}
        <ul className="space-y-1 px-2">
          {cadastrosItems.map((item) => {
            const isActive = location.pathname === item.href || 
              location.pathname.startsWith(item.href);
            
            const linkContent = (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
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
          })}
        </ul>

        {/* Configurações Section */}
        {!collapsed && (
          <div className="mt-6 px-2">
            <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Configurações
            </p>
          </div>
        )}
        <ul className="space-y-1 px-2">
          {configItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            const linkContent = (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
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
          })}
        </ul>
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
