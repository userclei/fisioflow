import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { AppLogo } from "@/components/fisioflow/AppLogo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Como funciona", href: "#como" },
  { label: "Cases", href: "#cases" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all",
        "border-b border-transparent",
        scrolled && "border-[color:rgba(240,222,218,0.8)]",
      )}
      style={{
        background: "rgba(255, 243, 239, 0.78)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-[72px] md:px-8">
        <a href="#top" className="flex items-center gap-2">
          <AppLogo size={26} showLabel />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/home">Abrir app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/cadastro">Testar agora</Link>
              </Button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-full bg-card text-foreground shadow-sm md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="mx-4 mb-3 rounded-2xl border border-border bg-card p-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            {user ? (
              <Button asChild className="flex-1 rounded-full">
                <Link to="/home">Abrir app</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="flex-1 rounded-full">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="flex-1 rounded-full">
                  <Link to="/cadastro">Testar</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
