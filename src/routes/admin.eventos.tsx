import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell, AdminCard } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Admin FisioFlow" }] }),
  component: EventosPage,
});

function EventosPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["admin-events", search],
    queryFn: async () => {
      let q = supabase.from("events").select("*, workspaces(name)").order("created_at", { ascending: false }).limit(200);
      if (search) q = q.ilike("event_type", `%${search}%`);
      return (await q).data ?? [];
    },
  });

  return (
    <AdminShell title="Eventos">
      <AdminCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tipo de evento…" className="pl-9" />
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="divide-y divide-border">
          {data.map((e) => {
            const ws = (e as { workspaces: { name?: string } | null }).workspaces;
            return (
              <button key={e.id} onClick={() => setSelected(e as never)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="font-medium text-foreground text-sm">{e.event_type}</div>
                  <div className="text-xs text-muted-foreground">{ws?.name ?? "—"} · {e.source}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</div>
              </button>
            );
          })}
          {data.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum evento.</div>}
        </div>
      </AdminCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do evento</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3 text-sm">
              <Field k="Tipo" v={String(selected.event_type)} />
              <Field k="Origem" v={String(selected.source)} />
              <Field k="Data" v={new Date(String(selected.created_at)).toLocaleString("pt-BR")} />
              <Field k="Workspace" v={String(selected.workspace_id ?? "—")} />
              <Field k="Usuário" v={String(selected.user_id ?? "—")} />
              <Field k="IP" v={String(selected.ip_address ?? "—")} />
              <div>
                <div className="text-xs uppercase text-muted-foreground">Metadata</div>
                <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs uppercase text-muted-foreground">{k}</div><div className="mt-0.5">{v}</div></div>;
}
