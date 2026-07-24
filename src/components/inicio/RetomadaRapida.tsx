import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  GitBranch,
  CalendarDays,
  FileText,
  BarChart3,
  Leaf,
  Wrench,
  Pencil,
  History,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Faixa 2 — retomada rápida.
 *  Fileira compacta: Favoritos (pills) + Continuar trabalhando (mini-cards).
 *  Dados mock por ora, marcados com selo discreto "exemplo".
 */

type Favorito = { title: string; href: string; icon: LucideIcon };

const FAVORITOS: Favorito[] = [
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "CRM", href: "/crm", icon: GitBranch },
  { title: "Calendário", href: "/calendario", icon: CalendarDays },
  { title: "Orçamentos", href: "/orcamentos", icon: FileText },
  { title: "Indicadores", href: "/indicadores", icon: BarChart3 },
  { title: "Plantas", href: "/compras?tab=plantas", icon: Leaf },
];

type Recente = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  href: string;
  when: string;
};

const RECENTES: Recente[] = [
  { id: "r1", title: "Residência Alto de Pinheiros", subtitle: "Projeto · Dario Guarita", icon: Folder, href: "/crm", when: "há 12min" },
  { id: "r2", title: "Juliana Falconi", subtitle: "Cliente", icon: Users, href: "/clientes", when: "há 1h" },
  { id: "r3", title: "Orçamento 2026-042", subtitle: "Cobertura Jardins", icon: FileText, href: "/orcamentos", when: "há 3h" },
  { id: "r4", title: "Escala da semana", subtitle: "Time de campo", icon: CalendarDays, href: "/calendario", when: "ontem" },
  { id: "r5", title: "Manutenção Baroneza", subtitle: "Diário", icon: Wrench, href: "/agenda", when: "ontem" },
];

export function RetomadaRapida() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex flex-col gap-3"
      aria-label="Retomada rápida"
    >
      {/* Favoritos — pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="type-label mr-1">Favoritos</span>
        {FAVORITOS.map((f, idx) => (
          <motion.div
            key={f.href}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03, duration: 0.2 }}
          >
            <Link
              to={f.href}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-full",
                "bg-card border border-border/60 shadow-e1",
                "text-[12.5px] text-foreground/85 hover:text-foreground",
                "hover:shadow-e2 transition-shadow",
              )}
            >
              <f.icon className="w-3.5 h-3.5 text-accent" />
              <span className="whitespace-nowrap">{f.title}</span>
            </Link>
          </motion.div>
        ))}
        <button
          type="button"
          onClick={() =>
            toast("Editar favoritos", {
              description: "Em breve: escolher quais áreas ficam à mão.",
            })
          }
          aria-label="Editar favoritos"
          title="Editar favoritos"
          className="ml-1 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-primary hover:bg-surface-sunken transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Continuar trabalhando — mini-cards */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        <span className="type-label mr-1 shrink-0 inline-flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Continuar
        </span>
        {RECENTES.map((r, idx) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + idx * 0.04, duration: 0.22 }}
            className="shrink-0"
          >
            <Link
              to={r.href}
              className={cn(
                "group flex items-center gap-2.5 h-11 pl-2 pr-3 rounded-lg",
                "bg-card border border-border/60 shadow-e1 hover:shadow-e2",
                "transition-shadow max-w-[240px]",
              )}
            >
              <span className="w-7 h-7 rounded-md bg-navy-soft text-accent flex items-center justify-center shrink-0">
                <r.icon className="w-3.5 h-3.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-medium text-foreground leading-tight truncate">
                  {r.title}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-tight truncate">
                  {r.subtitle} · {r.when}
                </span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
