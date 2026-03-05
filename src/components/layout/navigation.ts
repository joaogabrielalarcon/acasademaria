import {
  BellRing,
  BookOpen,
  Building2,
  CalendarDays,
  Leaf,
  Package,
  Settings,
  Shield,
  Tags,
  Truck,
  UserCircle,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

export interface NavigationItem {
  title: string;
  icon: LucideIcon;
  href: string;
  roles: AppRole[];
}

export const appNavigationItems: NavigationItem[] = [
  { title: "Clientes", icon: Users, href: "/clientes", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] },
  { title: "Equipe", icon: UserCircle, href: "/equipe", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Calendário", icon: CalendarDays, href: "/calendario", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] },
  { title: "Plantas", icon: Leaf, href: "/plantas", roles: ["admin", "administrativo", "arquitetura"] },
  { title: "Produtos e Insumos", icon: Package, href: "/insumos", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Fornecedores", icon: Truck, href: "/fornecedores", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Máquinas", icon: Wrench, href: "/maquinas", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Processos Internos", icon: BookOpen, href: "/processos", roles: ["admin", "administrativo"] },
];

export const configNavigationItems: NavigationItem[] = [
  { title: "Áreas Internas", icon: Building2, href: "/areas", roles: ["admin"] },
  { title: "Gestão de Usuários", icon: Shield, href: "/acessos", roles: ["admin"] },
  { title: "Categorias de Plantas", icon: Tags, href: "/categorias-plantas", roles: ["admin"] },
];

export const alertNavigationItem: NavigationItem = {
  title: "Alertas pendentes",
  icon: BellRing,
  href: "/",
  roles: ["admin", "gestao_campo"],
};
