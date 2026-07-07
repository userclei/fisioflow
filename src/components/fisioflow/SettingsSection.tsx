import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-2">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function SettingsItem({
  icon: Icon,
  label,
  value,
  to,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const content = (
    <div
      className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          danger ? "bg-destructive/10 text-destructive" : "bg-card-soft text-primary"
        }`}
      >
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <span
        className={`flex-1 text-[14px] font-semibold ${
          danger ? "text-destructive" : "text-foreground"
        }`}
      >
        {label}
      </span>
      {value ? (
        <span className="text-[13px] text-muted-foreground">{value}</span>
      ) : null}
      <ChevronRight size={18} className="text-icon-muted" />
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}
