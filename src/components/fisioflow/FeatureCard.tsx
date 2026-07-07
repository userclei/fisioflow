import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export function FeatureCard({
  label,
  to,
  icon: Icon,
}: {
  label: string;
  to: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl bg-card-soft px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span className="text-[14px] font-semibold leading-tight text-foreground">
        {label}
      </span>
    </Link>
  );
}
