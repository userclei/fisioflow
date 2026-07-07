import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: string;
  className?: string;
  duration?: number;
  once?: boolean;
}

/**
 * Counta de 0 até o número embutido em `value`, mantendo prefixo/sufixo.
 * Suporta "24/7", "+3,4×", "−72%", "99,2%", "500K+", "<800ms".
 */
export function AnimatedNumber({ value, className, duration = 1.8, once = false }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: "-60px" });

  const match = value.match(/(-?\d+(?:[.,]\d+)?)/);
  const numStr = match?.[0] ?? "0";
  const target = parseFloat(numStr.replace(",", "."));
  const decimals = numStr.includes(",") || numStr.includes(".")
    ? numStr.split(/[.,]/)[1]?.length ?? 0
    : 0;
  const usesComma = numStr.includes(",");
  const [prefix, suffix] = match
    ? [value.slice(0, match.index!), value.slice(match.index! + numStr.length)]
    : ["", value];

  const mv = useMotionValue(0);
  const display = useTransform(mv, (latest) => {
    const formatted = latest.toFixed(decimals);
    return usesComma ? formatted.replace(".", ",") : formatted;
  });

  useEffect(() => {
    if (!inView) {
      mv.set(0);
      return;
    }
    const controls = animate(mv, target, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, target, duration, mv]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}
