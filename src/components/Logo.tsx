import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "compact" | "icon";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <svg
          viewBox="0 0 48 48"
          className="w-10 h-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dandelion icon */}
          <circle cx="24" cy="20" r="6" className="fill-current opacity-80" />
          <g className="fill-current opacity-60">
            <circle cx="24" cy="8" r="2" />
            <circle cx="32" cy="12" r="2" />
            <circle cx="36" cy="20" r="2" />
            <circle cx="32" cy="28" r="2" />
            <circle cx="16" cy="28" r="2" />
            <circle cx="12" cy="20" r="2" />
            <circle cx="16" cy="12" r="2" />
          </g>
          <path
            d="M24 26 L24 42"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-display text-2xl font-bold tracking-tight">MFM</span>
        <svg
          viewBox="0 0 32 32"
          className="w-6 h-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="12" r="4" className="fill-current opacity-80" />
          <g className="fill-current opacity-50">
            <circle cx="16" cy="4" r="1.5" />
            <circle cx="22" cy="6" r="1.5" />
            <circle cx="25" cy="12" r="1.5" />
            <circle cx="22" cy="18" r="1.5" />
            <circle cx="10" cy="18" r="1.5" />
            <circle cx="7" cy="12" r="1.5" />
            <circle cx="10" cy="6" r="1.5" />
          </g>
          <path
            d="M16 16 L16 28"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-semibold tracking-wide uppercase">
          Maria Fernanda Marques
        </span>
        <svg
          viewBox="0 0 40 40"
          className="w-8 h-8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="20" cy="15" r="5" className="fill-current opacity-80" />
          <g className="fill-current opacity-50">
            <circle cx="20" cy="5" r="2" />
            <circle cx="28" cy="8" r="2" />
            <circle cx="32" cy="15" r="2" />
            <circle cx="28" cy="22" r="2" />
            <circle cx="12" cy="22" r="2" />
            <circle cx="8" cy="15" r="2" />
            <circle cx="12" cy="8" r="2" />
          </g>
          <path
            d="M20 20 L20 35"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xs tracking-[0.3em] uppercase opacity-70">
        Paisagismo Ecológico
      </span>
    </div>
  );
}
