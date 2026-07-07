import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { InputField } from "@/components/fisioflow/InputField";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton } from "@/components/fisioflow/PrimaryButton";
import { addActivity, deleteLead, getLead, updateLead } from "@/lib/crm.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/crm/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Lead — FisioFlow" }] }),
  component: LeadPage,
});

const STAGES = ["novo","contato","qualificado","agendado","convertido","perdido"] as const;
const STAGE_LABELS: Record<string,string> = {
  novo:"Novo", contato:"Contato", qualificado:"Qualificado",
  agendado:"Agendado", convertido:"Convertido", perdido:"Perdido",
};
const ACT_LABELS: Record<string,string> = {
  nota:"Nota", ligacao:"Ligação", email:"Email", whatsapp:"WhatsApp", reuniao:"Reunião", outro:"Outro",
};

function LeadPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getLead);
  const upd = useServerFn(updateLead);
  const del = useServerFn(deleteLead);
  const add = useServerFn(addActivity);

  const { data, isLoading } = useQuery({ queryKey: ["crm_lead", id], queryFn: () => get({ data: { id } }) });
  const [actType, setActType] = useState("nota");
  const [actText, setActText] = useState("");

  const setStage = useMutation({
    mutationFn: (stage: string) => upd({ data: { id, stage } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_lead", id] }),
  });
  const addAct = useMutation({
    mutationFn: () => add({ data: { lead_id: id, type: actType, content: actText.trim() } }),
    onSuccess: () => {
      setActText(""); toast.success("Atividade adicionada");
      qc.invalidateQueries({ queryKey: ["crm_lead", id] });
    },
  });
  const remove = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Lead removido"); nav({ to: "/crm" }); },
  });

  if (isLoading || !data) {
    return <MobileShell><PageHeader title="Lead" backTo="/crm" /><p className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando…</p></MobileShell>;
  }
  const l = data.lead as any;

  return (
    <MobileShell>
      <PageHeader title={l.name} backTo="/crm"
        right={
          <button onClick={() => { if (confirm("Remover este lead?")) remove.mutate(); }}
            className="rounded-full bg-destructive/10 p-2 text-destructive" aria-label="Remover">
            <Trash2 size={16}/>
          </button>
        } />
      <div className="space-y-4 px-5">
        <div className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
          {l.email && <div className="flex items-center gap-2 text-[13px] text-foreground"><Mail size={14}/> {l.email}</div>}
          {l.phone && <div className="mt-1 flex items-center gap-2 text-[13px] text-foreground"><Phone size={14}/> {l.phone}</div>}
          {l.notes && <p className="mt-2 text-[12px] text-muted-foreground whitespace-pre-wrap">{l.notes}</p>}
        </div>

        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-foreground">Etapa</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {STAGES.map(s => (
              <button key={s} onClick={() => setStage.mutate(s)}
                className={cn("shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                  l.stage === s ? "bg-primary text-primary-foreground" : "bg-card-soft text-muted-foreground")}>
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-foreground">Adicionar atividade</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {Object.entries(ACT_LABELS).map(([k,v]) => (
              <button key={k} onClick={() => setActType(k)}
                className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                  actType === k ? "bg-primary text-primary-foreground" : "bg-card-soft text-muted-foreground")}>
                {v}
              </button>
            ))}
          </div>
          <textarea rows={3} maxLength={2000} value={actText} onChange={(e)=>setActText(e.target.value)}
            placeholder="Descreva o contato…"
            className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
          <PrimaryButton onClick={()=>addAct.mutate()} disabled={!actText.trim() || addAct.isPending} className="mt-2">
            {addAct.isPending ? "Salvando…" : "Registrar"}
          </PrimaryButton>
        </div>

        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-foreground">Histórico</div>
          {data.activities.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Sem atividades ainda.</p>
          ) : (
            <ul className="space-y-2">
              {data.activities.map((a: any) => (
                <li key={a.id} className="rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-primary">{ACT_LABELS[a.type] ?? a.type}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-foreground whitespace-pre-wrap">{a.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
