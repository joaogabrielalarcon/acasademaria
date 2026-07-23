import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { TopBar } from "./TopBar";
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

      {/* Desktop Top Bar (bell + quick actions) */}
      <TopBar />

      {/* Main Content */}
      <main className={cn("min-h-screen transition-all duration-300", "pt-14 lg:pt-0", "lg:pl-60")}>
        <div className="w-full px-3 py-4 lg:px-5 lg:py-5">{children}</div>
      </main>
    </div>
  );
}
