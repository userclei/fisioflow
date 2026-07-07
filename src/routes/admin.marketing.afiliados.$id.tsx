import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, StatCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAffiliate, setAffiliateStatus, createAffiliateLink, createPayoutFromAvailable } from "@/lib/affiliates.functions";
import { ArrowLeft, Link2, MousePointer, DollarSign, TrendingUp, Ticket, Wallet, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/marketing/afiliados/$id")({
  head: () => ({ meta: [{ title: "Detalhes do afiliado — Admin FisioFlow" }] }),
  component: Page,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function Page() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fn = useServerFn(getAffiliate);
  const statusFn = useServerFn(setAffiliateStatus);
  const payoutFn = useServerFn(createPayoutFromAvailable);

  const { data, isLoading } = useQuery({ queryKey: ["aff", id], queryFn: () => fn({ data: { id } }) });

  const setStatus = useMutation({
    mutationFn: (s: string) => statusFn({ data: { id, status: s as any } }),
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["aff", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createPayout = useMutation({
    mutationFn: () => payoutFn({ data: { affiliate_id: id, method: "pix" } }),
    onSuccess: (r) => { toast.success(`Payout ${fmt((r as any).total)} — ${(r as any).count} comissões`); qc.invalidateQueries({ queryKey: ["aff", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data?.affiliate) {
    return <AdminShell title="Carregando…"><AdminCard className="p-5"><div className="py-8 text-center text-muted-foreground">Carregando…</div></AdminCard></AdminShell>;
  }
  const a = data.affiliate as any;
  const revenue = data.conversions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const commAvail = data.commissions.filter((c: any) => c.status === "available").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const commPaid = data.commissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const clicksTotal = data.links.reduce((s: number, l: any) => s + Number(l.clicks_count || 0), 0);

  return (
    <AdminShell title={a.name} subtitle={a.email}>
      <div className="mb-4 flex items-center gap-2">
        <Link to="/admin/marketing/afiliados"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Voltar</Button></Link>
        <div className="flex-1" />
        <StatusBadge status={a.status} />
        <Select value={a.status} onValueChange={v => setStatus.mutate(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="active">Ativar</SelectItem>
            <SelectItem value="suspended">Suspender</SelectItem>
            <SelectItem value="banned">Banir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Cliques" value={String(clicksTotal)} tone="brand" icon={MousePointer} />
        <StatCard label="Leads" value={String(data.leads.length)} tone="brand" icon={TrendingUp} />
        <StatCard label="Receita gerada" value={fmt(revenue)} tone="success" icon={DollarSign} />
        <StatCard label="Comissão disponível" value={fmt(commAvail)} sublabel={`Pagas: ${fmt(commPaid)}`} tone="warning" icon={Wallet} />
      </div>

      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="leads">Leads ({data.leads.length})</TabsTrigger>
          <TabsTrigger value="conversoes">Conversões ({data.conversions.length})</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões ({data.commissions.length})</TabsTrigger>
          <TabsTrigger value="cupons">Cupons ({data.coupons.length})</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos ({data.payouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <AdminCard className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Slug público" value={`/ref/${a.slug}`} />
              <Info label="Tipo" value={a.type} />
              <Info label="Tier" value={a.tier} />
              <Info label="Chave PIX" value={a.pix_key || "—"} />
              <Info label="Instagram" value={a.instagram || "—"} />
              <Info label="Telefone" value={a.phone || "—"} />
              <Info label="Cookie (dias)" value={String(a.cookie_days)} />
              <Info label="Comissão custom" value={a.custom_commission_pct ? `${a.custom_commission_pct}%` : a.custom_commission_fixed ? fmt(a.custom_commission_fixed) : "Regra padrão"} />
            </div>
            {a.notes && <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm"><strong>Notas:</strong> {a.notes}</div>}
          </AdminCard>
        </TabsContent>

        <TabsContent value="links">
          <AdminCard className="p-5">
            <SectionHeader title="Links de rastreamento" action={<CreateLinkButton affiliateId={id} />} />
            <SimpleTable
              rows={data.links}
              cols={[
                { h: "Slug", r: (l: any) => <code className="text-xs">/ref/{a.slug}?c={l.slug}</code> },
                { h: "Campanha", r: (l: any) => l.campaign || "—" },
                { h: "Destino", r: (l: any) => l.destination_url },
                { h: "Cliques", r: (l: any) => l.clicks_count },
                { h: "Leads", r: (l: any) => l.leads_count },
                { h: "Conversões", r: (l: any) => l.conversions_count },
              ]}
            />
          </AdminCard>
        </TabsContent>

        <TabsContent value="leads">
          <AdminCard className="p-5">
            <SimpleTable
              rows={data.leads}
              cols={[
                { h: "Data", r: (l: any) => new Date(l.created_at).toLocaleString("pt-BR") },
                { h: "Nome", r: (l: any) => l.name || "—" },
                { h: "Email", r: (l: any) => l.email || "—" },
                { h: "Atribuição", r: (l: any) => <Badge variant="outline">{l.attribution_model}</Badge> },
              ]}
            />
          </AdminCard>
        </TabsContent>

        <TabsContent value="conversoes">
          <AdminCard className="p-5">
            <SimpleTable
              rows={data.conversions}
              cols={[
                { h: "Data", r: (c: any) => new Date(c.created_at).toLocaleString("pt-BR") },
                { h: "Plano", r: (c: any) => c.plan },
                { h: "Valor", r: (c: any) => fmt(Number(c.amount)) },
                { h: "Status", r: (c: any) => <StatusBadge status={c.status} /> },
                { h: "Cupom", r: (c: any) => c.coupon_code || "—" },
              ]}
            />
          </AdminCard>
        </TabsContent>

        <TabsContent value="comissoes">
          <AdminCard className="p-5">
            <SectionHeader
              title="Comissões geradas"
              action={
                <Button size="sm" className="gap-2" onClick={() => createPayout.mutate()} disabled={createPayout.isPending || commAvail === 0}>
                  <Wallet className="h-4 w-4" /> Gerar payout ({fmt(commAvail)})
                </Button>
              }
            />
            <SimpleTable
              rows={data.commissions}
              cols={[
                { h: "Data", r: (c: any) => new Date(c.created_at).toLocaleString("pt-BR") },
                { h: "Base", r: (c: any) => fmt(Number(c.base_amount || 0)) },
                { h: "Comissão", r: (c: any) => <span className="font-medium">{fmt(Number(c.amount))}</span> },
                { h: "Status", r: (c: any) => <StatusBadge status={c.status} /> },
                { h: "Liberação", r: (c: any) => c.available_at ? new Date(c.available_at).toLocaleDateString("pt-BR") : "—" },
              ]}
            />
          </AdminCard>
        </TabsContent>

        <TabsContent value="cupons">
          <AdminCard className="p-5">
            <SectionHeader title="Cupons vinculados" description="Gerencie cupons na aba /admin/marketing/cupons" />
            <SimpleTable
              rows={data.coupons}
              cols={[
                { h: "Código", r: (c: any) => <code className="font-bold">{c.code}</code> },
                { h: "Desconto", r: (c: any) => c.discount_type === "percent" ? `${c.discount_value}%` : fmt(Number(c.discount_value)) },
                { h: "Usos", r: (c: any) => `${c.uses_count}${c.max_uses ? ` / ${c.max_uses}` : ""}` },
                { h: "Ativo", r: (c: any) => c.active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" /> },
              ]}
            />
          </AdminCard>
        </TabsContent>

        <TabsContent value="pagamentos">
          <AdminCard className="p-5">
            <SimpleTable
              rows={data.payouts}
              cols={[
                { h: "Data", r: (p: any) => new Date(p.created_at).toLocaleString("pt-BR") },
                { h: "Total", r: (p: any) => <span className="font-medium">{fmt(Number(p.total_amount))}</span> },
                { h: "Método", r: (p: any) => p.method },
                { h: "Ref", r: (p: any) => p.reference || "—" },
                { h: "Status", r: (p: any) => <StatusBadge status={p.status} /> },
                { h: "Pago em", r: (p: any) => p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—" },
              ]}
            />
          </AdminCard>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function SimpleTable({ rows, cols }: { rows: any[]; cols: Array<{ h: string; r: (row: any) => any }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b border-border">
          <tr>{cols.map(c => <th key={c.h} className="py-2 px-3">{c.h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-border">{cols.map(c => <td key={c.h} className="py-2 px-3">{c.r(row)}</td>)}</tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} className="py-6 text-center text-muted-foreground">Sem registros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CreateLinkButton({ affiliateId }: { affiliateId: string }) {
  const qc = useQueryClient();
  const [campaign, setCampaign] = useState("");
  const [dest, setDest] = useState("/");
  const fn = useServerFn(createAffiliateLink);
  const m = useMutation({
    mutationFn: () => fn({ data: { affiliate_id: affiliateId, campaign, destination_url: dest } }),
    onSuccess: () => { toast.success("Link criado"); qc.invalidateQueries({ queryKey: ["aff", affiliateId] }); setCampaign(""); setDest("/"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="flex gap-2">
      <Input placeholder="Campanha" value={campaign} onChange={e => setCampaign(e.target.value)} className="w-40" />
      <Input placeholder="Destino" value={dest} onChange={e => setDest(e.target.value)} className="w-40" />
      <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending} className="gap-1"><Link2 className="h-4 w-4" /> Criar</Button>
    </div>
  );
}
