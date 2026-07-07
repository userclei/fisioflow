import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell, StatCard, AdminCard, StatusBadge, SectionHeader } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Users, Receipt, TrendingUp, AlertTriangle, MessageCircle,
  Webhook, Activity, DollarSign, UserPlus, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Visão Geral — Admin FisioFlow" }] }),
  component: DashboardPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const N = (n: number) => n.toLocaleString("pt-BR");

type Invoice = { amount: number; status: string; paid_at: string | null; created_at: string; due_date: string; workspace_id: string };
type Workspace = { id: string; name: string; status: string; monthly_price: number | null; plan: string; created_at: string; due_date: string | null; last_access_at: string | null };
type EventRow = { id: string; event_type: string; created_at: string; source: string; workspace_id: string | null };
type WhatsLog = { status: string; created_at: string };

const CHART_COLORS = ["#08C7BA", "#062B49", "#F6C85F", "#EF6B6B", "#3DDC97", "#7C6EF2"];

function DashboardPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subDays(monthStart, 1));
  const prevMonthEnd = endOfMonth(subDays(monthStart, 1));
  const last30 = subDays(now, 30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview-v2"],
    staleTime: 30_000,
    queryFn: async () => {
      const [
        wsRes, usersRes, invAllRes, invMonthRes, invPrevRes,
        eventsRes, waRes, webhookRes,
      ] = await Promise.all([
        supabase.from("workspaces").select("id,name,status,monthly_price,plan,created_at,due_date,last_access_at"),
        supabase.from("profiles").select("id,created_at"),
        supabase.from("invoices").select("amount,status,paid_at,created_at,due_date,workspace_id").gte("created_at", subDays(now, 90).toISOString()),
        supabase.from("invoices").select("amount,status,paid_at,workspace_id").gte("paid_at", monthStart.toISOString()).lte("paid_at", monthEnd.toISOString()).eq("status", "paid"),
        supabase.from("invoices").select("amount,status,paid_at").gte("paid_at", prevMonthStart.toISOString()).lte("paid_at", prevMonthEnd.toISOString()).eq("status", "paid"),
        supabase.from("events").select("id,event_type,created_at,source,workspace_id").gte("created_at", last30.toISOString()).order("created_at", { ascending: false }).limit(200),
        supabase.from("whatsapp_message_logs").select("status,created_at").gte("created_at", last30.toISOString()),
        supabase.from("webhook_deliveries").select("status,created_at").gte("created_at", last30.toISOString()),
      ]);

      const workspaces = (wsRes.data ?? []) as Workspace[];
      const users = (usersRes.data ?? []) as { id: string; created_at: string }[];
      const invoices = (invAllRes.data ?? []) as Invoice[];
      const paidMonth = (invMonthRes.data ?? []) as Invoice[];
      const paidPrev = (invPrevRes.data ?? []) as Invoice[];
      const events = (eventsRes.data ?? []) as EventRow[];
      const waLogs = (waRes.data ?? []) as WhatsLog[];
      const webhooks = (webhookRes.data ?? []) as { status: string; created_at: string }[];

      const activeWs = workspaces.filter((w) => w.status === "active");
      const trialWs = workspaces.filter((w) => w.status === "trial");
      const blockedWs = workspaces.filter((w) => w.status === "blocked");

      const mrr = activeWs.reduce((s, w) => s + Number(w.monthly_price ?? 0), 0);
      const arr = mrr * 12;

      const receitaMes = paidMonth.reduce((s, i) => s + Number(i.amount ?? 0), 0);
      const receitaPrev = paidPrev.reduce((s, i) => s + Number(i.amount ?? 0), 0);
      const revGrowth = receitaPrev > 0 ? ((receitaMes - receitaPrev) / receitaPrev) * 100 : 0;

      const pending = invoices.filter((i) => i.status === "pending");
      const overdue = invoices.filter((i) => i.status === "overdue");
      const receitaPrevista = pending.reduce((s, i) => s + Number(i.amount ?? 0), 0);
      const totalOverdue = overdue.reduce((s, i) => s + Number(i.amount ?? 0), 0);

      // Revenue by day (last 30d)
      const revByDay: Record<string, number> = {};
      const signupByDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const k = format(subDays(now, i), "yyyy-MM-dd");
        revByDay[k] = 0;
        signupByDay[k] = 0;
      }
      invoices.forEach((i) => {
        if (i.status === "paid" && i.paid_at) {
          const k = format(new Date(i.paid_at), "yyyy-MM-dd");
          if (k in revByDay) revByDay[k] += Number(i.amount ?? 0);
        }
      });
      workspaces.forEach((w) => {
        const k = format(new Date(w.created_at), "yyyy-MM-dd");
        if (k in signupByDay) signupByDay[k] += 1;
      });
      const revenueSeries = Object.entries(revByDay).map(([date, value]) => ({
        date: format(new Date(date), "dd/MM"), value,
      }));
      const signupSeries = Object.entries(signupByDay).map(([date, value]) => ({
        date: format(new Date(date), "dd/MM"), value,
      }));

      // Plan distribution
      const planMap: Record<string, number> = {};
      workspaces.forEach((w) => { planMap[w.plan] = (planMap[w.plan] ?? 0) + 1; });
      const planData = Object.entries(planMap).map(([name, value]) => ({ name, value }));

      // Top workspaces by MRR
      const topWs = [...activeWs]
        .sort((a, b) => Number(b.monthly_price ?? 0) - Number(a.monthly_price ?? 0))
        .slice(0, 5);

      // WhatsApp health
      const waSent = waLogs.length;
      const waDelivered = waLogs.filter((l) => l.status === "sent" || l.status === "delivered" || l.status === "read").length;
      const waFailed = waLogs.filter((l) => l.status === "failed").length;
      const waRate = waSent > 0 ? (waDelivered / waSent) * 100 : 0;

      // Webhook health
      const whTotal = webhooks.length;
      const whSuccess = webhooks.filter((w) => w.status === "success").length;
      const whFailed = webhooks.filter((w) => w.status === "failed").length;
      const whRate = whTotal > 0 ? (whSuccess / whTotal) * 100 : 0;

      // Signups today/week/month
      const today = startOfDay(now).getTime();
      const week = subDays(now, 7).getTime();
      const signupsToday = workspaces.filter((w) => new Date(w.created_at).getTime() >= today).length;
      const signupsWeek = workspaces.filter((w) => new Date(w.created_at).getTime() >= week).length;
      const signupsMonth = workspaces.filter((w) => new Date(w.created_at).getTime() >= monthStart.getTime()).length;

      // Trial → paid conversion (workspaces that were trial and are now active)
      const trialConverted = activeWs.length;
      const trialTotal = trialConverted + trialWs.length;
      const conversion = trialTotal > 0 ? (trialConverted / trialTotal) * 100 : 0;

      // Vencendo em 7 dias
      const in7 = subDays(now, -7).getTime();
      const vencendo = workspaces.filter((w) => w.due_date && new Date(w.due_date).getTime() <= in7 && new Date(w.due_date).getTime() >= now.getTime()).length;

      // Ticket médio (por fatura paga) e ARPU (MRR / clientes ativos)
      const ticketMedio = paidMonth.length > 0 ? receitaMes / paidMonth.length : 0;
      const arpu = activeWs.length > 0 ? mrr / activeWs.length : 0;
      // Churn aproximado = bloqueadas / (ativas + bloqueadas) no período
      const churn = (activeWs.length + blockedWs.length) > 0
        ? (blockedWs.length / (activeWs.length + blockedWs.length)) * 100
        : 0;
      // LTV simples = ARPU / (churn mensal / 100), fallback 12x quando churn=0
      const churnRate = Math.max(churn / 100, 0.001);
      const ltv = arpu / churnRate;

      return {
        workspaces, users,
        activeCount: activeWs.length, trialCount: trialWs.length, blockedCount: blockedWs.length,
        mrr, arr, receitaMes, revGrowth, receitaPrevista, totalOverdue,
        pendingCount: pending.length, overdueCount: overdue.length, paidCount: paidMonth.length,
        revenueSeries, signupSeries, planData, topWs,
        events, waRate, waSent, waFailed, whRate, whTotal, whFailed,
        signupsToday, signupsWeek, signupsMonth,
        conversion, vencendo,
        ticketMedio, arpu, churn, ltv,
      };
    },
  });

  return (
    <AdminShell title="Visão Geral" subtitle={`Atualizado em ${format(new Date(), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}`}>
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-card/60" />
          ))}
        </div>
      ) : (
        <>
          {/* Alertas */}
          {(data.blockedCount > 0 || data.overdueCount > 0 || data.whFailed > 0) && (
            <AdminCard className="border-l-4 border-l-[#EF6B6B] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-[#D0453F]" />
                <div className="flex-1 text-sm text-foreground">
                  <div className="font-semibold">Requer atenção</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {data.blockedCount > 0 && <span>• {data.blockedCount} empresa(s) bloqueada(s)</span>}
                    {data.overdueCount > 0 && <span>• {data.overdueCount} fatura(s) vencida(s) ({BRL(data.totalOverdue)})</span>}
                    {data.whFailed > 0 && <span>• {data.whFailed} webhook(s) falharam</span>}
                    {data.vencendo > 0 && <span>• {data.vencendo} vencimento(s) em 7 dias</span>}
                  </div>
                </div>
              </div>
            </AdminCard>
          )}

          {/* KPIs principais — Receita */}
          <div>
            <SectionHeader title="Receita" description="Métricas financeiras principais" />
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="MRR"
                value={BRL(data.mrr)}
                sublabel="Receita recorrente mensal"
                tone="brand"
                icon={TrendingUp}
              />
              <StatCard
                label="ARR"
                value={BRL(data.arr)}
                sublabel="Receita anual projetada"
                tone="default"
                icon={DollarSign}
              />
              <StatCard
                label="Recebido no mês"
                value={BRL(data.receitaMes)}
                sublabel={`${data.paidCount} fatura(s) paga(s)`}
                tone="success"
                icon={Receipt}
                trend={{ value: data.revGrowth, label: "vs mês anterior" }}
              />
              <StatCard
                label="Em atraso"
                value={BRL(data.totalOverdue)}
                sublabel={`${data.overdueCount} vencida(s)`}
                tone="danger"
                icon={AlertTriangle}
              />
            </div>
          </div>

          {/* KPIs — Clientes */}
          <div>
            <SectionHeader title="Clientes" description="Empresas e usuários da plataforma" />
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Empresas ativas" value={data.activeCount} tone="success" icon={Building2} />
              <StatCard label="Em teste" value={data.trialCount} tone="warning" icon={Clock} />
              <StatCard label="Bloqueadas" value={data.blockedCount} tone="danger" icon={AlertTriangle} />
              <StatCard label="Usuários totais" value={N(data.users.length)} tone="default" icon={Users} />
            </div>
          </div>

          {/* KPIs — Negócio (ARPU, Ticket, LTV, Churn) */}
          <div>
            <SectionHeader title="Métricas de negócio" description="Indicadores estratégicos SaaS" />
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="ARPU"
                value={BRL(data.arpu)}
                sublabel="Receita média por cliente ativo"
                tone="brand"
                icon={DollarSign}
              />
              <StatCard
                label="Ticket médio"
                value={BRL(data.ticketMedio)}
                sublabel="Por fatura paga no mês"
                tone="default"
                icon={Receipt}
              />
              <StatCard
                label="LTV estimado"
                value={BRL(data.ltv)}
                sublabel="Baseado no churn atual"
                tone="success"
                icon={TrendingUp}
              />
              <StatCard
                label="Churn"
                value={`${data.churn.toFixed(1)}%`}
                sublabel={`${data.blockedCount} de ${data.activeCount + data.blockedCount}`}
                tone={data.churn > 5 ? "danger" : "warning"}
                icon={AlertTriangle}
              />
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <AdminCard className="p-5 lg:col-span-2">
              <SectionHeader title="Receita — últimos 30 dias" description="Faturas pagas por dia" />
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueSeries}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#08C7BA" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#08C7BA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#8B96A5" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#8B96A5" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(v: number) => BRL(v)}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#08C7BA" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <SectionHeader title="Distribuição por plano" />
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.planData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45} paddingAngle={2}>
                      {data.planData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AdminCard>
          </div>

          {/* Growth + Saúde do sistema */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <AdminCard className="p-5 lg:col-span-2">
              <SectionHeader title="Novas empresas — últimos 30 dias" description="Cadastros por dia" />
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.signupSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#8B96A5" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#8B96A5" allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#062B49" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-center">
                <div>
                  <div className="text-lg font-bold text-foreground">{data.signupsToday}</div>
                  <div className="text-[11px] text-muted-foreground">Hoje</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{data.signupsWeek}</div>
                  <div className="text-[11px] text-muted-foreground">7 dias</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{data.signupsMonth}</div>
                  <div className="text-[11px] text-muted-foreground">Este mês</div>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <SectionHeader title="Saúde do sistema" description="Últimos 30 dias" />
              <div className="mt-4 space-y-4">
                <HealthBar
                  icon={MessageCircle}
                  label="WhatsApp"
                  rate={data.waRate}
                  total={data.waSent}
                  failed={data.waFailed}
                />
                <HealthBar
                  icon={Webhook}
                  label="Webhooks"
                  rate={data.whRate}
                  total={data.whTotal}
                  failed={data.whFailed}
                />
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Conversão trial → ativo
                  </div>
                  <div className="mt-1 text-xl font-bold text-foreground">{data.conversion.toFixed(1)}%</div>
                </div>
              </div>
            </AdminCard>
          </div>

          {/* Top clientes + Atividade recente */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <AdminCard className="p-5">
              <SectionHeader
                title="Top 5 empresas por MRR"
                action={<Link to="/admin/empresas" className="text-xs font-medium text-[#08C7BA] hover:underline">Ver todas →</Link>}
              />
              <div className="mt-4 divide-y divide-border">
                {data.topWs.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma empresa ativa ainda</div>
                ) : data.topWs.map((w, i) => (
                  <Link
                    key={w.id}
                    to="/admin/empresas/$id"
                    params={{ id: w.id }}
                    className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-[#08C7BA]/12 text-sm font-bold text-[#08C7BA]">
                      #{i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{w.name}</div>
                      <div className="text-[11px] text-muted-foreground">Plano {w.plan}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground tabular-nums">{BRL(Number(w.monthly_price ?? 0))}</div>
                      <StatusBadge status={w.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <SectionHeader
                title="Atividade recente"
                description="Últimos eventos do sistema"
                action={<Link to="/admin/eventos" className="text-xs font-medium text-[#08C7BA] hover:underline">Ver todos →</Link>}
              />
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                {data.events.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhum evento recente</div>
                ) : data.events.slice(0, 15).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#062B49]/8 text-foreground">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{ev.event_type}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(ev.created_at), "dd/MM HH:mm", { locale: ptBR })} · {ev.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>

          {/* Quick actions */}
          <AdminCard className="p-5">
            <SectionHeader title="Ações rápidas" />
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <QuickAction to="/admin/empresas" icon={Building2} label="Gerenciar empresas" />
              <QuickAction to="/admin/mensalidades" icon={Receipt} label="Ver mensalidades" />
              <QuickAction to="/admin/usuarios" icon={UserPlus} label="Convidar usuário" />
              <QuickAction to="/admin/whatsapp" icon={MessageCircle} label="WhatsApp" />
            </div>
          </AdminCard>
        </>
      )}
    </AdminShell>
  );
}

function HealthBar({ icon: Icon, label, rate, total, failed }: {
  icon: typeof MessageCircle; label: string; rate: number; total: number; failed: number;
}) {
  const color = rate >= 95 ? "#20A97A" : rate >= 80 ? "#B98A2E" : "#D0453F";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="tabular-nums font-semibold" style={{ color }}>{total > 0 ? rate.toFixed(1) : "—"}%</div>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${total > 0 ? rate : 0}%`, background: color }} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {N(total)} envio(s) · {N(failed)} falha(s)
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof Building2; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm text-foreground transition hover:border-[#08C7BA] hover:shadow-[0_6px_20px_rgba(8,199,186,0.15)]"
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#08C7BA]/12 text-[#08C7BA]">
        <Icon className="h-4 w-4" />
      </div>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
