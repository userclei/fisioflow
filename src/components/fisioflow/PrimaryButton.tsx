import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  block?: boolean;
};

export function PrimaryButton({
  children,
  className,
  block = true,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98] disabled:opacity-60",
        block ? "w-full" : "",
        className,
      )}
      style={{ height: 52 }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  block = true,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-primary bg-transparent px-5 text-[15px] font-bold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]",
        block ? "w-full" : "",
        className,
      )}
    >
      {children}
    </button>
  );
}
