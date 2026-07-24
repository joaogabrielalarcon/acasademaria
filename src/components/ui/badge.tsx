import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Info estável (marinho)
        default: "border-transparent bg-navy-soft text-accent",
        // Estado ativo (marinho sólido)
        active: "border-transparent bg-accent text-accent-foreground",
        // Contorno
        outline: "border-border text-foreground bg-transparent hover:bg-primary-soft",
        // Fantasma
        secondary: "border-transparent bg-muted text-foreground",
        // Faróis
        ok: "border-transparent bg-ok-soft text-ok",
        warn: "border-transparent bg-warn-soft text-warn",
        attention: "border-transparent bg-attention-soft text-attention",
        danger: "border-transparent bg-danger-soft text-danger",
        destructive: "border-transparent bg-danger-soft text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
