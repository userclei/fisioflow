import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/webhooks")({
  head: () => ({ meta: [{ title: "Webhooks — Admin FisioFlow" }] }),
  component: WebhooksPage,
});

const AVAILABLE_EVENTS = [
  "company.created", "company.updated", "company.blocked", "company.unblocked",
  "user.created", "user.updated",
  "subscription.created", "subscription.updated",
  "payment.created", "payment.paid", "payment.overdue", "payment.cancelled",
  "login.success", "login.failed",
  "patient.created", "charge.created", "appointment.created",
];

function WebhooksPage() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: hooks = [] } = useQuery({
    queryKey: ["admin-webhooks"],
    queryFn: async () => (await supabase.from("webhooks").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["admin-webhook-deliveries", selected],
    enabled: !!selected,
    queryFn: async () => (await supabase.from("webhook_deliveries").select("*").eq("webhook_id", selected!).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (form: { name: string; url: string; description: string; events: string[] }) => {
      const { error } = await supabase.from("webhooks").insert({ name: form.name, url: form.url, description: form.description, events: form.events } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Webhook criado"); qc.invalidateQueries({ queryKey: ["admin-webhooks"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (w: { id: string; status: string }) => {
      const next = w.status === "active" ? "inactive" : "active";
      await supabase.from("webhooks").update({ status: next } as never).eq("id", w.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-webhooks"] }),
  });

  const retry = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("webhook_deliveries").update({ status: "pending", next_retry_at: new Date().toISOString() } as never).eq("id", id);
    },
    onSuccess: () => { toast.success("Reenvio agendado"); qc.invalidateQueries({ queryKey: ["admin-webhook-deliveries"] }); },
  });

  return (
    <AdminShell title="Webhooks" actions={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" className="bg-[#08C7BA] hover:bg-[#00afa5]"><Plus className="h-4 w-4 mr-1" /> Novo</Button></DialogTrigger>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Novo webhook</DialogTitle></DialogHeader>
          <NewWebhookForm onSubmit={(f) => create.mutate(f)} loading={create.isPending} />
        </DialogContent>
      </Dialog>
    }>
      <AdminCard className="overflow-hidden">
        {hooks.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum webhook cadastrado.</div> : (
          <div className="divide-y divide-border">
            {hooks.map((w) => (
              <div key={w.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-foreground">{w.name}</div>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">{w.url}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(w.events ?? []).slice(0, 6).map((e: string) => (
                        <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{e}</span>
                      ))}
                      {(w.events ?? []).length > 6 && <span className="text-[10px] text-muted-foreground">+{(w.events ?? []).length - 6}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch checked={w.status === "active"} onCheckedChange={() => toggle.mutate({ id: w.id, status: w.status })} />
                    <Button size="sm" variant="ghost" onClick={() => setSelected(selected === w.id ? null : w.id)}>{selected === w.id ? "Ocultar" : "Histórico"}</Button>
                  </div>
                </div>
                {selected === w.id && (
                  <div className="mt-3 rounded-xl bg-muted/40 p-2">
                    {deliveries.length === 0 ? <div className="p-3 text-xs text-muted-foreground">Sem envios ainda.</div> : (
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-muted-foreground"><th className="px-2 py-2">Evento</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">HTTP</th><th className="px-2 py-2">Tentativas</th><th className="px-2 py-2">Data</th><th></th></tr></thead>
                        <tbody>
                          {deliveries.map((d) => (
                            <tr key={d.id} className="border-t border-border/50">
                              <td className="px-2 py-2">{d.event_type}</td>
                              <td className="px-2 py-2"><StatusBadge status={d.status} /></td>
                              <td className="px-2 py-2">{d.response_status ?? "—"}</td>
                              <td className="px-2 py-2">{d.attempts}</td>
                              <td className="px-2 py-2 text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-BR")}</td>
                              <td className="px-2 py-2"><Button size="sm" variant="ghost" onClick={() => retry.mutate(d.id)}><RefreshCw className="h-3 w-3" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}

function NewWebhookForm({ onSubmit, loading }: { onSubmit: (f: { name: string; url: string; description: string; events: string[] }) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const toggle = (e: string) => setEvents((cur) => cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]);

  return (
    <div className="space-y-3">
      <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
      <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div>
        <Label>Eventos</Label>
        <div className="mt-2 flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
          {AVAILABLE_EVENTS.map((e) => (
            <button key={e} type="button" onClick={() => toggle(e)} className={`rounded-full px-2 py-1 text-[11px] ${events.includes(e) ? "bg-[#08C7BA] text-white" : "bg-muted text-muted-foreground"}`}>{e}</button>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button disabled={loading || !name || !url || events.length === 0} onClick={() => onSubmit({ name, url, description, events })} className="bg-[#08C7BA] hover:bg-[#00afa5]">
          {loading ? "Salvando…" : "Criar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
