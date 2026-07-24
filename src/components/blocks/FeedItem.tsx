import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeedItemProps {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  media?: string[];
  hasIssue?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * FeedItem — linha do feed (M6).
 * Ícone circular navy-soft · título Body 600 · meta Small muted · miniaturas 56 (máx 4+contador) · pino attention-soft.
 */
export function FeedItem({ icon, title, meta, media = [], hasIssue, onClick, className }: FeedItemProps) {
  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;

  return (
    <motion.button
      whileHover={{ x: 2 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-4 rounded-lg p-4 text-left hover:bg-primary-soft transition-colors duration-base ease-smooth",
        className
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-navy-soft text-accent flex items-center justify-center">
          {icon}
        </div>
        {hasIssue && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-attention ring-2 ring-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground truncate">{title}</p>
        {meta && <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{meta}</p>}
        {shown.length > 0 && (
          <div className="flex gap-1.5 mt-2.5">
            {shown.map((src, i) => (
              <div key={i} className="w-14 h-14 rounded-lg overflow-hidden bg-muted">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {extra > 0 && (
              <div className="w-14 h-14 rounded-lg bg-muted text-muted-foreground text-[13px] font-medium flex items-center justify-center">
                +{extra}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
