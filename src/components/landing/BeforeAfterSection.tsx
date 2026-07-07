import { Check, X } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const BEFORE = [
  "Resumo perdido em PDF",
  "Caso clínico em prints",
  "Agenda de estágio no papel",
  "Paciente sem histórico claro",
  "Cobrança esquecida",
  "Exercícios sem padrão",
];
const AFTER = [
  "Notas de aula organizadas",
  "Casos clínicos catalogados",
  "Agenda unificada",
  "Paciente com histórico completo",
  "Cobranças com status",
  "Biblioteca de exercícios pronta",
];

export function BeforeAfterSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <div ref={ref} className={visible ? "animate-fade-in text-center" : "opacity-0 text-center"}>
        <h2 className="text-[28px] font-extrabold leading-tight text-navy md:text-[38px]">
          De <span className="text-destructive">rotina amadora que perde paciente</span>{" "}
          para <span className="text-primary">operação que cresce todo mês</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
          Sua rotina hoje vs. sua rotina em 7 dias com o FisioFlow. Sem promessa mágica, só o que muda quando você para de tudo espalhado.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Column
          title="Antes"
          items={BEFORE}
          tone="danger"
        />
        <Column
          title="Depois"
          items={AFTER}
          tone="success"
        />
      </div>
    </section>
  );
}

function Column({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "danger" | "success";
}) {
  const isSuccess = tone === "success";
  return (
    <div
      className="rounded-3xl border border-border p-6"
      style={{
        background: isSuccess ? "color-mix(in oklab, var(--success) 8%, var(--card))" : "color-mix(in oklab, var(--destructive) 6%, var(--card))",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <p
        className="text-[12px] font-bold uppercase tracking-widest"
        style={{ color: isSuccess ? "var(--success)" : "var(--destructive)" }}
      >
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5">
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-white"
              style={{ background: isSuccess ? "var(--success)" : "var(--destructive)" }}
            >
              {isSuccess ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
            </span>
            <span className={`text-[14px] font-semibold ${isSuccess ? "text-foreground" : "text-muted-foreground line-through decoration-destructive/50"}`}>
              {it}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
