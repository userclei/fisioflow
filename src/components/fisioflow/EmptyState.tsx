import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-card shadow-[var(--shadow-soft)]">
        <Icon size={36} className="text-primary" strokeWidth={1.8} />
      </div>
      <h2 className="mt-5 text-[18px] font-bold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-[20px] text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5 w-full max-w-[240px]">{action}</div> : null}
    </div>
  );
}
