import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "./LeadCaptureForm";

export function FinalCTA() {
  return (
    <section id="contato" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div
          className="relative overflow-hidden rounded-3xl bg-navy p-8 text-navy-foreground md:p-10"
          style={{ boxShadow: "0 30px 60px -20px rgba(6,43,73,0.4)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-56 w-56 translate-x-1/3 -translate-y-1/3 rounded-full opacity-70 blur-3xl"
            style={{ background: "radial-gradient(closest-side, rgba(8,199,186,0.5), transparent)" }}
          />
          <p className="relative text-[12px] font-bold uppercase tracking-widest text-primary">Última chamada</p>
          <h2 className="relative mt-2 text-[28px] font-black leading-tight md:text-[36px]">
            Toda semana sem FisioFlow é dinheiro, paciente ou nota que você não vai recuperar.
          </h2>
          <p className="relative mt-3 max-w-md text-[15px] text-white/80">
            Comece grátis, sem cartão, sem compromisso. Se em uma semana você não perceber sua rotina
            mais organizada, é só sair. Você não tem nada a perder, só o caos.
          </p>
          <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
              <Link to="/cadastro">
                Quero começar de graça agora <ArrowRight size={18} className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-transparent text-navy-foreground hover:bg-white/10 hover:text-navy-foreground">
              <a href="#planos">Ver planos e preços</a>
            </Button>
          </div>
          <p className="relative mt-4 text-[12px] text-white/60">
            ✓ Sem cartão · ✓ Cancele em 1 clique · ✓ Seus dados são seus
          </p>
        </div>
        <LeadCaptureForm />
      </div>
    </section>
  );
}
