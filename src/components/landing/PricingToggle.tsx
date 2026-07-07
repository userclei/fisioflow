import { cn } from "@/lib/utils";

export function PricingToggle({
  value,
  onChange,
}: {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Ciclo de cobrança"
      className="relative grid w-full max-w-[320px] grid-cols-2 items-center rounded-full border border-border bg-card p-1 shadow-sm"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-navy shadow transition-transform duration-300 ease-out",
          value === "yearly" ? "translate-x-[calc(100%+0.5rem)]" : "translate-x-0",
        )}
        style={{ left: "0.25rem" }}
      />
      <button
        type="button"
        role="tab"
        aria-selected={value === "monthly"}
        onClick={() => onChange("monthly")}
        className={cn(
          "relative z-10 rounded-full px-3 py-2 text-[13px] font-bold transition-colors",
          value === "monthly" ? "text-navy-foreground" : "text-muted-foreground",
        )}
      >
        Mensal
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "yearly"}
        onClick={() => onChange("yearly")}
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold transition-colors",
          value === "yearly" ? "text-navy-foreground" : "text-muted-foreground",
        )}
      >
        Anual
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none",
            value === "yearly" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary-dark",
          )}
        >
          -2 meses
        </span>
      </button>
    </div>
  );
}
