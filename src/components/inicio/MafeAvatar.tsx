import { useMemo } from "react";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import mafeAvatar from "@/assets/flora-avatar.webp";

const POOL = [mafeAvatar];

/** Avatar circular da Mafe com respiração sutil e crossfade entre imagens. */
export function MafeAvatar({ size = 68 }: { size?: number }) {
  const img = useMemo(() => POOL[Math.floor(Math.random() * POOL.length)], []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -3, 0],
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
        y: { repeat: Infinity, duration: 4.2, ease: "easeInOut" },
      }}
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
        <motion.img
          key={img}
          src={img}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "hsl(var(--sage) / 0.35)", color: "hsl(var(--hero-band-fg))" }}
        >
          <Leaf className="w-6 h-6" />
        </div>
      )}
    </motion.div>
  );
}
