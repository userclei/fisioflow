import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricing, formatBRL, type Plan } from "@/config/pricing";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { PricingToggle } from "./PricingToggle";
import { AnimatedPrice } from "./AnimatedPrice";

export function PricingSection() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section id="planos" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <div ref={ref} className={visible ? "animate-fade-in text-center" : "opacity-0 text-center"}>
        <h2 className="text-[28px] font-extrabold leading-tight text-navy md:text-[38px]">
          Escolha o plano ideal para sua rotina.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground md:text-[16px]">
          Comece simples e evolua conforme sua operação cresce.
        </p>
        <div className="mt-6 flex justify-center">
          <PricingToggle value={cycle} onChange={setCycle} />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        {pricing.map((p) => (
          <PricingCard key={p.id} plan={p} cycle={cycle} />
        ))}
      </div>
    </section>
  );
}

function PricingCard({ plan, cycle }: { plan: Plan; cycle: "monthly" | "yearly" }) {
  const price = cycle === "monthly" ? plan.monthly : plan.yearly;
  const suffix = plan.id === "free" ? "" : cycle === "monthly" ? "/mês" : "/ano";
  const monthlyEquivalent =
    cycle === "yearly" && plan.yearly > 0 ? `equivale a ${formatBRL(plan.yearly / 12)}/mês` : null;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-[28px] border p-6 transition-all",
        plan.highlight
          ? "border-primary bg-navy text-navy-foreground shadow-2xl lg:-translate-y-4"
          : "border-border bg-card",
      )}
      style={
        plan.highlight
          ? { boxShadow: "0 30px 60px -20px rgba(8,199,186,0.4)" }
          : { boxShadow: "var(--shadow-soft)" }
      }
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary-foreground shadow-lg">
          <Sparkles size={11} /> {plan.badge}
        </span>
      )}

      <h3 className={cn("text-[20px] font-black", plan.highlight ? "text-navy-foreground" : "text-navy")}>
        {plan.name}
      </h3>
      <p className={cn("mt-1 text-[13px] leading-relaxed", plan.highlight ? "text-white/70" : "text-muted-foreground")}>
        {plan.tagline}
      </p>

      <div className="mt-6">
        <div className="flex items-baseline gap-1.5">
          <AnimatedPrice
            value={price}
            cycleKey={`${plan.id}-${cycle}`}
            className={cn(
              "text-[42px] font-black leading-none tabular-nums",
              plan.highlight ? "text-primary" : "text-navy",
            )}
          />
          {suffix && price > 0 && (
            <span
              className={cn(
                "text-[13px] font-semibold",
                plan.highlight ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {suffix}
            </span>
          )}
        </div>
        <div className="mt-2 min-h-[18px]">
          {monthlyEquivalent && (
            <p
              key={`${plan.id}-eq-${cycle}`}
              className={cn("text-[12px]", plan.highlight ? "text-white/60" : "text-muted-foreground")}
              style={{ animation: "fadeSlideUp 0.4s ease-out both" }}
            >
              {monthlyEquivalent}
            </p>
          )}
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]">
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                plan.highlight ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary-dark",
              )}
            >
              <Check size={12} strokeWidth={3} />
            </span>
            <span className={cn("font-medium", plan.highlight ? "text-white/90" : "text-foreground")}>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="lg"
        variant={plan.highlight ? "default" : "outline"}
        className={cn(
          "mt-6 w-full rounded-full font-bold",
          plan.highlight && "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        <Link to={plan.ctaTo}>{plan.ctaLabel}</Link>
      </Button>
    </div>
  );
}
