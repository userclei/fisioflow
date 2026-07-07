import { useEffect, useRef, useState } from "react";
import { formatBRL } from "@/config/pricing";

type Props = {
  value: number;
  className?: string;
  /** Optional key that forces re-animation on external change (e.g. cycle) */
  cycleKey?: string;
  duration?: number;
};

/**
 * Count-up on mount and when `value` changes.
 * Uses requestAnimationFrame + easeOutCubic. Respects reduced motion.
 */
export function AnimatedPrice({ value, className, cycleKey, duration = 900 }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || value === fromRef.current) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const start = performance.now();
    const from = fromRef.current;
    const to = value;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, cycleKey]);

  if (value === 0) {
    return <span className={className}>Grátis</span>;
  }

  return (
    <span
      data-animated-price="true"
      key={cycleKey}
      className={className}
      style={{ animation: "pricePulseUp 0.7s ease-out both", display: "inline-block" }}
    >
      {formatBRL(Math.round(display * 100) / 100)}
    </span>
  );
}
