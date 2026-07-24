import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, useHighestRole } from "@/hooks/useAuth";
import {
  navigationGroups,
  comprasNavigationItems,
  financeiroNavigationItems,
  configNavigationItems,
  type NavigationItem,
} from "@/components/layout/navigation";

type Grupo = { label: string; items: NavigationItem[] };

/** Launcher de Áreas — agrupado por hierarquia (igual à sidebar) + busca. */
export function AreasLauncher() {
  const { user } = useAuth();
  const role = useHighestRole(user?.id);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const grupos: Grupo[] = useMemo(() => {
    const fromNav: Grupo[] = navigationGroups
      .filter((g) => g.label)
      .map((g) => ({
        label: g.label!,
        items: g.items.filter((i) => i.roles.includes(role) && i.href !== "/agenda"),
      }));

    const extras: Grupo[] = [
      { label: "Compras", items: comprasNavigationItems.filter((i) => i.roles.includes(role)) },
      { label: "Financeiro", items: financeiroNavigationItems.filter((i) => i.roles.includes(role)) },
      { label: "Gestão", items: configNavigationItems.filter((i) => i.roles.includes(role)) },
    ];

    const merged: Record<string, NavigationItem[]> = {};
    [...fromNav, ...extras].forEach((g) => {
      if (!merged[g.label]) merged[g.label] = [];
      g.items.forEach((it) => {
        if (!merged[g.label].some((x) => x.href === it.href)) merged[g.label].push(it);
      });
    });

    const order = ["Operação", "Comercial", "Compras", "Financeiro", "Gestão"];
    return order
      .filter((l) => merged[l]?.length)
      .map((l) => ({ label: l, items: merged[l] }));
  }, [role]);

  const filtrados: Grupo[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return grupos;
    return grupos
      .map((g) => ({ ...g, items: g.items.filter((i) => i.title.toLowerCase().includes(term)) }))
      .filter((g) => g.items.length);
  }, [grupos, q]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
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

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-2">
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
            className="absolute right-0 z-30 mt-2 w-[min(94vw,720px)] rounded-lg bg-card shadow-e3 p-3"
          >
            {/* Busca */}
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-md bg-surface-sunken">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar área…"
                className="flex-1 bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <motion.div
              className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.02 } } }}
            >
              {filtrados.map((g) => (
                <div key={g.label}>
                  <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {g.label}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {g.items.map((item) => (
                      <motion.div
                        key={item.href}
                        variants={{
                          hidden: { opacity: 0, scale: 0.92 },
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
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-lg h-full text-center",
                            "hover:bg-surface-sunken transition-colors",
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-navy-soft text-accent flex items-center justify-center">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <p className="text-[12px] font-medium text-foreground leading-tight">
                            {item.title}
                          </p>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
              {filtrados.length === 0 && (
                <p className="text-[13px] text-muted-foreground text-center py-8">
                  Nenhuma área encontrada.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
