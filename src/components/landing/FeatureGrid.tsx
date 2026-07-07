import { Activity, Calendar, CheckSquare, DollarSign, FileText, Search, UsersRound, Wrench } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { AnimatedHeading } from "./AnimatedHeading";

const FEATURES = [
  { icon: Calendar, title: "Agenda", desc: "Aulas, plantões de estágio, atendimentos e retornos em uma visão semanal clara." },
  { icon: UsersRound, title: "Pacientes & casos", desc: "Cadastre pacientes reais ou casos clínicos de estudo, com histórico e evolução." },
  { icon: FileText, title: "Notas & evoluções", desc: "Anote resumo de aula, discussão de caso ou evolução de sessão no mesmo lugar." },
  { icon: Activity, title: "Exercícios", desc: "Monte sua biblioteca de exercícios para estudar, prescrever e reutilizar." },
  { icon: Search, title: "Dicionário", desc: "Termos, siglas e conceitos de fisioterapia para consultar em segundos." },
  { icon: DollarSign, title: "Financeiro", desc: "Para quem já atende: cobranças, vencimentos, pagos e pendentes sob controle." },
  { icon: CheckSquare, title: "Tarefas", desc: "Provas, entregas, retornos e lembretes. Nada mais cai no esquecimento." },
  { icon: Wrench, title: "Ferramentas", desc: "Calculadoras, escalas e modelos úteis tanto no estudo quanto no atendimento." },
];

export function FeatureGrid() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <div ref={ref} className={visible ? "animate-fade-in" : "opacity-0"}>
        <AnimatedHeading
          as="h2"
          className="max-w-3xl text-[28px] font-extrabold leading-tight text-navy md:text-[38px]"
          text="Um módulo para cada momento da sua trajetória em fisioterapia."
          once
        />
        <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground md:text-[16px]">
          Funciona para o estudante desde a primeira disciplina e continua funcionando quando você começa a atender.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <FeatureItem key={f.title} {...f} delay={i * 50} />
        ))}
      </div>
    </section>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: typeof Calendar;
  title: string;
  desc: string;
  delay: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`group rounded-3xl border border-border bg-card p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms`, boxShadow: "var(--shadow-soft)" }}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary transition-transform group-hover:scale-110">
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <h3 className="mt-3 text-[16px] font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
