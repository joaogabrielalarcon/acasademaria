import {
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  CalendarDays,
  DollarSign,
  FileText,
  GitBranch,
  Home,
  Landmark,
  Leaf,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  Truck,
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

export interface NavigationGroup {
  label?: string; // sem label = itens soltos no topo
  items: NavigationItem[];
}

// Início (renomeado de "Minha Agenda")
export const inicioNavigationItem: NavigationItem = {
  title: "Início",
  icon: Home,
  href: "/agenda",
  roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra", "operador_campo"],
};

const operacaoItems: NavigationItem[] = [
  { title: "Clientes", icon: Users, href: "/clientes", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] },
  { title: "Equipe", icon: Users, href: "/equipe", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Calendário", icon: CalendarDays, href: "/calendario", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] },
  { title: "Máquinas", icon: Wrench, href: "/maquinas", roles: ["admin", "administrativo", "gestao_campo"] },
];

const comercialItems: NavigationItem[] = [
  { title: "Projetos", icon: GitBranch, href: "/projetos", roles: ["admin", "administrativo", "gestao_campo", "arquitetura"] },
  { title: "Orçamentos", icon: FileText, href: "/orcamentos", roles: ["admin", "administrativo", "gestao_campo"] },
];

const gestaoItems: NavigationItem[] = [
  { title: "Indicadores", icon: BarChart3, href: "/indicadores", roles: ["admin", "administrativo"] },
  { title: "Processos Internos", icon: BookOpen, href: "/processos", roles: ["admin", "administrativo"] },
];

// Grupos ordenados exatamente conforme especificação
export const navigationGroups: NavigationGroup[] = [
  { items: [inicioNavigationItem] },
  { label: "Operação", items: operacaoItems },
  { label: "Comercial", items: comercialItems },
  { label: "Gestão", items: gestaoItems },
];

// Retrocompat (usado por MobileNav e outros)
export const appNavigationItems: NavigationItem[] = [
  inicioNavigationItem,
  ...operacaoItems,
  ...comercialItems,
  ...gestaoItems,
];

export const comprasNavigationItems: NavigationItem[] = [
  { title: "Fornecedores", icon: Truck, href: "/compras?tab=fornecedores", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Produtos e Insumos", icon: Package, href: "/compras?tab=insumos", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Plantas", icon: Leaf, href: "/compras?tab=plantas", roles: ["admin", "administrativo", "arquitetura"] },
  { title: "Estoque", icon: Package, href: "/compras?tab=estoque", roles: ["admin", "administrativo", "gestao_campo"] },
  { title: "Solicitações de Compras", icon: Receipt, href: "/solicitacoes-compras", roles: ["admin", "administrativo", "gestao_campo", "arquitetura", "responsavel_obra"] },
];

export const comprasIcon = ShoppingCart;
export const comprasRoles: AppRole[] = ["admin", "administrativo", "gestao_campo", "arquitetura"];

export const financeiroNavigationItems: NavigationItem[] = [
  { title: "A Receber", icon: Receipt, href: "/financeiro/a-receber", roles: ["admin", "administrativo"] },
  { title: "Movimentações", icon: DollarSign, href: "/financeiro/movimentacoes", roles: ["admin", "administrativo"] },
  { title: "Conciliação", icon: Landmark, href: "/conciliacao", roles: ["admin", "administrativo"] },
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
