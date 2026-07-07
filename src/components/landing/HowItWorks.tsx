import { useReveal } from "@/hooks/useReveal";
import { AnimatedHeading } from "./AnimatedHeading";

const STEPS = [
  { n: "01", title: "Crie sua conta", desc: "Diga se você é estudante de fisio, profissional autônomo ou clínica. O app se adapta." },
  { n: "02", title: "Cadastre pacientes ou casos", desc: "Salve pacientes reais do atendimento ou casos clínicos que você estuda no estágio." },
  { n: "03", title: "Organize seu dia", desc: "Use agenda, notas, exercícios, dicionário e (se atender) o financeiro em uma só tela." },
  { n: "04", title: "Evolua com clareza", desc: "Acompanhe seus estudos, sessões e recebimentos com histórico completo." },
];

export function HowItWorks() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section id="como" className="bg-card-soft/40 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div ref={ref} className={visible ? "animate-fade-in text-center" : "opacity-0 text-center"}>
          <AnimatedHeading
            as="h2"
            className="text-[28px] font-extrabold leading-tight text-navy md:text-[38px]"
            text="Comece hoje, estudando ou atendendo, em poucos passos."
            once
          />
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground md:text-[16px]">
            Sem instalação. Acesse pelo navegador, no computador ou no celular, e comece a organizar em minutos.
          </p>
        </div>

        <div className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <StepCard key={s.n} {...s} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ n, title, desc, delay }: { n: string; title: string; desc: string; delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`relative rounded-3xl border border-border bg-card p-6 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms`, boxShadow: "var(--shadow-soft)" }}
    >
      <span
        className="absolute -top-4 left-6 rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-3 py-1.5 text-[13px] font-black text-primary-foreground shadow-lg"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        {n}
      </span>
      <h3 className="mt-3 text-[17px] font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
