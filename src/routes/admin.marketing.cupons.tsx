import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, SectionHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Ticket, Plus } from "lucide-react";
import { listCoupons, upsertCoupon, listAffiliates } from "@/lib/affiliates.functions";

export const Route = createFileRoute("/admin/marketing/cupons")({
  head: () => ({ meta: [{ title: "Cupons — Admin FisioFlow" }] }),
  component: Page,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function Page() {
  const fn = useServerFn(listCoupons);
  const { data } = useQuery({ queryKey: ["coupons"], queryFn: () => fn() });
  return (
    <AdminShell title="Cupons de afiliados" subtitle="Cupons vinculados que servem também como atribuição forçada">
      <AdminCard className="p-5">
        <SectionHeader title="Todos os cupons" action={<NewCouponButton />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Afiliado</th>
                <th className="py-2 px-3">Desconto</th>
                <th className="py-2 px-3">Usos</th>
                <th className="py-2 px-3">Validade</th>
                <th className="py-2 px-3">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-border">
                  <td className="py-2 px-3"><code className="font-bold text-foreground">{c.code}</code></td>
                  <td className="py-2 px-3">{c.affiliate?.name}</td>
                  <td className="py-2 px-3">{c.discount_type === "percent" ? `${c.discount_value}%` : fmt(Number(c.discount_value))}</td>
                  <td className="py-2 px-3">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="py-2 px-3">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="py-2 px-3">{c.active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum cupom.</td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}

function NewCouponButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ affiliate_id: "", code: "", discount_type: "percent", discount_value: 10, active: true });
  const listAffFn = useServerFn(listAffiliates);
  const upFn = useServerFn(upsertCoupon);
  const { data: affs } = useQuery({ queryKey: ["aff-select"], queryFn: () => listAffFn({ data: { status: "active" } }), enabled: open });
  const m = useMutation({
    mutationFn: () => upFn({ data: { ...form, discount_value: Number(form.discount_value) } as any }),
    onSuccess: () => { toast.success("Cupom criado"); qc.invalidateQueries({ queryKey: ["coupons"] }); setOpen(false); setForm({ affiliate_id: "", code: "", discount_type: "percent", discount_value: 10, active: true }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo cupom</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar cupom</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Afiliado *</Label>
            <Select value={form.affiliate_id} onValueChange={v => setForm({ ...form, affiliate_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(affs ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} — {a.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Código *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX: JOAO10" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percent">Percentual</SelectItem><SelectItem value="fixed">Valor fixo</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.affiliate_id || !form.code}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
