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
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-end h-14 px-6 border-b border-border">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/registros/novo">
              <Plus className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
