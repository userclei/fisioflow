import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell, AdminCard } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Admin FisioFlow" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await supabase.from("admin_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    auto_block_after_days: 7,
    pro_monthly_price: 89.9,
    pro_yearly_price: 899,
    sandbox_enabled: true,
    webhooks_enabled: true,
    support_email: "",
    support_whatsapp: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        auto_block_after_days: data.auto_block_after_days,
        pro_monthly_price: Number(data.pro_monthly_price),
        pro_yearly_price: Number(data.pro_yearly_price),
        sandbox_enabled: data.sandbox_enabled,
        webhooks_enabled: data.webhooks_enabled,
        support_email: data.support_email ?? "",
        support_whatsapp: data.support_whatsapp ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_settings").update(form as never).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Configurações">
      <AdminCard className="space-y-4 p-5 max-w-2xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><Label>Dias para bloqueio automático</Label><Input type="number" value={form.auto_block_after_days} onChange={(e) => setForm({ ...form, auto_block_after_days: Number(e.target.value) })} /></div>
          <div><Label>Valor PRO Mensal (R$)</Label><Input type="number" step="0.01" value={form.pro_monthly_price} onChange={(e) => setForm({ ...form, pro_monthly_price: Number(e.target.value) })} /></div>
          <div><Label>Valor PRO Anual (R$)</Label><Input type="number" step="0.01" value={form.pro_yearly_price} onChange={(e) => setForm({ ...form, pro_yearly_price: Number(e.target.value) })} /></div>
          <div><Label>E-mail de suporte</Label><Input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>WhatsApp de suporte</Label><Input value={form.support_whatsapp} onChange={(e) => setForm({ ...form, support_whatsapp: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div><Label>Sandbox habilitado</Label><p className="text-xs text-muted-foreground">Permite criar contas de teste</p></div>
          <Switch checked={form.sandbox_enabled} onCheckedChange={(v) => setForm({ ...form, sandbox_enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label>Webhooks globais</Label><p className="text-xs text-muted-foreground">Se desligado, nenhum evento dispara webhooks</p></div>
          <Switch checked={form.webhooks_enabled} onCheckedChange={(v) => setForm({ ...form, webhooks_enabled: v })} />
        </div>
        <Button className="bg-[#08C7BA] hover:bg-[#00afa5]" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
      </AdminCard>
    </AdminShell>
  );
}
