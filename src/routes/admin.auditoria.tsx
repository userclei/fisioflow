import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell, AdminCard } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Admin FisioFlow" }] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { data = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*, workspaces(name)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  return (
    <AdminShell title="Auditoria">
      <AdminCard className="overflow-hidden">
        {data.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Sem registros.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Entidade</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Data</th></tr></thead>
            <tbody className="divide-y divide-border">
              {data.map((a) => {
                const ws = (a as { workspaces: { name?: string } | null }).workspaces;
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{a.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.entity_type}</td>
                    <td className="px-4 py-3">{ws?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
