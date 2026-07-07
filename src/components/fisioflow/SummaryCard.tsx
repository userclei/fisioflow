import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SummaryCard({
  icon: Icon,
  value,
  label,
  subtext,
  tone = "warning",
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  subtext?: string;
  tone?: "warning" | "success";
}) {
  const iconBg = tone === "success" ? "bg-success/15" : "bg-warning/25";
  const iconColor = tone === "success" ? "text-success" : "text-warning";
  return (
    <div
      className="flex-1 rounded-[22px] bg-card p-4"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconBg}`}>
        <Icon size={18} className={iconColor} strokeWidth={2.2} />
      </div>
      <div className="mt-6 text-[22px] font-bold leading-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[13px] font-medium text-muted-foreground">
        {label}
      </div>
      {subtext ? (
        <div className="text-[12px] text-muted-foreground/80">{subtext}</div>
      ) : null}
    </div>
  );
}
