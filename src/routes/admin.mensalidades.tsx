import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { recordAudit, recordEvent } from "@/lib/admin-auth";
import { sendChargeReminder } from "@/lib/whatsapp.functions";
import { MessageCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/mensalidades")({
  head: () => ({ meta: [{ title: "Mensalidades — Admin FisioFlow" }] }),
  component: MensalidadesPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MensalidadesPage() {
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["admin-invoices", filter],
    queryFn: async () => {
      let q = supabase.from("invoices").select("*, workspaces(name, responsible_name, phone)").order("due_date", { ascending: false }).limit(300);
      if (filter !== "all") q = q.eq("status", filter as never);
      const { data } = await q;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; status: string; workspaceId: string }) => {
      const patch: Record<string, unknown> = { status: input.status };
      if (input.status === "paid") patch.paid_at = new Date().toISOString();
      const { error } = await supabase.from("invoices").update(patch as never).eq("id", input.id);
      if (error) throw error;
      await recordEvent(`payment.${input.status}`, input.workspaceId, { invoice_id: input.id });
      await recordAudit({ workspaceId: input.workspaceId, action: `invoice.${input.status}`, entityType: "invoice", entityId: input.id, newData: patch });
    },
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin-invoices"] }); },
  });

  const doCharge = useServerFn(sendChargeReminder);
  const charge = useMutation({
    mutationFn: (invoiceId: string) => doCharge({ data: { invoiceId } }),
    onSuccess: () => toast.success("Cobrança enviada no WhatsApp"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Mensalidades">
      <AdminCard className="p-4 flex flex-wrap gap-2">
        {["all", "pending", "paid", "overdue", "cancelled", "refunded", "manual_release"].map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === k ? "bg-[#062B49] text-white" : "bg-muted text-muted-foreground"}`}>
            {k === "all" ? "Todas" : k}
          </button>
        ))}
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nenhuma mensalidade.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pago em</th><th className="px-4 py-3">Ação</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.map((i) => {
                  const ws = (i as { workspaces: { name?: string; responsible_name?: string } | null }).workspaces;
                  const overdueDays = i.status === "overdue" ? Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000) : null;
                  return (
                    <tr key={i.id}>
                      <td className="px-4 py-3"><div className="font-medium">{ws?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{ws?.responsible_name ?? ""}</div></td>
                      <td className="px-4 py-3">{BRL(Number(i.amount))}</td>
                      <td className="px-4 py-3">{i.due_date} {overdueDays ? <span className="text-xs text-[#D0453F]">({overdueDays}d)</span> : null}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i.paid_at ? new Date(i.paid_at).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={charge.isPending || i.status === "paid"}
                            onClick={() => charge.mutate(i.id)}
                            title="Enviar cobrança via WhatsApp"
                          >
                            {charge.isPending && charge.variables === i.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <MessageCircle className="h-3.5 w-3.5" />}
                          </Button>
                          <Select onValueChange={(v) => update.mutate({ id: i.id, status: v, workspaceId: i.workspace_id })}>
                            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Alterar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Marcar paga</SelectItem>
                              <SelectItem value="overdue">Marcar vencida</SelectItem>
                              <SelectItem value="cancelled">Cancelar</SelectItem>
                              <SelectItem value="refunded">Estornar</SelectItem>
                              <SelectItem value="manual_release">Liberar manualmente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
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
