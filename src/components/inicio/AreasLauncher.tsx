import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, useHighestRole } from "@/hooks/useAuth";
import {
  appNavigationItems,
  comprasNavigationItems,
  financeiroNavigationItems,
  configNavigationItems,
} from "@/components/layout/navigation";

/** Launcher de Áreas — abre em stagger, fecha ao clicar fora. */
export function AreasLauncher() {
  const { user } = useAuth();
  const role = useHighestRole(user?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const all = [
    ...appNavigationItems,
    ...comprasNavigationItems,
    ...financeiroNavigationItems,
    ...configNavigationItems,
  ].filter((it) => it.roles.includes(role) && it.href !== "/agenda" && it.href !== "/");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
      >
        {open ? <X className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        Áreas
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute right-0 z-30 mt-2 w-[min(92vw,640px)] rounded-lg bg-card shadow-e3 p-4"
          >
            <motion.div
              className="grid grid-cols-3 sm:grid-cols-4 gap-3"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.03 } } }}
            >
              {all.map((item) => (
                <motion.div
                  key={item.href}
                  variants={{
                    hidden: { opacity: 0, scale: 0.9 },
                    show: {
                      opacity: 1,
                      scale: 1,
                      transition: { type: "spring", stiffness: 320, damping: 22 },
                    },
                  }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg h-full text-center",
                      "hover:bg-primary-soft transition-colors"
                    )}
                  >
                    <div className="w-11 h-11 rounded-full bg-navy-soft text-accent flex items-center justify-center">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-[13px] font-medium text-foreground leading-tight">
                      {item.title}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
