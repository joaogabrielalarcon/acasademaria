import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chip — pastilha arredondada (full). Diferente de Badge pela densidade e uso navegacional.
 * Usos: filtros, tags de conteúdo, ações leves.
 */
const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors duration-base ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground hover:bg-primary-soft",
        outline: "border border-border text-foreground bg-transparent hover:bg-primary-soft hover:border-primary/40",
        active: "bg-primary text-primary-foreground",
        navy: "bg-navy-soft text-accent",
        ghost: "text-foreground hover:bg-primary-soft",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  asChild?: boolean;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(chipVariants({ variant, className }))} {...props} />
  )
);
Chip.displayName = "Chip";
