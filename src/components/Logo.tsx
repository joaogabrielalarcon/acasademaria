import { cn } from "@/lib/utils";
import logoMfm from "@/assets/logo-mfm.png";

interface LogoProps {
  variant?: "full" | "compact" | "icon";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img 
          src={logoMfm} 
          alt="MFM Paisagismo" 
          className="h-10 w-auto object-contain"
        />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img 
          src={logoMfm} 
          alt="MFM Paisagismo" 
          className="h-8 w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <img 
        src={logoMfm} 
        alt="MFM Paisagismo Ecológico" 
        className="h-16 w-auto object-contain"
      />
    </div>
  );
}