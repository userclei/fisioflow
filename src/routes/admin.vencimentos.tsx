import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordEvent, recordAudit } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/vencimentos")({
  head: () => ({ meta: [{ title: "Vencimentos — Admin FisioFlow" }] }),
  component: VencimentosPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const addDays = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

const TABS = [
  { key: "today", label: "Vencem hoje" },
  { key: "3days", label: "3 dias" },
  { key: "7days", label: "7 dias" },
  { key: "overdue", label: "Vencidas" },
  { key: "blocked", label: "Bloqueadas" },
] as const;

function VencimentosPage() {
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("today");
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-vencimentos", tab],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      if (tab === "blocked") {
        const { data } = await supabase.from("workspaces").select("*, invoices!inner(amount, due_date, status)").eq("status", "blocked");
        return data ?? [];
      }
      let q = supabase.from("invoices").select("*, workspaces(name, phone, responsible_name)");
      if (tab === "today") q = q.eq("status", "pending").eq("due_date", today);
      else if (tab === "3days") q = q.eq("status", "pending").gte("due_date", today).lte("due_date", addDays(3));
      else if (tab === "7days") q = q.eq("status", "pending").gte("due_date", today).lte("due_date", addDays(7));
      else if (tab === "overdue") q = q.eq("status", "overdue");
      const { data } = await q.order("due_date").limit(200);
      return data ?? [];
    },
  });

  const markPaid = useMutation({
    mutationFn: async (i: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() } as never).eq("id", i.id);
      if (error) throw error;
      await recordEvent("payment.paid", i.workspaceId, { invoice_id: i.id });
      await recordAudit({ workspaceId: i.workspaceId, action: "invoice.paid", entityType: "invoice", entityId: i.id });
    },
    onSuccess: () => { toast.success("Marcada como paga"); qc.invalidateQueries({ queryKey: ["admin-vencimentos"] }); },
  });

  const unblock = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workspaces").update({ status: "active" } as never).eq("id", id);
      await recordEvent("company.unblocked", id, {});
    },
    onSuccess: () => { toast.success("Empresa liberada"); qc.invalidateQueries({ queryKey: ["admin-vencimentos"] }); },
  });

  return (
    <AdminShell title="Vencimentos">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === t.key ? "bg-[#062B49] text-white" : "bg-muted text-muted-foreground"}`}>{t.label}</button>
        ))}
      </div>

      <AdminCard className="overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Carregando…</div> : data.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nada por aqui.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Empresa</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ação</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.map((row) => {
                  if (tab === "blocked") {
                    const w = row as { id: string; name: string; phone: string | null; monthly_price: number | null; due_date: string | null; status: string };
                    return (
                      <tr key={w.id}>
                        <td className="px-4 py-3"><Link to="/admin/empresas/$id" params={{ id: w.id }} className="font-medium text-[#08C7BA] hover:underline">{w.name}</Link></td>
                        <td className="px-4 py-3 text-muted-foreground">{w.phone ?? "—"}</td>
                        <td className="px-4 py-3">{w.monthly_price ? BRL(Number(w.monthly_price)) : "—"}</td>
                        <td className="px-4 py-3">{w.due_date ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                        <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => unblock.mutate(w.id)}>Liberar</Button></td>
                      </tr>
                    );
                  }
                  const i = row as { id: string; workspace_id: string; amount: number; due_date: string; status: string; workspaces: { name?: string; phone?: string } | null };
                  const days = Math.floor((new Date(i.due_date).getTime() - Date.now()) / 86400000);
                  return (
                    <tr key={i.id}>
                      <td className="px-4 py-3"><Link to="/admin/empresas/$id" params={{ id: i.workspace_id }} className="font-medium text-[#08C7BA] hover:underline">{i.workspaces?.name ?? "—"}</Link></td>
                      <td className="px-4 py-3 text-muted-foreground">{i.workspaces?.phone ?? "—"}</td>
                      <td className="px-4 py-3">{BRL(Number(i.amount))}</td>
                      <td className="px-4 py-3">{i.due_date} <span className="text-xs text-muted-foreground">({days >= 0 ? `${days}d` : `${-days}d atraso`})</span></td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                      <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => markPaid.mutate({ id: i.id, workspaceId: i.workspace_id })}>Marcar paga</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
