import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FloatingActionButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={cn(
        "fixed z-30 flex h-14 w-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95",
        className,
      )}
      style={{
        right: "max(20px, calc((100vw - 480px) / 2 + 20px))",
        bottom: "calc(env(safe-area-inset-bottom) + 96px)",
      }}
    >
      {children}
    </button>
  );
}
