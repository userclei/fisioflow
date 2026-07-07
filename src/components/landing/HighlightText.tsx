import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HighlightTextProps {
  children: ReactNode;
  className?: string;
  /** Cor da barra. Default: bg-primary/40 */
  highlightClassName?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
}

/**
 * Barra levemente inclinada que cresce da esquerda para direita
 * revelando por baixo do texto. Assinatura visual: `-skew-x-6`, expo-out.
 */
export function HighlightText({
  children,
  className,
  highlightClassName = "bg-primary/40",
  delay = 0.4,
  duration = 0.9,
  once = true,
}: HighlightTextProps) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once, margin: "-80px" }}
        transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{ originX: 0 }}
        className={cn(
          "absolute inset-x-[-8px] inset-y-[6px] -skew-x-6 z-0 rounded-sm",
          highlightClassName,
        )}
      />
    </span>
  );
}
