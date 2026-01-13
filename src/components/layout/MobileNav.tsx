import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  UserCircle,
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";

const navigationItems = [
  { title: "Timeline", icon: LayoutDashboard, href: "/" },
  { title: "Clientes", icon: Users, href: "/clientes" },
  { title: "Trechos", icon: MapPin, href: "/trechos" },
  { title: "Equipe", icon: UserCircle, href: "/equipe" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full text-creme">
      {/* Logo */}
      <div className="flex items-center justify-center py-6 border-b border-sidebar-border">
        <Logo variant="compact" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-3">
          {navigationItems.map((item) => {
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
                        ? "bg-sidebar-accent text-creme" 
                        : "text-creme/70 hover:bg-sidebar-accent/50 hover:text-creme"
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
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/30">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-terracota" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">Usuário</p>
            <p className="text-sm text-creme/60 truncate">Admin</p>
          </div>
          <Button variant="ghost" size="icon-sm" className="text-creme/50 hover:text-creme">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
