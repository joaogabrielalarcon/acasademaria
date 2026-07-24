import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "attention" | "danger";

const toneMap: Record<Tone, { bg: string; text: string; Icon: React.ComponentType<any> }> = {
  ok:        { bg: "bg-ok-soft",        text: "text-ok",        Icon: CheckCircle2 },
  warn:      { bg: "bg-warn-soft",      text: "text-warn",      Icon: AlertTriangle },
  attention: { bg: "bg-attention-soft", text: "text-attention", Icon: AlertCircle },
  danger:    { bg: "bg-danger-soft",    text: "text-danger",    Icon: XCircle },
};

interface AlertBarProps {
  tone?: Tone;
  count?: number;
  title: string;
  onClick?: () => void;
  className?: string;
}

/**
 * AlertBar — cartão acionável: farol + contagem + frase + seta.
 * Fundo -soft. Clique → lista filtrada.
 */
export function AlertBar({ tone = "attention", count, title, onClick, className }: AlertBarProps) {
  const t = toneMap[tone];
  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-3 rounded-lg px-5 py-4 text-left transition-shadow duration-base ease-smooth hover:shadow-e2",
        t.bg,
        className
      )}
    >
      <t.Icon className={cn("w-5 h-5 flex-shrink-0", t.text)} />
      {typeof count === "number" && (
        <span className={cn("font-sans font-semibold text-[22px] leading-none tabular-nums", t.text)}>{count}</span>
      )}
      <span className="flex-1 text-[14px] text-foreground">{title}</span>
      <ArrowRight className={cn("w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform", t.text)} />
    </motion.button>
  );
}
