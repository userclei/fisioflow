import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/fisioflow/EmptyState";
import { FloatingActionButton } from "@/components/fisioflow/FloatingActionButton";
import { InputField } from "@/components/fisioflow/InputField";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { createLead, listLeads } from "@/lib/crm.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/crm")({
  ssr: false,
  head: () => ({ meta: [{ title: "CRM — FisioFlow" }] }),
  component: CrmPage,
});

const STAGES = [
  { key: "novo", label: "Novo" },
  { key: "contato", label: "Contato" },
  { key: "qualificado", label: "Qualif." },
  { key: "agendado", label: "Agendado" },
  { key: "convertido", label: "Convert." },
  { key: "perdido", label: "Perdido" },
] as const;

function CrmPage() {
  const qc = useQueryClient();
  const list = useServerFn(listLeads);
  const create = useServerFn(createLead);
  const { data = [], isLoading } = useQuery({ queryKey: ["crm_leads"], queryFn: () => list() });
  const [stage, setStage] = useState<string>("todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data as any[]).filter((l) =>
      (stage === "todos" || l.stage === stage) &&
      (!s || l.name.toLowerCase().includes(s) || (l.email ?? "").toLowerCase().includes(s))
    );
  }, [data, stage, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of data as any[]) c[l.stage] = (c[l.stage] ?? 0) + 1;
    return c;
  }, [data]);

  const save = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("Lead criado");
      setForm({ name: "", email: "", phone: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["crm_leads"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <MobileShell>
      <PageHeader title="CRM" backTo="/configuracoes" />
      <div className="px-5">
        <InputField placeholder="Buscar por nome ou email" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <StagePill label={`Todos (${data.length})`} active={stage==="todos"} onClick={()=>setStage("todos")} />
          {STAGES.map(s => (
            <StagePill key={s.key} label={`${s.label} (${counts[s.key] ?? 0})`}
              active={stage===s.key} onClick={()=>setStage(s.key)} />
          ))}
        </div>

        {isLoading ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={Users} title="Nenhum lead" description="Adicione manualmente ou receba via link de agendamento."
              action={<PrimaryButton onClick={()=>setOpen(true)}>Adicionar lead</PrimaryButton>} />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((l: any) => (
              <li key={l.id}>
                <Link to="/crm/$id" params={{ id: l.id }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-[13px] font-bold">
                    {l.name.slice(0,1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground truncate">{l.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{l.email || l.phone || "sem contato"}</div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    stageColor(l.stage))}>
                    {STAGES.find(s=>s.key===l.stage)?.label ?? l.stage}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FloatingActionButton onClick={() => setOpen(true)} aria-label="Novo lead">
        <Plus size={24} strokeWidth={2.4}/>
      </FloatingActionButton>

      <ModalBottomSheet open={open} onOpenChange={setOpen} title="Novo lead">
        <div className="space-y-3">
          <InputField label="Nome*" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
          <InputField label="Email" type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
          <InputField label="Telefone" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} />
          <div className="flex gap-2 pt-2">
            <SecondaryButton onClick={()=>setOpen(false)}>Cancelar</SecondaryButton>
            <PrimaryButton onClick={()=>save.mutate()} disabled={save.isPending || !form.name.trim()}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </PrimaryButton>
          </div>
        </div>
      </ModalBottomSheet>
    </MobileShell>
  );
}

function StagePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
      active ? "bg-primary text-primary-foreground" : "bg-card-soft text-muted-foreground",
    )}>{label}</button>
  );
}

function stageColor(s: string) {
  switch (s) {
    case "novo": return "bg-blue-500/15 text-blue-600";
    case "contato": return "bg-amber-500/15 text-amber-600";
    case "qualificado": return "bg-violet-500/15 text-violet-600";
    case "agendado": return "bg-primary/15 text-primary";
    case "convertido": return "bg-emerald-500/15 text-emerald-600";
    case "perdido": return "bg-destructive/15 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}
