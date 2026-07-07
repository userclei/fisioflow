import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { recordAudit } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Admin FisioFlow" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users", filter, search],
    queryFn: async () => {
      let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data: profiles, error } = await q.limit(200);
      if (error) throw error;
      let list = profiles ?? [];
      if (filter === "active" || filter === "blocked" || filter === "disabled" || filter === "invited") {
        list = list.filter((p) => p.status === filter);
      }
      const userIds = list.map((p) => p.auth_user_id);
      const { data: members } = userIds.length
        ? await supabase.from("workspace_members").select("id, role, status, workspace_id, user_id, workspaces(name)").in("user_id", userIds)
        : { data: [] as never[] };
      const membersByUser = new Map<string, Array<{ id: string; role: string; status: string; workspace_id: string; workspaces: { name: string } | null }>>();
      for (const m of members ?? []) {
        const arr = membersByUser.get(m.user_id) ?? [];
        arr.push(m as never);
        membersByUser.set(m.user_id, arr);
      }
      return list.map((p) => ({ ...p, workspace_members: membersByUser.get(p.auth_user_id) ?? [] }));
    },
  });

  const setStatus = useMutation({
    mutationFn: async (input: { userId: string; status: string; workspaceId?: string }) => {
      const { error } = await supabase.from("profiles").update({ status: input.status }).eq("auth_user_id", input.userId);
      if (error) throw error;
      if (input.workspaceId) {
        await recordAudit({ workspaceId: input.workspaceId, action: `user.${input.status === "active" ? "unblocked" : "blocked"}`, entityType: "user", entityId: input.userId, newData: { status: input.status } });
      }
    },
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async (input: { memberId: string; role: string; workspaceId: string; userId: string }) => {
      const { error } = await supabase.from("workspace_members").update({ role: input.role as never }).eq("id", input.memberId);
      if (error) throw error;
      await recordAudit({ workspaceId: input.workspaceId, action: "user.role_changed", entityType: "user", entityId: input.userId, newData: { role: input.role } });
    },
    onSuccess: () => { toast.success("Papel atualizado"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  return (
    <AdminShell title="Usuários">
      <AdminCard className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail, telefone…" className="pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
              <SelectItem value="disabled">Desativados</SelectItem>
              <SelectItem value="invited">Convidados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Carregando…</div> : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Papel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Criado</th><th className="px-4 py-3">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => {
                  const members = (p as { workspace_members: Array<{ id: string; role: string; status: string; workspace_id: string; workspaces: { name: string } | null }> }).workspace_members ?? [];
                  const primary = members[0];
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{primary?.workspaces?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {primary ? (
                          <Select defaultValue={primary.role} onValueChange={(v) => setRole.mutate({ memberId: primary.id, role: v, workspaceId: primary.workspace_id, userId: p.auth_user_id })}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="physiotherapist">Fisio</SelectItem>
                              <SelectItem value="assistant">Assistente</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status ?? "active"} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        {p.status === "blocked" ? (
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ userId: p.auth_user_id, status: "active", workspaceId: primary?.workspace_id })}>Desbloquear</Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-[#D0453F]" onClick={() => setStatus.mutate({ userId: p.auth_user_id, status: "blocked", workspaceId: primary?.workspace_id })}>Bloquear</Button>
                        )}
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
