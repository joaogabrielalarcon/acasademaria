import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "pt-14 lg:pt-0",
        "lg:pl-60"
      )}>
        <div className="container max-w-6xl mx-auto px-4 py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Desktop quick-action button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="hidden lg:flex fixed top-4 right-4 z-40"
        asChild
      >
        <Link to="/registros/novo">
          <Plus className="w-5 h-5" />
        </Link>
      </Button>
    </div>
  );
}