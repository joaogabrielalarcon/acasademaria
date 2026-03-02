import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Users, 
  UserCircle,
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
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { useState } from "react";

type UserRole = "admin" | "gestor" | "operador";

const allNavigationItems = [
  { title: "Clientes", icon: Users, href: "/", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Equipe", icon: UserCircle, href: "/equipe", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Plantas", icon: Leaf, href: "/plantas", roles: ["admin"] as UserRole[] },
  { title: "Produtos e Insumos", icon: Package, href: "/insumos", roles: ["admin"] as UserRole[] },
  { title: "Fornecedores", icon: Truck, href: "/fornecedores", roles: ["admin"] as UserRole[] },
  { title: "Máquinas", icon: Wrench, href: "/maquinas", roles: ["admin"] as UserRole[] },
];

const configItems = [
  { title: "Áreas Internas", icon: Building2, href: "/areas", roles: ["admin"] as UserRole[] },
  { title: "Controle de Acessos", icon: Shield, href: "/acessos", roles: ["admin"] as UserRole[] },
  { title: "Categorias de Plantas", icon: Tags, href: "/categorias-plantas", roles: ["admin"] as UserRole[] },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: userRoles = [] } = useUserRoles(user?.id);
  const [configOpen, setConfigOpen] = useState(false);

  const getUserHighestRole = (): UserRole => {
    if (userRoles.length === 0) return "admin";
    if (userRoles.some(r => r.role === "admin")) return "admin";
    if (userRoles.some(r => r.role === "gestor")) return "gestor";
    return "operador";
  };

  const userRole = getUserHighestRole();

  const visibleNavigationItems = allNavigationItems.filter(item => item.roles.includes(userRole));
  const visibleConfigItems = configItems.filter(item => item.roles.includes(userRole));

  const isConfigActive = visibleConfigItems.some(
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
    </div>
  );
}
