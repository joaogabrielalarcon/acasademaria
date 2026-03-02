import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCircle,
  Leaf,
  Package,
  Truck,
  Wrench,
  Settings,
  BookOpen,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, useProfile, useUserRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AssistenteChat } from "@/components/AssistenteChat";
import floraAvatar from "@/assets/flora-avatar.png";

type UserRole = "admin" | "gestor" | "operador";

const menuItems = [
  { title: "Clientes", description: "Gerenciar clientes e perfis", icon: Users, href: "/clientes", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Equipe", description: "Colaboradores e equipes", icon: UserCircle, href: "/equipe", roles: ["admin", "gestor", "operador"] as UserRole[] },
  { title: "Plantas", description: "Catálogo de plantas", icon: Leaf, href: "/plantas", roles: ["admin"] as UserRole[] },
  { title: "Produtos e Insumos", description: "Materiais e insumos", icon: Package, href: "/insumos", roles: ["admin"] as UserRole[] },
  { title: "Fornecedores", description: "Cadastro de fornecedores", icon: Truck, href: "/fornecedores", roles: ["admin"] as UserRole[] },
  { title: "Máquinas", description: "Equipamentos e manutenção", icon: Wrench, href: "/maquinas", roles: ["admin"] as UserRole[] },
  { title: "Processos Internos", description: "Documentação de processos", icon: BookOpen, href: "/processos", roles: ["admin", "gestor"] as UserRole[] },
  { title: "Configurações do Sistema", description: "Áreas, acessos e categorias", icon: Settings, href: "/areas", roles: ["admin"] as UserRole[] },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function MenuCentral() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: userRoles = [] } = useUserRoles(user?.id);

  const getUserHighestRole = (): UserRole => {
    if (userRoles.length === 0) return "admin";
    if (userRoles.some(r => r.role === "admin")) return "admin";
    if (userRoles.some(r => r.role === "gestor")) return "gestor";
    return "operador";
  };

  const userRole = getUserHighestRole();
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));
  const firstName = profile?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário";

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 py-4">
        {/* Greeting + Chat */}
        <div className="card-botanical p-8 max-w-3xl mx-auto w-full">
          <h1 className="text-2xl font-semibold text-foreground font-serif mb-6">
            {getGreeting()}, {firstName}! 👋🌳
          </h1>

          <p className="text-base text-muted-foreground text-center mb-6">Em que posso te ajudar?</p>

          <div className="flex flex-col items-center mb-6">
            <img src={floraAvatar} alt="Flora" className="w-40 h-40 rounded-full object-cover object-top shadow-md mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-md">
              Eu sou a <span className="font-semibold text-foreground">Flora</span>, assistente virtual da Maria Fernanda Marques — Paisagismo e Soluções Ambientais. Me conte como posso te ajudar!
            </p>
          </div>
          
          <AssistenteChat userName={firstName} userRole={userRole} />
        </div>

        {/* Menu Grid */}
        <div className="max-w-3xl mx-auto w-full">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Módulos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
      </div>
    </AppLayout>
  );
}
