import { StickyNote } from "lucide-react";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";

/** Faixa 4 — Lembretes pessoais (placeholder discreto). */
export function Lembretes() {
  return (
    <SurfaceCard padded>
      <SurfaceCardHeader label="Lembretes" />
      <div className="flex items-center gap-3 py-3 text-muted-foreground">
        <span className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center shrink-0">
          <StickyNote className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] text-foreground/80">
            Espaço para seus stickers pessoais.
          </p>
          <p className="text-[12px] text-muted-foreground">Em breve.</p>
        </div>
      </div>
    </SurfaceCard>
  );
}
