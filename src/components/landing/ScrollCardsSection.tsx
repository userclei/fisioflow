import { BookOpen, CalendarCheck2, ClipboardList, Layers, Receipt, UsersRound } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { AnimatedNumber } from "./AnimatedNumber";

const CARDS = [
  { icon: Receipt, value: 100, label: "Cobranças que não ficam mais esquecidas", suffix: "%", side: "left" as const },
  { icon: UsersRound, value: 240, label: "Pacientes com histórico completo e organizado", side: "right" as const },
  { icon: CalendarCheck2, value: 0, label: "Furos de agenda por esquecimento", suffix: "%", startAt: 0, side: "left" as const },
  { icon: ClipboardList, value: 90, label: "Exercícios prontos para prescrever em 2 cliques", side: "right" as const },
  { icon: BookOpen, value: 3, label: "Horas por semana de volta pra estudar de verdade", suffix: "h+", side: "left" as const },
  { icon: Layers, value: 0, label: "Planilhas e cadernos na sua rotina", suffix: "%", startAt: 100, side: "right" as const },
];

export function ScrollCardsSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section className="bg-gradient-to-b from-transparent via-card-soft/50 to-transparent py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div ref={ref} className={visible ? "animate-fade-in text-center" : "opacity-0 text-center"}>
          <p className="text-[12px] font-bold uppercase tracking-widest text-primary">O que muda na sua rotina</p>
          <h2 className="mx-auto mt-2 max-w-3xl text-[28px] font-extrabold leading-tight text-navy md:text-[38px]">
            Resultados concretos, não promessa de app bonito.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {CARDS.map((c) => (
            <ScrollCard key={c.label} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollCard({
  icon: Icon,
  value,
  label,
  suffix = "+",
  startAt,
  side,
}: {
  icon: typeof UsersRound;
  value: number;
  label: string;
  suffix?: string;
  startAt?: number;
  side: "left" | "right";
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const displayTarget = startAt ?? value;
  const formatted = suffix === "%" ? `${displayTarget}${suffix}` : `${suffix}${displayTarget}`;
  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 rounded-3xl border border-border bg-card p-5 transition-all duration-700 ${
        visible
          ? "translate-x-0 opacity-100"
          : side === "left"
            ? "translate-y-5 opacity-0"
            : "translate-y-5 opacity-0"
      }`}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
        <Icon size={24} />
      </span>
      <div className="min-w-0">
        <p className="text-[26px] font-black leading-none text-navy">
          <AnimatedNumber value={formatted} once />
        </p>
        <p className="mt-1 text-[13px] font-semibold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
