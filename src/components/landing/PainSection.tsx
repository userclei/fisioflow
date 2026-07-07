import { AlertTriangle, BookOpen, CalendarX, ClipboardList, FileWarning, Receipt, UserX } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { AnimatedHeading } from "./AnimatedHeading";

const PAINS = [
  { icon: Receipt, title: "Você está deixando dinheiro na mesa", desc: "Cobrança esquecida é sessão trabalhada de graça. Todo mês sem controle é conta fechando no vermelho." },
  { icon: UserX, title: "Paciente sumindo por falha sua", desc: "Sem histórico e sem retorno agendado, o paciente vai embora achando que ninguém liga. Isso é churn silencioso." },
  { icon: CalendarX, title: "Agenda no WhatsApp gera furo garantido", desc: "Compromisso perdido entre print, caderno e mensagem apagada. Basta um esquecimento pra queimar sua reputação." },
  { icon: BookOpen, title: "Estudo espalhado é prova mal feita", desc: "Resumo no PDF, caso no print, exercício no drive. Na semana da prova, você não acha nada." },
  { icon: ClipboardList, title: "Prescrição feita do zero toda vez", desc: "Refazer os mesmos exercícios para cada paciente rouba horas por semana que deveriam ser suas ou faturáveis." },
  { icon: FileWarning, title: "Rotina amadora afasta paciente pagante", desc: "Paciente que paga bem quer profissional organizado. Caderno na mão em 2026 grita 'ainda estou começando'." },
];

export function PainSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <div ref={ref} className={visible ? "animate-fade-in" : "opacity-0"}>
        <p className="text-[12px] font-bold uppercase tracking-widest text-destructive">O custo real da desorganização</p>
        <AnimatedHeading
          as="h2"
          className="mt-2 max-w-3xl text-[28px] font-extrabold leading-tight text-navy md:text-[38px]"
          text="Cada semana sem organização é dinheiro, paciente e nota que você está perdendo."
          once
        />

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
          Não é frescura de app bonito, é consequência: fisio autônomo perde renda, clínica pequena perde paciente,
          estudante perde nota. Reconhece algum destes sinais?
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PAINS.map((p, i) => (
          <PainCard key={p.title} {...p} delay={i * 60} />
        ))}
      </div>
    </section>
  );
}

function PainCard({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: typeof AlertTriangle;
  title: string;
  desc: string;
  delay: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`rounded-3xl border border-border bg-card p-5 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms`, boxShadow: "var(--shadow-soft)" }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <Icon size={20} />
      </span>
      <h3 className="mt-3 text-[16px] font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
