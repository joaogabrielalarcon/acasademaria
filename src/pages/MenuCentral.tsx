import { Link } from "react-router-dom";
import { 
  Users, 
  UserCircle, 
  Leaf, 
  Package, 
  Truck, 
  Wrench, 
  Settings,
  ChevronRight
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Logo } from "@/components/Logo";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "gestor" | "operador";

const menuItems = [
  { title: "Clientes", description: "Gerenciar clientes e perfis", icon: Users, href: "/", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Equipe", description: "Colaboradores e equipes", icon: UserCircle, href: "/equipe", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Plantas", description: "Catálogo de plantas", icon: Leaf, href: "/plantas", roles: ["admin"] as UserRole[] },
  { title: "Produtos e Insumos", description: "Materiais e insumos", icon: Package, href: "/insumos", roles: ["admin"] as UserRole[] },
  { title: "Fornecedores", description: "Cadastro de fornecedores", icon: Truck, href: "/fornecedores", roles: ["admin"] as UserRole[] },
  { title: "Máquinas", description: "Equipamentos e manutenção", icon: Wrench, href: "/maquinas", roles: ["admin"] as UserRole[] },
  { title: "Configurações do Sistema", description: "Áreas, acessos e categorias", icon: Settings, href: "/areas", roles: ["admin"] as UserRole[] },
];

export default function MenuCentral() {
  const { user } = useAuth();
  const { data: userRoles = [] } = useUserRoles(user?.id);

  const getUserHighestRole = (): UserRole => {
    if (userRoles.length === 0) return "admin";
    if (userRoles.some(r => r.role === "admin")) return "admin";
    if (userRoles.some(r => r.role === "gestor")) return "gestor";
    return "operador";
  };

  const userRole = getUserHighestRole();
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <AppLayout>
      <div className="flex flex-col items-center gap-8 py-4">
        <div className="text-center space-y-2">
          <Logo variant="compact" className="max-w-[160px] mx-auto" />
          <h1 className="text-2xl font-semibold text-foreground font-serif">Menu Principal</h1>
          <p className="text-sm text-muted-foreground">Acesse todas as funcionalidades do sistema</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-3xl">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl",
                "bg-card border border-border",
                "hover:bg-secondary hover:shadow-md hover:scale-[1.02]",
                "transition-all duration-200 text-center group"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
