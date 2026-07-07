import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell, AdminCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { affiliateRanking } from "@/lib/affiliates.functions";
import { Trophy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/marketing/ranking")({
  head: () => ({ meta: [{ title: "Ranking de afiliados — Admin FisioFlow" }] }),
  component: Page,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function Page() {
  const [days, setDays] = useState(30);
  const fn = useServerFn(affiliateRanking);
  const { data } = useQuery({ queryKey: ["aff-ranking", days], queryFn: () => fn({ data: { period_days: days } }) });

  return (
    <AdminShell title="Ranking de afiliados" subtitle="Performance por período">
      <AdminCard className="p-5">
        <SectionHeader
          title={`Top afiliados — últimos ${days} dias`}
          action={
            <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Afiliado</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Cliques</th>
                <th className="py-2 px-3 text-right">Leads</th>
                <th className="py-2 px-3 text-right">Conversões</th>
                <th className="py-2 px-3 text-right">Receita</th>
                <th className="py-2 px-3 text-right">CVR</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r: any, i: number) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="py-2 px-3 font-bold text-foreground">
                    {i < 3 ? <Trophy className={`h-4 w-4 inline ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : "text-orange-600"}`} /> : i + 1}
                  </td>
                  <td className="py-2 px-3 font-medium">{r.name}</td>
                  <td className="py-2 px-3 capitalize">{r.type}</td>
                  <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2 px-3 text-right">{r.clicks}</td>
                  <td className="py-2 px-3 text-right">{r.leads}</td>
                  <td className="py-2 px-3 text-right">{r.conversions}</td>
                  <td className="py-2 px-3 text-right font-medium text-foreground">{fmt(r.revenue)}</td>
                  <td className="py-2 px-3 text-right">{r.clicks > 0 ? `${((r.conversions / r.clicks) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-2 px-3 text-right">
                    <Link to="/admin/marketing/afiliados/$id" params={{ id: r.id }}>
                      <Button size="sm" variant="ghost"><ExternalLink className="h-3 w-3" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">Sem dados no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
