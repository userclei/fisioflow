import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, StatCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { affiliatesOverview, listAffiliates, upsertAffiliate } from "@/lib/affiliates.functions";
import { Users, UserPlus, DollarSign, TrendingUp, Search, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/marketing/afiliados")({
  head: () => ({ meta: [{ title: "Afiliados — Admin FisioFlow" }] }),
  component: Page,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function Page() {
  const overviewFn = useServerFn(affiliatesOverview);
  const listFn = useServerFn(listAffiliates);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  const { data: ov } = useQuery({ queryKey: ["aff-overview"], queryFn: () => overviewFn() });
  const { data: list } = useQuery({
    queryKey: ["aff-list", search, status],
    queryFn: () => listFn({ data: { search: search || undefined, status: status || undefined } }),
  });

  return (
    <AdminShell title="Afiliados & Influenciadores" subtitle="Gestão de parceiros de indicação e programa de afiliados">
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Afiliados ativos" value={String(ov?.active ?? 0)} sublabel={`${ov?.pending ?? 0} pendentes`} tone="brand" icon={Users} />
        <StatCard label="Receita gerada" value={fmt(ov?.revenue_generated ?? 0)} sublabel="Conversões pagas" tone="success" icon={DollarSign} />
        <StatCard label="Comissões pendentes" value={fmt(ov?.commissions_pending ?? 0)} sublabel="A liberar / disponíveis" tone="warning" icon={TrendingUp} />
        <StatCard label="Comissões pagas" value={fmt(ov?.commissions_paid ?? 0)} sublabel="Total já quitado" tone="brand" icon={DollarSign} />
      </div>

      <AdminCard className="p-5">
        <SectionHeader
          title="Lista de afiliados"
          description="Cadastre, aprove, suspenda e acompanhe cada afiliado"
          action={<CreateAffiliateButton />}
        />
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou slug…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status || "all"} onValueChange={v => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
              <SelectItem value="banned">Banidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 px-3">Nome</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Tier</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Slug</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {(list ?? []).map((a: any) => (
                <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium text-foreground">{a.name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{a.email}</td>
                  <td className="py-2 px-3 capitalize">{a.type}</td>
                  <td className="py-2 px-3 capitalize">{a.tier}</td>
                  <td className="py-2 px-3"><StatusBadge status={a.status} /></td>
                  <td className="py-2 px-3 font-mono text-xs">/ref/{a.slug}</td>
                  <td className="py-2 px-3 text-right">
                    <Link to="/admin/marketing/afiliados/$id" params={{ id: a.id }}>
                      <Button size="sm" variant="ghost" className="gap-1">Abrir <ExternalLink className="h-3 w-3" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {(list ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum afiliado encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}

function CreateAffiliateButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", type: "influencer", tier: "bronze",
    pix_key: "", instagram: "", notes: "",
  });
  const fn = useServerFn(upsertAffiliate);
  const m = useMutation({
    mutationFn: () => fn({ data: { ...form } as any }),
    onSuccess: () => {
      toast.success("Afiliado criado");
      qc.invalidateQueries({ queryKey: ["aff-list"] });
      qc.invalidateQueries({ queryKey: ["aff-overview"] });
      setOpen(false);
      setForm({ name: "", email: "", phone: "", type: "influencer", tier: "bronze", pix_key: "", instagram: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="h-4 w-4" /> Novo afiliado</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar afiliado</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Chave PIX</Label>
              <Input value={form.pix_key} onChange={e => setForm({ ...form, pix_key: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="influencer">Influenciador</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="clinic">Clínica</SelectItem>
                  <SelectItem value="partner">Parceiro</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={v => setForm({ ...form, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Prata</SelectItem>
                  <SelectItem value="gold">Ouro</SelectItem>
                  <SelectItem value="platinum">Platina</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Instagram / handle</Label>
            <Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.name || !form.email}>
            {m.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
