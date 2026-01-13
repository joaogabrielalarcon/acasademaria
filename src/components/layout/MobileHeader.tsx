import { Menu, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileNav } from "./MobileNav";

export function MobileHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-4 z-50 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-foreground hover:bg-sidebar-accent">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <MobileNav />
        </SheetContent>
      </Sheet>

      <Logo variant="compact" />

      <Button variant="ghost" size="icon-sm" className="text-foreground hover:bg-sidebar-accent" asChild>
        <Link to="/registros/novo">
          <Plus className="w-5 h-5" />
        </Link>
      </Button>
    </header>
  );
}
