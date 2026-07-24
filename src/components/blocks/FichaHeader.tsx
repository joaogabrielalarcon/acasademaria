import * as React from "react";
import { Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FichaHeaderProps {
  photoUrl?: string | null;
  name: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  onPhotoClick?: () => void;
  className?: string;
}

/**
 * FichaHeader — cabeçalho editorial de ficha (colaborador, cliente, projeto).
 * Nome em Fraunces --foreground. Terracota jamais no nome.
 */
export function FichaHeader({
  photoUrl,
  name,
  subtitle,
  badges,
  actions,
  onPhotoClick,
  className,
}: FichaHeaderProps) {
  return (
    <div className={cn("flex items-start gap-6 py-6", className)}>
      <button
        onClick={onPhotoClick}
        className="relative flex-shrink-0 w-24 h-24 rounded-full overflow-hidden bg-muted shadow-e1 hover:shadow-e2 transition-shadow group"
      >
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Camera className="w-6 h-6" />
          </div>
        )}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display text-[44px] leading-[1.05] tracking-tight text-foreground truncate">
          {name}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-muted-foreground mt-1">{subtitle}</p>
        )}
        {badges && <div className="flex flex-wrap gap-2 mt-3">{badges}</div>}
      </div>

      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
