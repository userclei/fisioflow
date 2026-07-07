import { ArrowRight, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/useReveal";
import { AnimatedHeading } from "./AnimatedHeading";

const BENEFITS = [
  "Menos cobrança esquecida = mais dinheiro no seu bolso",
  "Paciente com histórico completo = mais retorno e indicação",
  "Agenda unificada = zero furo, zero constrangimento",
  "Biblioteca de exercícios = sessão pronta em 2 cliques",
  "Casos clínicos organizados = estudo mais rápido e prova melhor",
  "Dicionário de termos na palma da mão, do estágio ao consultório",
  "Financeiro claro = você sabe quanto entra e quanto falta",
  "Cara profissional que o paciente pagante quer ver",
];

export function SolutionSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section className="bg-card-soft/40 py-20">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <div ref={ref} className={visible ? "animate-fade-in" : "opacity-0"}>
          <p className="text-[12px] font-bold uppercase tracking-widest text-primary">A virada de chave</p>
          <AnimatedHeading
            as="h2"
            className="mt-2 text-[28px] font-extrabold leading-tight text-navy md:text-[38px]"
            text="Um app que trabalha por você: você para de perder e começa a crescer."
            variant="cinematic"
            once
          />
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
            O FisioFlow tira você do caos e coloca sua rotina em ordem em minutos. O estudante ganha tempo
            e nota melhor. O fisio que atende ganha paciente, controle e dinheiro. Tudo no mesmo app, a mesma
            conta, do primeiro caso clínico ao consultório cheio.
          </p>

          <ul className="mx-auto mt-8 grid max-w-2xl gap-2.5 text-left sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[14px] font-medium text-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check size={13} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl">
              <Link to="/cadastro">
                Começar de graça agora <ArrowRight size={18} className="ml-1" />
              </Link>
            </Button>
            <span className="text-[13px] text-muted-foreground">Leva menos de 2 minutos para configurar.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
