import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { cn } from "@/lib/utils";
import { useSidebarPinned } from "@/lib/sidebar-store";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pinned = useSidebarPinned();
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <MobileHeader />

      <main
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          "pt-14 lg:pt-0",
          pinned ? "lg:pl-60" : "lg:pl-14",
        )}
      >
        <div className="w-full px-3 py-4 lg:px-5 lg:py-5">{children}</div>
      </main>
    </div>
  );
}
