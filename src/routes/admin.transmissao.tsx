import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, StatCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppPreview } from "@/components/admin/WhatsAppPreview";
import { listTemplates } from "@/lib/dunning.functions";
import { broadcastAudience, runBroadcast, listBroadcasts } from "@/lib/broadcast.functions";
import { Megaphone, Send, Users, CheckCircle2, XCircle, Eye, History, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/transmissao")({
  head: () => ({ meta: [{ title: "Transmissão — Admin FisioFlow" }] }),
  component: TransmissaoPage,
});

type Scope = "all" | "active" | "trial" | "overdue" | "blocked" | "plan";

const SCOPES: Array<{ value: Scope; label: string; hint: string }> = [
  { value: "all",      label: "Todos os workspaces",       hint: "Qualquer status" },
  { value: "active",   label: "Ativos",                    hint: "Assinatura em dia" },
  { value: "trial",    label: "Em teste",                  hint: "Trial ativo" },
  { value: "overdue",  label: "Vencidos / pgto pendente",  hint: "Fatura em aberto" },
  { value: "blocked",  label: "Bloqueados",                hint: "Bloqueio por inadimplência" },
  { value: "plan",     label: "Por plano",                 hint: "Filtra por plano específico" },
];

function TransmissaoPage() {
  return (
    <AdminShell
      title="Transmissão em massa"
      subtitle="Envie avisos, atualizações e comunicados no WhatsApp para os workspaces"
    >
      <Tabs defaultValue="new" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="new" className="gap-2"><Megaphone className="h-4 w-4" /> Nova transmissão</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="new"><NewBroadcast /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function NewBroadcast() {
  const qc = useQueryClient();
  const tplFn = useServerFn(listTemplates);
  const audienceFn = useServerFn(broadcastAudience);
  const runFn = useServerFn(runBroadcast);

  const { data: templates } = useQuery({ queryKey: ["dunning-templates"], queryFn: () => tplFn() });

  const [form, setForm] = useState({
    title: "",
    scope: "active" as Scope,
    plan: "",
    templateId: "custom" as string,
    customBody: "Olá {{cliente}}, temos uma atualização importante do FisioFlow!\n\nQualquer dúvida, fale com a gente.",
  });

  const audienceQ = useQuery({
    queryKey: ["broadcast-audience", form.scope, form.plan],
    queryFn: () => audienceFn({ data: { scope: form.scope, plan: form.plan || undefined } }),
  });

  const selected = useMemo(
    () => (templates ?? []).find((t) => t.id === form.templateId) ?? null,
    [templates, form.templateId],
  );
  const previewBody = form.templateId === "custom" ? form.customBody : (selected?.body ?? "");

  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      runFn({
        data: {
          title: form.title || "Transmissão",
          templateId: form.templateId === "custom" ? undefined : form.templateId,
          customBody: form.templateId === "custom" ? form.customBody : undefined,
          scope: form.scope,
          plan: form.plan || undefined,
          dryRun,
        },
      }),
    onSuccess: (r) => {
      if (r.dryRun) {
        toast.success(`Simulação: alcançaria ${r.audience} destinatários`);
      } else {
        toast.success(`Transmissão concluída: ${r.sent} enviadas, ${r.failed} falhas`);
        qc.invalidateQueries({ queryKey: ["broadcasts"] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-5">
      {/* Formulário */}
      <div className="space-y-4">
        <AdminCard className="p-5 space-y-4">
          <SectionHeader title="1. Conteúdo" description="Use um template salvo ou escreva na hora" />

          <div>
            <Label>Título interno (histórico)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Aviso de manutenção 12/07" />
          </div>

          <div>
            <Label>Template</Label>
            <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">✍️ Mensagem personalizada</SelectItem>
                {(templates ?? []).filter(t => t.active).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.templateId === "custom" && (
            <div>
              <Label>Corpo da mensagem</Label>
              <Textarea
                value={form.customBody}
                onChange={(e) => setForm({ ...form, customBody: e.target.value })}
                rows={7}
                className="font-mono text-sm"
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                Variáveis disponíveis: <code>{"{{cliente}}"}</code> <code>{"{{empresa}}"}</code> <code>{"{{plano}}"}</code>
              </div>
            </div>
          )}
        </AdminCard>

        <AdminCard className="p-5 space-y-4">
          <SectionHeader title="2. Audiência" description="Escolha para quem enviar" />
          <div className="grid grid-cols-2 gap-2">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, scope: s.value })}
                className={`rounded-xl border p-3 text-left transition ${
                  form.scope === s.value
                    ? "border-[#08C7BA] bg-[#08C7BA]/10 text-foreground"
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                }`}
              >
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-[11px] text-muted-foreground">{s.hint}</div>
              </button>
            ))}
          </div>

          {form.scope === "plan" && (
            <div>
              <Label>Plano exato</Label>
              <Input value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Ex: pro_monthly" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Alvo" value={audienceQ.data?.total ?? "…"} tone="default" icon={Users} />
            <StatCard label="Com WhatsApp" value={audienceQ.data?.valid ?? "…"} tone="success" icon={CheckCircle2} />
            <StatCard label="Sem telefone" value={audienceQ.data?.invalid ?? "…"} tone="warning" icon={XCircle} />
          </div>
        </AdminCard>

        <AdminCard className="p-5 space-y-3">
          <SectionHeader title="3. Enviar" description="Simule antes de disparar em massa" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run.mutate(true)} disabled={run.isPending} className="gap-2">
              {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Simular
            </Button>
            <Button
              onClick={() => {
                if (!confirm(`Enviar para ${audienceQ.data?.valid ?? 0} workspaces via WhatsApp?`)) return;
                run.mutate(false);
              }}
              disabled={run.isPending || !audienceQ.data?.valid}
              className="bg-[#08C7BA] hover:bg-[#00afa5] text-white gap-2"
            >
              {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Disparar agora
            </Button>
          </div>
          {run.data && !run.data.dryRun && (
            <div className="text-xs text-muted-foreground">
              Último envio: {run.data.sent} enviadas · {run.data.failed} falhas
            </div>
          )}
        </AdminCard>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <SectionHeader title="Preview no WhatsApp" description="Aparência aproximada da mensagem" />
        <WhatsAppPreview
          body={previewBody
            .replace(/\{\{\s*cliente\s*\}\}/g, "Dr. João Silva")
            .replace(/\{\{\s*empresa\s*\}\}/g, "Clínica FisioMax")
            .replace(/\{\{\s*plano\s*\}\}/g, "PRO Mensal")
            .replace(/\{\{\s*valor\s*\}\}/g, "R$ 89,90")
            .replace(/\{\{\s*vencimento\s*\}\}/g, "15/07/2026")}
          type={selected?.message_type ?? "text"}
          footer={selected?.footer_text ?? null}
          buttons={selected?.buttons ?? []}
          listButtonText={selected?.list_button_text ?? null}
          sections={selected?.list_sections ?? []}
          sender="FisioFlow"
        />
      </div>
    </div>
  );
}

function HistoryTab() {
  const fn = useServerFn(listBroadcasts);
  const { data, isLoading } = useQuery({ queryKey: ["broadcasts"], queryFn: () => fn() });
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-2xl bg-card/60" />;
  if (data.length === 0) {
    return (
      <AdminCard className="p-10 text-center">
        <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <div className="text-sm text-foreground font-medium">Nenhuma transmissão ainda</div>
        <div className="text-xs text-muted-foreground">Crie a primeira na aba "Nova transmissão"</div>
      </AdminCard>
    );
  }
  return (
    <div className="space-y-2">
      {data.map((b) => (
        <AdminCard key={b.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">{b.title}</h3>
                <StatusBadge status={b.status === "done" ? "success" : b.status === "running" ? "pending" : "inactive"} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(b.created_at).toLocaleString("pt-BR")} · escopo <Badge variant="outline" className="text-[10px] ml-1">{b.scope}{b.plan ? ` · ${b.plan}` : ""}</Badge>
              </div>
              {b.rendered_sample && (
                <div className="mt-2 text-xs text-muted-foreground italic line-clamp-2 whitespace-pre-line">
                  "{b.rendered_sample}"
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">Alvo</div>
              <div className="text-lg font-bold text-foreground">{b.audience_total}</div>
              <div className="text-[10px] mt-1">
                <span className="text-[#20A97A] dark:text-[#3DDC97]">✓ {b.sent}</span>
                {" · "}
                <span className="text-[#D0453F] dark:text-[#EF6B6B]">✕ {b.failed}</span>
              </div>
            </div>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}
