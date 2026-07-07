import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { listPayouts, markPayoutPaid } from "@/lib/affiliates.functions";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/marketing/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos de afiliados — Admin FisioFlow" }] }),
  component: Page,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function Page() {
  const fn = useServerFn(listPayouts);
  const { data } = useQuery({ queryKey: ["payouts"], queryFn: () => fn() });
  return (
    <AdminShell title="Pagamentos de afiliados" subtitle="Lotes de pagamento gerados a partir de comissões disponíveis">
      <AdminCard className="p-5">
        <SectionHeader title="Lotes de pagamento" description="Gere lotes no detalhe de cada afiliado e marque como pago aqui" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Afiliado</th>
                <th className="py-2 px-3">PIX</th>
                <th className="py-2 px-3">Total</th>
                <th className="py-2 px-3">Método</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Pago em</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p: any) => (
                <tr key={p.id} className="border-b border-border">
                  <td className="py-2 px-3">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2 px-3 font-medium">{p.affiliate?.name}</td>
                  <td className="py-2 px-3 text-xs">{p.affiliate?.pix_key || "—"}</td>
                  <td className="py-2 px-3 font-medium">{fmt(Number(p.total_amount))}</td>
                  <td className="py-2 px-3 uppercase text-xs">{p.method}</td>
                  <td className="py-2 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2 px-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="py-2 px-3 text-right">
                    {p.status !== "paid" && <MarkPaid payoutId={p.id} />}
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum pagamento.</td></tr>}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}

function MarkPaid({ payoutId }: { payoutId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [ref, setRef] = useState("");
  const fn = useServerFn(markPayoutPaid);
  const m = useMutation({
    mutationFn: () => fn({ data: { payout_id: payoutId, receipt_url: receipt || undefined, reference: ref || undefined } }),
    onSuccess: () => { toast.success("Pagamento confirmado"); qc.invalidateQueries({ queryKey: ["payouts"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1"><CheckCircle2 className="h-4 w-4" /> Marcar pago</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Comprovante (URL)</Label><Input value={receipt} onChange={e => setReceipt(e.target.value)} placeholder="https://…" /></div>
          <div><Label>Referência</Label><Input value={ref} onChange={e => setRef(e.target.value)} placeholder="ID transação PIX / TED" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
