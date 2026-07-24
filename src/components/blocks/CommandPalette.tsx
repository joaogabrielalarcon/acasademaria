import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Users, Briefcase, User, Calendar, Home, BarChart3, ShoppingCart, DollarSign, FileText, GitBranch, Wrench, Building2, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const NAV_ITEMS = [
  { group: "Navegação", label: "Início", icon: Home, href: "/agenda" },
  { group: "Navegação", label: "Menu Central", icon: LayoutGrid, href: "/" },
  { group: "Navegação", label: "Clientes", icon: Users, href: "/clientes" },
  { group: "Navegação", label: "Equipe", icon: User, href: "/equipe" },
  { group: "Navegação", label: "Calendário", icon: Calendar, href: "/calendario" },
  { group: "Navegação", label: "Máquinas", icon: Wrench, href: "/maquinas" },
  { group: "Comercial", label: "CRM", icon: GitBranch, href: "/crm" },
  { group: "Comercial", label: "Orçamentos", icon: FileText, href: "/orcamentos" },
  { group: "Compras", label: "Fornecedores", icon: ShoppingCart, href: "/compras?tab=fornecedores" },
  { group: "Compras", label: "Plantas", icon: ShoppingCart, href: "/compras?tab=plantas" },
  { group: "Compras", label: "Insumos", icon: ShoppingCart, href: "/compras?tab=insumos" },
  { group: "Financeiro", label: "A Receber", icon: DollarSign, href: "/financeiro/a-receber" },
  { group: "Financeiro", label: "Movimentações", icon: DollarSign, href: "/financeiro/movimentacoes" },
  { group: "Financeiro", label: "Conciliação", icon: DollarSign, href: "/conciliacao" },
  { group: "Gestão", label: "Indicadores", icon: BarChart3, href: "/indicadores" },
  { group: "Gestão", label: "Processos Internos", icon: Briefcase, href: "/processos" },
  { group: "Gestão", label: "Áreas Internas", icon: Building2, href: "/areas" },
  { group: "Ações", label: "Design System", icon: LayoutGrid, href: "/design-system" },
];

/**
 * CommandPalette (cmdk) — Cmd/Ctrl+K.
 * Fase 1: navegação por rotas agrupadas.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const grouped = React.useMemo(() => {
    const acc: Record<string, typeof NAV_ITEMS> = {};
    NAV_ITEMS.forEach((i) => { (acc[i.group] ??= []).push(i); });
    return acc;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-[640px] bg-popover shadow-e3 border-0 overflow-hidden [&>button.absolute]:hidden"
      >
        <Command className="[&_[cmdk-input]]:h-14 [&_[cmdk-input]]:px-5 [&_[cmdk-input]]:text-[15px] [&_[cmdk-input]]:border-b [&_[cmdk-input]]:border-border [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:w-full [&_[cmdk-input]]:font-sans">
          <Command.Input placeholder="Buscar clientes, negócios, ações..." />
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-[13px] text-muted-foreground">
              Nada encontrado.
            </Command.Empty>
            {Object.entries(grouped).map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:type-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
              >
                {items.map((it) => (
                  <Command.Item
                    key={it.href}
                    value={`${group} ${it.label}`}
                    onSelect={() => {
                      navigate(it.href);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] text-foreground cursor-pointer",
                      "data-[selected=true]:bg-primary-soft data-[selected=true]:text-primary"
                    )}
                  >
                    <it.icon className="w-4 h-4 opacity-70" />
                    <span>{it.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Navegar</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans">↵</kbd>
              <span>abrir</span>
              <span className="mx-2">·</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans">Esc</kbd>
              <span>fechar</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Hook global: Cmd/Ctrl+K abre a paleta. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
