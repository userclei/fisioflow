import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useReveal } from "@/hooks/useReveal";

const FAQ = [
  {
    q: "Ainda estou na faculdade, vale a pena começar agora?",
    a: "Vale, e é o momento certo. Quem entra organizado no mercado sai na frente. Você usa hoje para casos clínicos, resumos e provas, e quando começar a atender já tem tudo montado: agenda, pacientes e cobranças. É o mesmo app, a mesma conta, sem começar do zero depois.",
  },
  {
    q: "Já uso caderno e WhatsApp, funciona. Preciso mesmo mudar?",
    a: "Funciona até o dia que não funciona. Um retorno esquecido, uma cobrança perdida ou um paciente sem histórico já pagam o app inteiro por meses. FisioFlow existe para você parar de perder dinheiro e reputação por desorganização.",
  },
  {
    q: "Tenho medo de perder tempo migrando tudo pra um app novo.",
    a: "Configuração leva menos de 2 minutos. Você começa cadastrando só os próximos pacientes ou os próximos casos e vai crescendo. Não precisa parar sua rotina para migrar nada.",
  },
  {
    q: "Vou pagar por algo que talvez eu não use?",
    a: "Não. Comece pelo plano Free, sem cartão. Só evolui para o PRO quando o app já estiver economizando seu tempo e trazendo mais paciente. Cancela em 1 clique quando quiser.",
  },
  {
    q: "Meus dados de paciente ficam seguros?",
    a: "Sim. Cada conta tem workspace isolada, dados de estudante, profissional autônomo e clínica nunca se cruzam. Estrutura pensada para respeitar sigilo profissional desde o início.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. Funciona online, direto pelo navegador, com experiência otimizada para celular. Útil no meio do estágio ou entre atendimentos.",
  },
  {
    q: "E se eu não gostar?",
    a: "Sai a qualquer momento, sem multa, sem burocracia. Seus dados são seus, você pode exportar. Você não tem nada a perder testando.",
  },
];

export function FAQSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section id="faq" className="bg-card-soft/40 py-20">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div ref={ref} className={visible ? "animate-fade-in text-center" : "opacity-0 text-center"}>
          <h2 className="text-[28px] font-extrabold leading-tight text-navy md:text-[38px]">
            Perguntas frequentes
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-8 space-y-2">
          {FAQ.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`q-${i}`}
              className="rounded-2xl border border-border bg-card px-5"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <AccordionTrigger className="text-left text-[15px] font-bold text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
