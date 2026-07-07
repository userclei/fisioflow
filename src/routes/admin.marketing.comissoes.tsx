import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listCommissions, markCommissionsAvailable, listCommissionRules, upsertCommissionRule } from "@/lib/affiliates.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Play, Settings2 } from "lucide-react";

export const Route = createFileRoute("/admin/marketing/comissoes")({
  head: () => ({ meta: [{ title: "Comissões — Admin FisioFlow" }] }),
  component: Page,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function Page() {
  return (
    <AdminShell title="Comissões" subtitle="Comissões geradas por conversões pagas e regras de cálculo">
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-2"><Wallet className="h-4 w-4" /> Comissões</TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><Settings2 className="h-4 w-4" /> Regras</TabsTrigger>
        </TabsList>
        <TabsContent value="list"><CommissionsList /></TabsContent>
        <TabsContent value="rules"><RulesList /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function CommissionsList() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const listFn = useServerFn(listCommissions);
  const markFn = useServerFn(markCommissionsAvailable);
  const { data } = useQuery({
    queryKey: ["commissions", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
  });
  const m = useMutation({
    mutationFn: () => markFn(),
    onSuccess: (r) => { toast.success(`${(r as any).updated} comissões liberadas`); qc.invalidateQueries({ queryKey: ["commissions"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminCard className="p-5">
      <SectionHeader
        title="Todas as comissões"
        description="Comissões geradas automaticamente ao registrar conversões pagas"
        action={
          <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending} className="gap-2">
            <Play className="h-4 w-4" /> Liberar pendentes vencidas
          </Button>
        }
      />
      <Select value={status || "all"} onValueChange={v => setStatus(v === "all" ? "" : v)}>
        <SelectTrigger className="w-48 mb-4"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          <SelectItem value="pending">Pendentes</SelectItem>
          <SelectItem value="available">Disponíveis</SelectItem>
          <SelectItem value="paid">Pagas</SelectItem>
          <SelectItem value="canceled">Canceladas</SelectItem>
        </SelectContent>
      </Select>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2 px-3">Data</th>
              <th className="py-2 px-3">Afiliado</th>
              <th className="py-2 px-3">Base</th>
              <th className="py-2 px-3">Comissão</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Liberação</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-border">
                <td className="py-2 px-3">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="py-2 px-3 font-medium">{c.affiliate?.name}</td>
                <td className="py-2 px-3">{fmt(Number(c.base_amount || 0))}</td>
                <td className="py-2 px-3 font-medium text-foreground">{fmt(Number(c.amount))}</td>
                <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                <td className="py-2 px-3">{c.available_at ? new Date(c.available_at).toLocaleDateString("pt-BR") : "—"}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sem comissões.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}

function RulesList() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCommissionRules);
  const upFn = useServerFn(upsertCommissionRule);
  const { data } = useQuery({ queryKey: ["comm-rules"], queryFn: () => listFn() });

  const toggle = useMutation({
    mutationFn: (r: any) => upFn({ data: { id: r.id, name: r.name, plan: r.plan, tier: r.tier, percent: r.percent, fixed_amount: r.fixed_amount, recurring: r.recurring, active: !r.active, priority: r.priority } as any }),
    onSuccess: () => { toast.success("Regra atualizada"); qc.invalidateQueries({ queryKey: ["comm-rules"] }); },
  });

  return (
    <AdminCard className="p-5">
      <SectionHeader title="Regras de comissão" description="Aplicadas na hora de gerar comissão. Ordem: mais específico > menor priority" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2 px-3">Nome</th>
              <th className="py-2 px-3">Plano</th>
              <th className="py-2 px-3">Tier</th>
              <th className="py-2 px-3">%</th>
              <th className="py-2 px-3">Fixo</th>
              <th className="py-2 px-3">Prioridade</th>
              <th className="py-2 px-3">Ativa</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-border">
                <td className="py-2 px-3 font-medium">{r.name}</td>
                <td className="py-2 px-3">{r.plan || "—"}</td>
                <td className="py-2 px-3">{r.tier || "—"}</td>
                <td className="py-2 px-3">{r.percent ? `${r.percent}%` : "—"}</td>
                <td className="py-2 px-3">{r.fixed_amount ? fmt(Number(r.fixed_amount)) : "—"}</td>
                <td className="py-2 px-3">{r.priority}</td>
                <td className="py-2 px-3">
                  <Button size="sm" variant={r.active ? "default" : "outline"} onClick={() => toggle.mutate(r)}>
                    {r.active ? "Ativa" : "Inativa"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
