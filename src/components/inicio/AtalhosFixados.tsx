import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, GitBranch, CalendarDays, FileText, Pin } from "lucide-react";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { Button } from "@/components/ui/button";

const DEFAULT = [
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "CRM", href: "/crm", icon: GitBranch },
  { title: "Calendário", href: "/calendario", icon: CalendarDays },
  { title: "Orçamentos", href: "/orcamentos", icon: FileText },
];

export function AtalhosFixados() {
  return (
    <SurfaceCard padded>
      <SurfaceCardHeader
        label="Fixados"
        action={
          <Button variant="ghost" size="sm" disabled className="gap-1.5 text-[12px]">
            <Pin className="w-3.5 h-3.5" /> Personalizar
          </Button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {DEFAULT.map((a) => (
          <motion.div key={a.href} whileHover={{ scale: 1.02 }} transition={{ duration: 0.12 }}>
            <Link
              to={a.href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-surface-elevated hover:shadow-e2 transition-shadow"
            >
              <div className="w-9 h-9 rounded-full bg-navy-soft text-accent flex items-center justify-center">
                <a.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[12px] font-medium text-foreground text-center leading-tight">
                {a.title}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </SurfaceCard>
  );
}
