import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { AppLogo } from "@/components/fisioflow/AppLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <AppLogo size={24} showLabel />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Para estudantes de fisioterapia e fisios que já atendem. Estudos, pacientes, agenda, exercícios e financeiro em um só lugar.
            </p>
            <div className="mt-4 flex gap-2">
              <SocialLink href="#" label="WhatsApp"><MessageCircle size={16} /></SocialLink>
              <SocialLink href="mailto:contato@fisioflow.app" label="E-mail"><Mail size={16} /></SocialLink>
              <SocialLink href="#" label="Instagram"><Instagram size={16} /></SocialLink>
            </div>
          </div>

          <Col title="Produto" links={[
            { label: "Funcionalidades", href: "#features" },
            { label: "Planos", href: "#planos" },
            { label: "Cases", href: "#cases" },
            { label: "FAQ", href: "#faq" },
          ]} />

          <Col title="Recursos" links={[
            { label: "Agenda", href: "#features" },
            { label: "Pacientes", href: "#features" },
            { label: "Financeiro", href: "#features" },
            { label: "Exercícios", href: "#features" },
            { label: "Notas", href: "#features" },
          ]} />

          <Col title="Conta" links={[
            { label: "Entrar", to: "/login" },
            { label: "Criar conta", to: "/cadastro" },
            { label: "Contato", href: "#contato" },
          ]} />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <p>© 2026 FisioFlow. Todos os direitos reservados.</p>
          <p>Termos de uso · Política de privacidade</p>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = { label: string; href?: string; to?: "/login" | "/cadastro" };

function Col({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-widest text-navy">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) =>
          l.to ? (
            <li key={l.label}>
              <Link to={l.to} className="text-[14px] text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            </li>
          ) : (
            <li key={l.label}>
              <a href={l.href} className="text-[14px] text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-card-soft text-foreground transition-all hover:bg-primary hover:text-primary-foreground"
    >
      {children}
    </a>
  );
}
