import { type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Users, Receipt, CalendarClock,
  Webhook, Activity, ShieldCheck, Settings, Menu, LogOut, ArrowLeft, MessageCircle,
  ChevronRight, Zap, Megaphone, ShieldAlert, Handshake, Wallet, Ticket, Trophy, DollarSign, Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireSuperAdmin } from "@/lib/admin-auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/lib/theme";
import { AppLogo } from "@/components/fisioflow/AppLogo";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ to: "/admin/dashboard", label: "Visão Geral", icon: LayoutDashboard }] },
  { label: "Clientes", items: [
    { to: "/admin/empresas", label: "Empresas", icon: Building2 },
    { to: "/admin/usuarios", label: "Usuários", icon: Users },
  ]},
  { label: "Financeiro", items: [
    { to: "/admin/mensalidades", label: "Mensalidades", icon: Receipt },
    { to: "/admin/vencimentos", label: "Vencimentos", icon: CalendarClock },
    { to: "/admin/cobranca", label: "Cobrança & Dunning", icon: Zap },
  ]},
  { label: "Comunicação", items: [
    { to: "/admin/whatsapp", label: "API WhatsApp", icon: MessageCircle },
    { to: "/admin/transmissao", label: "Transmissão", icon: Megaphone },
    { to: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  ]},
  { label: "Marketing", items: [
    { to: "/admin/marketing/afiliados", label: "Afiliados", icon: Handshake },
    { to: "/admin/marketing/comissoes", label: "Comissões", icon: DollarSign },
    { to: "/admin/marketing/pagamentos", label: "Pagamentos", icon: Wallet },
    { to: "/admin/marketing/cupons", label: "Cupons", icon: Ticket },
    { to: "/admin/marketing/ranking", label: "Ranking", icon: Trophy },
  ]},
  { label: "Sistema", items: [
    { to: "/admin/eventos", label: "Eventos", icon: Activity },
    { to: "/admin/auditoria", label: "Auditoria", icon: ShieldCheck },
    { to: "/admin/seguranca", label: "Segurança", icon: ShieldAlert },
    { to: "/admin/politicas", label: "Políticas & LGPD", icon: Scale },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ]},
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex h-full flex-col bg-[#062B49] text-white dark:bg-[#050f1a]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-center rounded-2xl bg-white px-3 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
          <AppLogo size={40} />
        </div>
        <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Painel Master
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-gradient-to-r from-[#08C7BA] to-[#00afa5] text-white font-medium shadow-[0_6px_16px_rgba(8,199,186,0.32)]"
                        : "text-white/75 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          to="/home"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao app
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { ready, isSuper } = useRequireSuperAdmin();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando painel…</div>
      </div>
    );
  }
  if (!isSuper) return null;

  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div className="flex min-h-screen w-full bg-[#F6F3F0] text-foreground dark:bg-[#0a1622]">
      {/* Sidebar desktop — sticky, sem gap em telas largas */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl dark:bg-[#0a1622]/85">
          <div className="flex items-center gap-3 px-4 py-3 md:px-8">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-none">
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    <span className={cn(i === crumbs.length - 1 && "text-foreground font-medium")}>{c}</span>
                  </span>
                ))}
              </div>
              <h1 className="truncate text-base font-semibold text-foreground md:text-lg">{title}</h1>
              {subtitle && <div className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</div>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label, value, sublabel, tone = "default", icon: Icon, trend,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "default" | "success" | "warning" | "danger" | "brand";
  icon?: typeof LayoutDashboard;
  trend?: { value: number; label?: string };
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-[#20A97A] dark:text-[#3DDC97]",
    warning: "text-[#B98A2E] dark:text-[#F6C85F]",
    danger: "text-[#D0453F] dark:text-[#EF6B6B]",
    brand: "text-[#08C7BA]",
  }[tone];
  const iconBg = {
    default: "bg-foreground/8 text-foreground",
    success: "bg-[#3DDC97]/15 text-[#20A97A] dark:text-[#3DDC97]",
    warning: "bg-[#F6C85F]/20 text-[#8A6B21] dark:text-[#F6C85F]",
    danger: "bg-[#EF6B6B]/15 text-[#D0453F] dark:text-[#EF6B6B]",
    brand: "bg-[#08C7BA]/15 text-[#08C7BA]",
  }[tone];
  const glow = {
    default: "",
    success: "before:bg-[#3DDC97]",
    warning: "before:bg-[#F6C85F]",
    danger: "before:bg-[#EF6B6B]",
    brand: "before:bg-[#08C7BA]",
  }[tone];
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_rgba(6,43,73,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(6,43,73,0.1)]",
      "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:opacity-0 before:transition-opacity hover:before:opacity-100",
      glow,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={cn("mt-2 text-2xl font-bold tabular-nums", toneClass)}>{value}</div>
          {sublabel && <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>}
          {trend && (
            <div className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend.value >= 0 ? "bg-[#3DDC97]/15 text-[#20A97A] dark:text-[#3DDC97]" : "bg-[#EF6B6B]/15 text-[#D0453F] dark:text-[#EF6B6B]",
            )}>
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%
              {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativa", cls: "bg-[#3DDC97]/15 text-[#20A97A] dark:text-[#3DDC97]" },
    trial: { label: "Teste", cls: "bg-[#F6C85F]/20 text-[#8A6B21] dark:text-[#F6C85F]" },
    blocked: { label: "Bloqueada", cls: "bg-[#EF6B6B]/15 text-[#D0453F] dark:text-[#EF6B6B]" },
    cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
    overdue: { label: "Vencida", cls: "bg-[#EF6B6B]/15 text-[#D0453F] dark:text-[#EF6B6B]" },
    pending_payment: { label: "Pagto pendente", cls: "bg-[#F6C85F]/20 text-[#8A6B21] dark:text-[#F6C85F]" },
    pending: { label: "Pendente", cls: "bg-[#F6C85F]/20 text-[#8A6B21] dark:text-[#F6C85F]" },
    paid: { label: "Paga", cls: "bg-[#3DDC97]/15 text-[#20A97A] dark:text-[#3DDC97]" },
    refunded: { label: "Estornada", cls: "bg-muted text-muted-foreground" },
    manual_release: { label: "Liberada", cls: "bg-[#08C7BA]/15 text-[#08C7BA]" },
    success: { label: "Sucesso", cls: "bg-[#3DDC97]/15 text-[#20A97A] dark:text-[#3DDC97]" },
    failed: { label: "Falhou", cls: "bg-[#EF6B6B]/15 text-[#D0453F] dark:text-[#EF6B6B]" },
    retrying: { label: "Repetindo", cls: "bg-[#F6C85F]/20 text-[#8A6B21] dark:text-[#F6C85F]" },
    inactive: { label: "Inativo", cls: "bg-muted text-muted-foreground" },
    disabled: { label: "Desativado", cls: "bg-muted text-muted-foreground" },
    invited: { label: "Convidado", cls: "bg-[#08C7BA]/15 text-[#08C7BA]" },
  };
  const e = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", e.cls)}>{e.label}</span>;
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-[0_8px_24px_rgba(6,43,73,0.05)]", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      {action}
    </div>
  );
}
