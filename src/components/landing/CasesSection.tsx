import { ArrowRight, Building2, GraduationCap, Sparkles, User } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { AnimatedHeading } from "./AnimatedHeading";

const CASES = [
  {
    icon: GraduationCap,
    tag: "Estudante de fisioterapia",
    before: "Passava horas caçando resumo, caso e exercício em PDF, print e drive antes de cada prova ou apresentação.",
    after: "Casos clínicos, notas de aula e biblioteca de exercícios organizados em uma conta só.",
    result: "Até 3h por semana de volta para estudar de verdade e subir a nota.",
  },
  {
    icon: User,
    tag: "Fisioterapeuta autônomo",
    before: "Perdia sessão por retorno esquecido, cobrança pelo WhatsApp e evolução do paciente em planilha solta.",
    after: "Pacientes, agenda, cobranças e evoluções em um único painel, com aviso de vencimento.",
    result: "Menos cobrança esquecida e menos paciente sumido: sua receita para de escorrer.",
  },
  {
    icon: Building2,
    tag: "Clínica pequena",
    before: "Informação do paciente espalhada entre recepção, WhatsApp e vários apps sem histórico central.",
    after: "Workspace única com histórico, agenda e cobranças padronizadas para toda a equipe.",
    result: "Equipe alinhada, paciente bem atendido e menos retrabalho que trava o crescimento.",
  },
];

export function CasesSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section id="cases" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <div ref={ref} className={visible ? "animate-fade-in" : "opacity-0"}>
        <p className="text-[12px] font-bold uppercase tracking-widest text-primary">Antes e depois</p>
        <AnimatedHeading
          as="h2"
          className="mt-2 max-w-3xl text-[28px] font-extrabold leading-tight text-navy md:text-[38px]"
          text="Do caderno bagunçado à rotina de fisio profissional em dias, não meses."
          variant="cinematic"
          once
        />
        <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground md:text-[16px]">
          Cenários reais que o FisioFlow resolve para estudante, fisio autônomo e clínica pequena. Veja o antes,
          o depois e o resultado que você pode esperar na sua rotina.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3 md:items-stretch">
        {CASES.map((c, i) => (
          <CaseCard key={c.tag} {...c} delay={i * 90} />
        ))}
      </div>
    </section>
  );
}

function CaseCard({
  icon: Icon,
  tag,
  before,
  after,
  result,
  delay,
}: {
  icon: typeof User;
  tag: string;
  before: string;
  after: string;
  result: string;
  delay: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <article
      ref={ref}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms`, boxShadow: "var(--shadow-soft)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
      />

      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy to-navy/80 text-navy-foreground shadow-md ring-1 ring-primary/20">
          <Icon size={20} />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-dark">
          {tag}
        </span>
      </div>

      <div className="relative mt-5 flex-1 space-y-3">
        <div className="rounded-2xl border border-destructive/15 bg-destructive/5 p-3.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            <span className="text-[10px] font-black uppercase tracking-wider text-destructive">Antes</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{before}</p>
        </div>

        <div className="flex justify-center">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-navy-foreground shadow-sm">
            <ArrowRight size={12} className="rotate-90" />
          </span>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/8 p-3.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-primary-dark">Depois</span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-foreground">{after}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-start gap-2.5 rounded-2xl bg-gradient-to-br from-navy to-navy/90 p-4 text-navy-foreground">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles size={13} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">Resultado esperado</p>
          <p className="mt-0.5 text-[13px] font-semibold leading-snug">{result}</p>
        </div>
      </div>
    </article>
  );
}

