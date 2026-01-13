import { cn } from "@/lib/utils";
import logoMfm from "@/assets/logo-mfm.png";

interface LogoProps {
  variant?: "full" | "compact" | "icon";
  className?: string;
}

export function Logo({ variant = "full", className }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={cn("flex items-center justify-center w-full", className)}>
        <img 
          src={logoMfm} 
          alt="MFM Paisagismo" 
          className="w-full max-w-[48px] h-auto object-contain"
        />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center justify-center w-full", className)}>
        <img 
          src={logoMfm} 
          alt="MFM Paisagismo" 
          className="w-full max-w-[180px] h-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <img 
        src={logoMfm} 
        alt="MFM Paisagismo Ecológico" 
        className="w-full max-w-[220px] h-auto object-contain"
      />
    </div>
  );
}