import { cn } from "@/lib/utils";

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card-soft text-primary hover:bg-primary/10",
      )}
    >
      {label}
    </button>
  );
}
