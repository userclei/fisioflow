import { Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedWords } from "./AnimatedWords";
import { HighlightText } from "./HighlightText";

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-24 md:pt-28">
      <div className="mx-auto max-w-4xl px-4 pb-12 text-center md:px-8 md:pb-20">
        <div className="relative z-10 mx-auto max-w-[720px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] font-semibold text-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Feito por fisio, para estudantes e fisios de verdade
          </span>

          <h1 className="mt-5 text-[38px] font-black leading-[1.02] text-navy sm:text-[46px] md:text-[58px]">
            <span>Pare de perder paciente, prova e dinheiro por </span>
            <HighlightText highlightClassName="bg-primary/35">falta de organização</HighlightText>
            <span>. Comece a </span>
            <AnimatedWords />
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-[16px] leading-relaxed text-muted-foreground md:text-[17px]">
            Enquanto você anota tudo em caderno, WhatsApp e planilha, o paciente esquece o retorno,
            a cobrança atrasa, o caso clínico do estágio some e a prova chega sem revisão.
            O FisioFlow acaba com esse caos em <strong className="font-semibold text-foreground">um único app</strong>,
            para estudante e para fisio que já atende.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl">
              <Link to="/cadastro">
                Quero organizar minha rotina agora <ArrowRight size={18} className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <a href="#planos">
                <PlayCircle size={18} className="mr-1" /> Ver planos
              </a>
            </Button>
          </div>

          <p className="mt-4 text-[13px] font-medium text-muted-foreground">
            ✓ Comece grátis, sem cartão · ✓ Cancele quando quiser · ✓ Acesso imediato pelo navegador
          </p>
        </div>
      </div>
    </section>
  );
}

