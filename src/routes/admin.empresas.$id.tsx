import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle2, XCircle } from "lucide-react";
import { recordEvent, recordAudit } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/empresas/$id")({
  head: () => ({ meta: [{ title: "Detalhes da empresa — Admin FisioFlow" }] }),
  component: EmpresaDetail,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function EmpresaDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: ws, isLoading } = useQuery({
    queryKey: ["admin-workspace", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("workspaces").update(patch as never).eq("id", id);
      if (error) throw error;
      await recordAudit({ workspaceId: id, action: "company.updated", entityType: "workspace", entityId: id, newData: patch });
    },
    onSuccess: () => {
      toast.success("Empresa atualizada");
      qc.invalidateQueries({ queryKey: ["admin-workspace", id] });
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function block() {
    await updateMutation.mutateAsync({ status: "blocked" });
    await recordEvent("company.blocked", id, {});
  }
  async function unblock() {
    await updateMutation.mutateAsync({ status: "active" });
    await recordEvent("company.unblocked", id, {});
  }
  async function cancel() {
    if (!confirm("Cancelar essa empresa?")) return;
    await updateMutation.mutateAsync({ status: "cancelled" });
    await recordEvent("company.cancelled", id, {});
  }

  if (isLoading) return <AdminShell title="Carregando…"><div /></AdminShell>;
  if (!ws) return <AdminShell title="Empresa"><div className="text-sm text-muted-foreground">Empresa não encontrada.</div></AdminShell>;

  return (
    <AdminShell
      title={ws.name}
      actions={
        <>
          <Link to="/admin/empresas" className="text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="inline h-3 w-3" /> Voltar</Link>
          {ws.status === "blocked" ? (
            <Button size="sm" variant="outline" onClick={unblock}><CheckCircle2 className="h-4 w-4 mr-1" /> Liberar</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={block}><Ban className="h-4 w-4 mr-1" /> Bloquear</Button>
          )}
          <Button size="sm" variant="ghost" className="text-[#D0453F]" onClick={cancel}><XCircle className="h-4 w-4 mr-1" /> Cancelar</Button>
        </>
      }
    >
      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <AdminCard className="p-5">
            <div className="mb-3 flex items-center gap-3"><StatusBadge status={ws.status} /><span className="text-xs font-medium uppercase text-[#08C7BA]">{ws.plan}</span></div>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
              <div><dt className="text-xs uppercase text-muted-foreground">Responsável</dt><dd>{ws.responsible_name ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">E-mail</dt><dd>{ws.responsible_email ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Telefone</dt><dd>{ws.phone ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">CNPJ</dt><dd>{ws.cnpj ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Valor mensal</dt><dd>{ws.monthly_price ? BRL(Number(ws.monthly_price)) : "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Vencimento</dt><dd>{ws.due_date ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Criada em</dt><dd>{new Date(ws.created_at).toLocaleString("pt-BR")}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Último acesso</dt><dd>{ws.last_access_at ? new Date(ws.last_access_at).toLocaleString("pt-BR") : "—"}</dd></div>
            </dl>
          </AdminCard>
        </TabsContent>

        <TabsContent value="usuarios"><WorkspaceUsers id={id} /></TabsContent>
        <TabsContent value="mensalidades"><WorkspaceInvoices id={id} /></TabsContent>
        <TabsContent value="eventos"><WorkspaceEvents id={id} /></TabsContent>
        <TabsContent value="auditoria"><WorkspaceAudit id={id} /></TabsContent>

        <TabsContent value="config">
          <EditForm ws={ws} onSave={(patch) => updateMutation.mutate(patch)} />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function EditForm({ ws, onSave }: { ws: Record<string, unknown>; onSave: (p: Record<string, unknown>) => void }) {
  const [name, setName] = useState((ws.name as string) ?? "");
  const [price, setPrice] = useState(String(ws.monthly_price ?? ""));
  const [dueDate, setDueDate] = useState((ws.due_date as string) ?? "");
  const [notes, setNotes] = useState((ws.internal_notes as string) ?? "");

  return (
    <AdminCard className="space-y-3 p-5">
      <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor mensal</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
      </div>
      <div><Label>Observações internas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button className="bg-[#08C7BA] hover:bg-[#00afa5]" onClick={() => onSave({ name, monthly_price: Number(price) || null, due_date: dueDate || null, internal_notes: notes })}>Salvar</Button>
    </AdminCard>
  );
}

function WorkspaceUsers({ id }: { id: string }) {
  const { data = [] } = useQuery({
    queryKey: ["admin-ws-users", id],
    queryFn: async () => {
      const { data: members } = await supabase.from("workspace_members").select("*").eq("workspace_id", id);
      const list = members ?? [];
      const userIds = list.map((m) => m.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("auth_user_id, full_name, email").in("auth_user_id", userIds)
        : { data: [] as never[] };
      const byUser = new Map((profiles ?? []).map((p) => [p.auth_user_id, p]));
      return list.map((m) => ({ ...m, profile: byUser.get(m.user_id) }));
    },
  });
  return (
    <AdminCard className="overflow-hidden">
      {data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nenhum usuário vinculado.</div> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Papel</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {data.map((m) => {
              const p = (m as { profile?: { full_name?: string; email?: string } }).profile;
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3"><div className="font-medium">{p?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{p?.email ?? "—"}</div></td>
                  <td className="px-4 py-3">{m.role}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AdminCard>
  );
}

function WorkspaceInvoices({ id }: { id: string }) {
  const { data = [] } = useQuery({
    queryKey: ["admin-ws-invoices", id],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*").eq("workspace_id", id).order("due_date", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <AdminCard className="overflow-hidden">
      {data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nenhuma mensalidade.</div> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pago em</th></tr></thead>
          <tbody className="divide-y divide-border">
            {data.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">{i.due_date}</td>
                <td className="px-4 py-3">{BRL(Number(i.amount))}</td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{i.paid_at ? new Date(i.paid_at).toLocaleDateString("pt-BR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminCard>
  );
}

function WorkspaceEvents({ id }: { id: string }) {
  const { data = [] } = useQuery({
    queryKey: ["admin-ws-events", id],
    queryFn: async () => (await supabase.from("events").select("*").eq("workspace_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <AdminCard className="overflow-hidden">
      {data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Sem eventos.</div> : (
        <div className="divide-y divide-border">
          {data.map((e) => (
            <div key={e.id} className="px-4 py-3 text-sm">
              <div className="font-medium text-foreground">{e.event_type}</div>
              <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")} · {e.source}</div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

function WorkspaceAudit({ id }: { id: string }) {
  const { data = [] } = useQuery({
    queryKey: ["admin-ws-audit", id],
    queryFn: async () => (await supabase.from("audit_logs").select("*").eq("workspace_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  return (
    <AdminCard className="overflow-hidden">
      {data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Sem registros.</div> : (
        <div className="divide-y divide-border">
          {data.map((a) => (
            <div key={a.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{a.action} · <span className="text-muted-foreground">{a.entity_type}</span></div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}
