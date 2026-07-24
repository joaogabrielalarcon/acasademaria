import { useMemo } from "react";
import { Leaf } from "lucide-react";
import mafeAvatar from "@/assets/flora-avatar.webp";

const POOL = [mafeAvatar];

/** Avatar circular da Mafe — estático (sem tremor).
 *  Prep para rotação: escolhe uma imagem do pool por carregamento. */
export function MafeAvatar({ size = 160 }: { size?: number }) {
  const img = useMemo(() => POOL[Math.floor(Math.random() * POOL.length)], []);
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden ring-1 ring-white/20 shadow-e2 relative"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.10), rgba(0,0,0,0.15))",
      }}
      aria-label="Mafe, sua assistente"
    >
      {img ? (
        <img src={img} alt="" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "hsl(var(--sage) / 0.35)", color: "hsl(var(--hero-band-fg))" }}
        >
          <Leaf className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}
