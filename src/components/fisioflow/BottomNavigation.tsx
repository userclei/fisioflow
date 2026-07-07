import { Link, useRouterState } from "@tanstack/react-router";
import { DollarSign, Home, Settings, TrendingUp, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const leftItems = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/pacientes", label: "Pacientes", icon: UsersRound },
] as const;

const rightItems = [
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/configuracoes", label: "Config.", icon: Settings },
] as const;

export function BottomNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    pathname === to || (to !== "/home" && pathname.startsWith(to));

  const crmActive = pathname.startsWith("/crm");

  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] items-end justify-around border-t border-border/60 bg-background/85 px-2 pt-2 backdrop-blur-xl"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        boxShadow: "0 -8px 24px rgba(6, 43, 73, 0.06)",
      }}
    >
      {leftItems.map(({ to, label, icon: Icon }) => (
        <NavItem key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
      ))}

      {/* CRM em destaque no centro */}
      <div className="relative -mt-8 flex flex-col items-center">
        <Link
          to="/crm"
          aria-label="CRM"
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground transition-transform active:scale-95",
            "bg-gradient-to-br from-primary to-[#00afa5]",
          )}
          style={{
            boxShadow: crmActive
              ? "0 14px 34px rgba(8,199,186,0.55), 0 0 0 4px rgba(8,199,186,0.18)"
              : "0 12px 28px rgba(8,199,186,0.4)",
          }}
        >
          <TrendingUp size={26} strokeWidth={2.6} />
        </Link>
        <span
          className={cn(
            "mt-1 text-[11px] leading-[14px]",
            crmActive ? "font-bold text-primary" : "font-semibold text-foreground",
          )}
        >
          CRM
        </span>
      </div>

      {rightItems.map(({ to, label, icon: Icon }) => (
        <NavItem key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
      ))}
    </nav>
  );
}

function NavItem({
  to, label, Icon, active,
}: {
  to: string; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-w-[60px] flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-colors",
        active ? "text-primary" : "text-icon-muted",
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active ? "text-primary" : "text-icon-muted"} />
      <span className={cn("text-[11px] leading-[14px]", active ? "font-semibold" : "font-medium")}>
        {label}
      </span>
    </Link>
  );
}
