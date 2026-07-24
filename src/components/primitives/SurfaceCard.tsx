import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * SurfaceCard — cartão base do sistema com hover tátil (scale + e2→e3).
 * Sempre --card (mais claro que o fundo) + sombra. Sem borda.
 */
type SurfaceCardProps = HTMLMotionProps<"div"> & {
  interactive?: boolean;
  padded?: boolean;
};

export const SurfaceCard = React.forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, interactive, padded = true, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={interactive ? { scale: 1.005, boxShadow: "var(--shadow-e3)" } : undefined}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "bg-card rounded-lg shadow-e2 card-filete",
        padded && "p-5 pl-6",
        interactive && "cursor-pointer",
        className
      )}
      {...props}
    />
  )
);
SurfaceCard.displayName = "SurfaceCard";

/** Header do cartão: label CAPS --muted + ação no canto. */
export function SurfaceCardHeader({
  label,
  action,
  className,
}: { label: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <span className="type-label">{label}</span>
      {action}
    </div>
  );
}
