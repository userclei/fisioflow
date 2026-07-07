import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { recordEvent, recordAudit } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Admin FisioFlow" }] }),
  component: EmpresasPage,
});

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Ativas" },
  { key: "trial", label: "Em teste" },
  { key: "blocked", label: "Bloqueadas" },
  { key: "cancelled", label: "Canceladas" },
  { key: "overdue", label: "Vencidas" },
  { key: "pro_monthly", label: "PRO Mensal" },
  { key: "pro_yearly", label: "PRO Anual" },
  { key: "free", label: "Free" },
] as const;

function EmpresasPage() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["admin-workspaces", filter, search],
    queryFn: async () => {
      let q = supabase.from("workspaces").select("*").order("created_at", { ascending: false });
      if (["active", "trial", "blocked", "cancelled", "overdue", "pending_payment"].includes(filter)) {
        q = q.eq("status", filter as never);
      } else if (["pro_monthly", "pro_yearly", "free"].includes(filter)) {
        q = q.eq("plan", filter as never);
      }
      if (search) q = q.or(`name.ilike.%${search}%,responsible_name.ilike.%${search}%,responsible_email.ilike.%${search}%,phone.ilike.%${search}%,cnpj.ilike.%${search}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: {
      name: string; responsible_name: string; responsible_email: string; phone: string;
      plan: string; monthly_price: number; due_date: string; status: string;
    }) => {
      const { data: existing } = await supabase.auth.getUser();
      const ownerId = existing.user?.id;
      if (!ownerId) throw new Error("Sessão expirada");
      const { data, error } = await supabase.from("workspaces").insert({
        name: form.name,
        type: "clinic",
        owner_id: ownerId,
        plan: form.plan as never,
        status: form.status as never,
        responsible_name: form.responsible_name,
        responsible_email: form.responsible_email,
        phone: form.phone,
        monthly_price: form.monthly_price,
        due_date: form.due_date || null,
      }).select().single();
      if (error) throw error;
      await recordEvent("company.created", data.id, { name: form.name });
      await recordAudit({ workspaceId: data.id, action: "company.created", entityType: "workspace", entityId: data.id, newData: form });
      return data;
    },
    onSuccess: () => {
      toast.success("Empresa criada");
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="Empresas"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#08C7BA] hover:bg-[#00afa5]"><Plus className="h-4 w-4 mr-1" /> Nova</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar empresa</DialogTitle></DialogHeader>
            <NewCompanyForm onSubmit={(f) => createMutation.mutate(f)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      }
    >
      <AdminCard className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa, responsável, e-mail…" className="pl-9" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === f.key ? "bg-[#062B49] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >{f.label}</button>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : workspaces.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workspaces.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.responsible_email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{w.responsible_name ?? "—"}</td>
                    <td className="px-4 py-3"><span className="text-xs font-medium uppercase text-[#08C7BA]">{w.plan}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-4 py-3">{w.monthly_price ? Number(w.monthly_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.due_date ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/admin/empresas/$id" params={{ id: w.id }} className="text-xs font-medium text-[#08C7BA] hover:underline">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}

function NewCompanyForm({ onSubmit, loading }: { onSubmit: (f: {
  name: string; responsible_name: string; responsible_email: string; phone: string;
  plan: string; monthly_price: number; due_date: string; status: string;
}) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [respName, setRespName] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("pro_monthly");
  const [price, setPrice] = useState("89.90");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("trial");

  return (
    <div className="space-y-3">
      <div><Label>Nome da empresa</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Responsável</Label><Input value={respName} onChange={(e) => setRespName(e.target.value)} /></div>
        <div><Label>E-mail</Label><Input type="email" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>Valor mensal (R$)</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Plano</Label>
          <Select value={plan} onValueChange={setPlan}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro_monthly">PRO Mensal</SelectItem>
              <SelectItem value="pro_yearly">PRO Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="trial">Teste</SelectItem>
              <SelectItem value="blocked">Bloqueada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
      <DialogFooter>
        <Button
          disabled={loading || !name}
          onClick={() => onSubmit({ name, responsible_name: respName, responsible_email: respEmail, phone, plan, monthly_price: Number(price) || 0, due_date: dueDate, status })}
          className="bg-[#08C7BA] hover:bg-[#00afa5]"
        >{loading ? "Salvando…" : "Cadastrar"}</Button>
      </DialogFooter>
    </div>
  );
}
