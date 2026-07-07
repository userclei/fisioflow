import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, StatCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listTemplates, upsertTemplate, deleteTemplate,
  listFlows, upsertFlow, deleteFlow,
  upsertStep, deleteStep,
  listExecutions, dunningStats, runDunningTick,
} from "@/lib/dunning.functions";
import {
  Plus, Trash2, Edit3, Copy, Eye, Play, Zap, MessageCircle, Mail, DollarSign,
  TrendingUp, AlertTriangle, RotateCw, FileText, Layers,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";
import { WhatsAppPreview } from "@/components/admin/WhatsAppPreview";

export const Route = createFileRoute("/admin/cobranca")({
  head: () => ({ meta: [{ title: "Cobrança & Dunning — Admin FisioFlow" }] }),
  component: CobrancaPage,
});

const CATEGORY_META: Record<string, { label: string; color: string; icon: typeof MessageCircle }> = {
  reminder:            { label: "Lembrete",       color: "bg-[#08C7BA]/15 text-[#08C7BA]",                   icon: MessageCircle },
  due_today:           { label: "Vence hoje",     color: "bg-[#F6C85F]/20 text-[#8A6B21] dark:text-[#F6C85F]", icon: AlertTriangle },
  overdue:             { label: "Vencida",        color: "bg-[#EF6B6B]/15 text-[#D0453F] dark:text-[#EF6B6B]", icon: AlertTriangle },
  negotiation:         { label: "Negociação",     color: "bg-[#7C6EF2]/15 text-[#7C6EF2]",                   icon: MessageCircle },
  payment_confirmed:   { label: "Confirmação",    color: "bg-[#3DDC97]/15 text-[#20A97A] dark:text-[#3DDC97]", icon: DollarSign },
  custom:              { label: "Personalizado",  color: "bg-muted text-muted-foreground",                    icon: FileText },
};

function CobrancaPage() {
  const qc = useQueryClient();
  const runTickFn = useServerFn(runDunningTick);
  const runTick = useMutation({
    mutationFn: () => runTickFn(),
    onSuccess: (r) => {
      toast.success(`Tick executado: ${r.sent} enviados, ${r.failed} falhas, ${r.skipped} pulados`);
      qc.invalidateQueries({ queryKey: ["dunning-executions"] });
      qc.invalidateQueries({ queryKey: ["dunning-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="Cobrança & Recuperação"
      subtitle="Templates, fluxos automáticos e histórico de dunning"
      actions={
        <Button
          size="sm"
          onClick={() => runTick.mutate()}
          disabled={runTick.isPending}
          className="bg-[#08C7BA] hover:bg-[#00afa5] text-white gap-2"
        >
          {runTick.isPending ? <RotateCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Executar agora
        </Button>
      }
    >
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="reports" className="gap-2"><TrendingUp className="h-4 w-4" />Relatórios</TabsTrigger>
          <TabsTrigger value="flows" className="gap-2"><Layers className="h-4 w-4" />Fluxos</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="executions" className="gap-2"><Zap className="h-4 w-4" />Execuções</TabsTrigger>
        </TabsList>

        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="flows"><FlowsTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="executions"><ExecutionsTab /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

// ============ RELATÓRIOS ============

function ReportsTab() {
  const fn = useServerFn(dunningStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dunning-stats", 30],
    queryFn: () => fn({ data: { days: 30 } }),
  });
  const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-card/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Msgs enviadas" value={data.totalSent} sublabel={`${data.totalFailed} falhas`} tone="brand" icon={MessageCircle} />
        <StatCard label="Faturas atingidas" value={data.invoicesTouched} sublabel="Únicas no período" tone="default" icon={FileText} />
        <StatCard label="Recuperadas" value={data.recoveredCount} sublabel={BRL(data.recoveredValue)} tone="success" icon={DollarSign} />
        <StatCard label="Taxa recuperação" value={`${data.recoveryRate.toFixed(1)}%`} sublabel="Últimos 30 dias" tone={data.recoveryRate >= 50 ? "success" : "warning"} icon={TrendingUp} />
      </div>

      <AdminCard className="p-5">
        <SectionHeader title="Envios por dia" description="Últimos 30 dias" />
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeline}>
              <defs>
                <linearGradient id="dunGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#08C7BA" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#08C7BA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#8B96A5" />
              <YAxis tick={{ fontSize: 11 }} stroke="#8B96A5" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="#08C7BA" strokeWidth={2} fill="url(#dunGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AdminCard>

      <AdminCard className="p-5">
        <SectionHeader title="Envios por etapa" description="Volume de cada step do fluxo" />
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(data.byStep).map(([step_id, value]) => ({ step: step_id.slice(0, 8), value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="#8B96A5" />
              <YAxis tick={{ fontSize: 11 }} stroke="#8B96A5" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 }} />
              <Bar dataKey="value" fill="#062B49" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AdminCard>
    </div>
  );
}

// ============ TEMPLATES ============

type Template = Awaited<ReturnType<typeof listTemplates>>[number];

function TemplatesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTemplates);
  const delFn = useServerFn(deleteTemplate);
  const { data: templates, isLoading } = useQuery({ queryKey: ["dunning-templates"], queryFn: () => listFn() });

  const [editing, setEditing] = useState<Partial<Template> | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Template excluído"); qc.invalidateQueries({ queryKey: ["dunning-templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const g: Record<string, Template[]> = {};
    for (const t of (templates ?? [])) {
      (g[t.category] ??= []).push(t);
    }
    return g;
  }, [templates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates?.length ?? 0} template(s). Variáveis: <code className="rounded bg-muted px-1 text-[10px]">{"{{cliente}}"}</code> <code className="rounded bg-muted px-1 text-[10px]">{"{{valor}}"}</code> <code className="rounded bg-muted px-1 text-[10px]">{"{{vencimento}}"}</code> <code className="rounded bg-muted px-1 text-[10px]">{"{{dias_atraso}}"}</code> <code className="rounded bg-muted px-1 text-[10px]">{"{{dias_para_vencer}}"}</code> <code className="rounded bg-muted px-1 text-[10px]">{"{{link_pagamento}}"}</code>
        </p>
        <Button size="sm" onClick={() => setEditing({ category: "custom", format: "text", active: true, key: "", name: "", purpose: "custom", body: "" })} className="gap-2">
          <Plus className="h-4 w-4" /> Novo template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-card/60" />)}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const meta = CATEGORY_META[cat] ?? CATEGORY_META.custom;
          const Icon = meta.icon;
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn("grid h-7 w-7 place-items-center rounded-lg", meta.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <AdminCard key={t.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{t.name}</div>
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground font-mono">{t.key}</div>
                      </div>
                      {!t.active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">{t.body}</p>
                    <div className="mt-auto flex gap-1 pt-2 border-t border-border">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEditing(t)}>
                        <Edit3 className="h-3 w-3" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEditing({ ...t, id: undefined, key: `${t.key}_copy`, name: `${t.name} (cópia)` })}>
                        <Copy className="h-3 w-3" /> Duplicar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive ml-auto" onClick={() => { if (confirm("Excluir template?")) del.mutate(t.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </AdminCard>
                ))}
              </div>
            </div>
          );
        })
      )}

      {editing && <TemplateEditor initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

type TplButton = { text: string; id?: string };
type TplListItem = { text: string; id?: string; description?: string };
type TplListSection = { title: string; items: TplListItem[] };

function TemplateEditor({ initial, onClose }: { initial: Partial<Template>; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertTemplate);
  const [form, setForm] = useState({
    id: initial.id,
    key: initial.key ?? "",
    name: initial.name ?? "",
    purpose: initial.purpose ?? "custom",
    body: initial.body ?? "",
    category: (initial.category ?? "custom") as Template["category"],
    format: (initial.format ?? "text") as Template["format"],
    description: initial.description ?? "",
    active: initial.active ?? true,
    message_type: (initial.message_type ?? "text") as "text" | "button" | "list",
    footer_text: initial.footer_text ?? "",
    list_button_text: initial.list_button_text ?? "Ver opções",
    buttons: (initial.buttons ?? []) as TplButton[],
    list_sections: (initial.list_sections ?? []) as TplListSection[],
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      id: form.id, key: form.key, name: form.name, purpose: form.purpose, body: form.body,
      category: form.category as never, format: form.format as never,
      description: form.description || null, active: form.active,
      message_type: form.message_type,
      footer_text: form.footer_text || null,
      list_button_text: form.list_button_text || null,
      buttons: form.buttons.filter(b => b.text?.trim()),
      list_sections: form.list_sections
        .filter(s => s.title?.trim())
        .map(s => ({ ...s, items: (s.items ?? []).filter(it => it.text?.trim()) })),
    }}),
    onSuccess: () => { toast.success("Template salvo"); qc.invalidateQueries({ queryKey: ["dunning-templates"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- helpers de botões ---
  const addButton = () => {
    if (form.buttons.length >= 3) { toast.error("Máximo 3 botões (WhatsApp)"); return; }
    setForm({ ...form, buttons: [...form.buttons, { text: "", id: "" }] });
  };
  const updateButton = (i: number, patch: Partial<TplButton>) => {
    const next = [...form.buttons];
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, buttons: next });
  };
  const removeButton = (i: number) => setForm({ ...form, buttons: form.buttons.filter((_, idx) => idx !== i) });

  // --- helpers de lista ---
  const addSection = () => {
    if (form.list_sections.length >= 10) return;
    setForm({ ...form, list_sections: [...form.list_sections, { title: "", items: [{ text: "", id: "" }] }] });
  };
  const updateSection = (i: number, patch: Partial<TplListSection>) => {
    const next = [...form.list_sections];
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, list_sections: next });
  };
  const removeSection = (i: number) => setForm({ ...form, list_sections: form.list_sections.filter((_, idx) => idx !== i) });
  const addItem = (si: number) => {
    const next = [...form.list_sections];
    if ((next[si].items ?? []).length >= 10) return;
    next[si] = { ...next[si], items: [...(next[si].items ?? []), { text: "", id: "" }] };
    setForm({ ...form, list_sections: next });
  };
  const updateItem = (si: number, ii: number, patch: Partial<TplListItem>) => {
    const next = [...form.list_sections];
    const items = [...next[si].items];
    items[ii] = { ...items[ii], ...patch };
    next[si] = { ...next[si], items };
    setForm({ ...form, list_sections: next });
  };
  const removeItem = (si: number, ii: number) => {
    const next = [...form.list_sections];
    next[si] = { ...next[si], items: next[si].items.filter((_, idx) => idx !== ii) };
    setForm({ ...form, list_sections: next });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr,1fr] gap-5">
          <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Key (única)</Label>
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.replace(/[^a-z0-9_]/g, "_") })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Template["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo da mensagem</Label>
              <Select value={form.message_type} onValueChange={(v) => setForm({ ...form, message_type: v as "text" | "button" | "list" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="button">Botões de resposta</SelectItem>
                  <SelectItem value="list">Lista (menu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Enviado 3 dias antes do vencimento" />
          </div>
          <div>
            <Label>Corpo da mensagem</Label>
            <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="font-mono text-sm" />
            <div className="text-[11px] text-muted-foreground mt-1">
              Variáveis: <code>{"{{cliente}}"}</code> <code>{"{{empresa}}"}</code> <code>{"{{valor}}"}</code> <code>{"{{vencimento}}"}</code> <code>{"{{plano}}"}</code> <code>{"{{link_pagamento}}"}</code>
            </div>
          </div>

          {(form.message_type === "button" || form.message_type === "list") && (
            <div>
              <Label>Rodapé (opcional)</Label>
              <Input value={form.footer_text ?? ""} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} placeholder="Ex: Responda abaixo" maxLength={60} />
            </div>
          )}

          {form.message_type === "button" && (
            <AdminCard className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Botões de resposta</div>
                  <div className="text-xs text-muted-foreground">Máx 3. WhatsApp limita 20 caracteres por botão.</div>
                </div>
                <Button size="sm" variant="outline" onClick={addButton} disabled={form.buttons.length >= 3} className="h-8 gap-1">
                  <Plus className="h-3 w-3" /> Botão
                </Button>
              </div>
              {form.buttons.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhum botão. Adicione ao menos 1.</div>}
              {form.buttons.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Texto</Label>
                    <Input value={b.text} maxLength={20} placeholder="Sim, confirmar" onChange={(e) => updateButton(i, { text: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">ID (opcional)</Label>
                    <Input value={b.id ?? ""} placeholder="confirm_yes" onChange={(e) => updateButton(i, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeButton(i)} className="text-destructive h-9 w-9">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </AdminCard>
          )}

          {form.message_type === "list" && (
            <AdminCard className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Lista (menu)</div>
                  <div className="text-xs text-muted-foreground">Organize em seções com itens selecionáveis.</div>
                </div>
                <Button size="sm" variant="outline" onClick={addSection} className="h-8 gap-1">
                  <Plus className="h-3 w-3" /> Seção
                </Button>
              </div>
              <div>
                <Label className="text-xs">Texto do botão que abre a lista</Label>
                <Input value={form.list_button_text ?? ""} maxLength={20} placeholder="Ver opções" onChange={(e) => setForm({ ...form, list_button_text: e.target.value })} />
              </div>
              {form.list_sections.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhuma seção. Adicione ao menos 1.</div>}
              {form.list_sections.map((s, si) => (
                <div key={si} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Título da seção</Label>
                      <Input value={s.title} maxLength={24} placeholder="Ex: Serviços" onChange={(e) => updateSection(si, { title: e.target.value })} />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeSection(si)} className="text-destructive h-9 w-9">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {s.items.map((it, ii) => (
                      <div key={ii} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end">
                        <div>
                          <Label className="text-xs">Item</Label>
                          <Input value={it.text} maxLength={24} placeholder="Consulta" onChange={(e) => updateItem(si, ii, { text: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">ID</Label>
                          <Input value={it.id ?? ""} placeholder="consulta_1" onChange={(e) => updateItem(si, ii, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} />
                        </div>
                        <div>
                          <Label className="text-xs">Descrição</Label>
                          <Input value={it.description ?? ""} maxLength={72} placeholder="Opcional" onChange={(e) => updateItem(si, ii, { description: e.target.value })} />
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(si, ii)} className="text-destructive h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => addItem(si)} className="h-7 gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Item
                    </Button>
                  </div>
                </div>
              ))}
            </AdminCard>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label className="text-sm">Ativo</Label>
          </div>
          </div>

          {/* Preview WhatsApp */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Preview no WhatsApp</div>
            <div className="lg:sticky lg:top-0">
              <WhatsAppPreview
                body={(form.body || "")
                  .replace(/\{\{\s*cliente\s*\}\}/g, "Dr. João Silva")
                  .replace(/\{\{\s*empresa\s*\}\}/g, "Clínica FisioMax")
                  .replace(/\{\{\s*valor\s*\}\}/g, "R$ 89,90")
                  .replace(/\{\{\s*vencimento\s*\}\}/g, "15/07/2026")
                  .replace(/\{\{\s*dias_atraso\s*\}\}/g, "3")
                  .replace(/\{\{\s*dias_para_vencer\s*\}\}/g, "3")
                  .replace(/\{\{\s*plano\s*\}\}/g, "PRO Mensal")
                  .replace(/\{\{\s*link_pagamento\s*\}\}/g, "https://pay.fisioflow.app/inv/abc")}
                type={form.message_type}
                footer={form.footer_text}
                buttons={form.buttons}
                listButtonText={form.list_button_text}
                sections={form.list_sections}
                sender="FisioFlow"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ FLUXOS ============

type FlowRow = Awaited<ReturnType<typeof listFlows>>["flows"][number];
type StepRow = Awaited<ReturnType<typeof listFlows>>["steps"][number];

function FlowsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listFlows);
  const tplFn = useServerFn(listTemplates);
  const delFlowFn = useServerFn(deleteFlow);
  const saveFlowFn = useServerFn(upsertFlow);

  const { data, isLoading } = useQuery({ queryKey: ["dunning-flows"], queryFn: () => listFn() });
  const { data: tpls } = useQuery({ queryKey: ["dunning-templates"], queryFn: () => tplFn() });

  const [editingFlow, setEditingFlow] = useState<Partial<FlowRow> | null>(null);
  const [editingStep, setEditingStep] = useState<{ flowId: string; step: Partial<StepRow> | null } | null>(null);

  const delFlow = useMutation({
    mutationFn: (id: string) => delFlowFn({ data: { id } }),
    onSuccess: () => { toast.success("Fluxo excluído"); qc.invalidateQueries({ queryKey: ["dunning-flows"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFlow = useMutation({
    mutationFn: (f: FlowRow) => saveFlowFn({ data: { id: f.id, name: f.name, description: f.description, is_active: !f.is_active, is_default: f.is_default, stop_on_paid: f.stop_on_paid, stop_on_negotiation: f.stop_on_negotiation } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dunning-flows"] }),
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-2xl bg-card/60" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.flows.length} fluxo(s) configurado(s)</p>
        <Button size="sm" onClick={() => setEditingFlow({ name: "", is_active: true, is_default: false, stop_on_paid: true, stop_on_negotiation: true })} className="gap-2">
          <Plus className="h-4 w-4" /> Novo fluxo
        </Button>
      </div>

      {data.flows.map((flow) => {
        const steps = data.steps.filter((s) => s.flow_id === flow.id).sort((a, b) => a.offset_days - b.offset_days);
        return (
          <AdminCard key={flow.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{flow.name}</h3>
                  {flow.is_default && <Badge className="bg-[#08C7BA] text-white text-[10px]">Padrão</Badge>}
                  <StatusBadge status={flow.is_active ? "active" : "inactive"} />
                </div>
                {flow.description && <p className="mt-1 text-xs text-muted-foreground">{flow.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => toggleFlow.mutate(flow)}>
                  {flow.is_active ? "Pausar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => setEditingFlow(flow)}>
                  <Edit3 className="h-3 w-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive" onClick={() => { if (confirm("Excluir fluxo? Steps também serão removidos.")) delFlow.mutate(flow.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Timeline horizontal */}
            <div className="overflow-x-auto">
              <div className="flex items-stretch gap-2 pb-2 min-w-max">
                {steps.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground w-full">
                    Nenhuma etapa. Adicione a primeira abaixo.
                  </div>
                )}
                {steps.map((step, idx) => {
                  const tpl = tpls?.find((t) => t.id === step.template_id);
                  const label = step.offset_days === 0 ? "Vencimento" : step.offset_days > 0 ? `+${step.offset_days}d` : `${step.offset_days}d`;
                  return (
                    <div key={step.id} className="flex items-stretch">
                      <button
                        onClick={() => setEditingStep({ flowId: flow.id, step })}
                        className={cn(
                          "min-w-[180px] rounded-xl border-2 p-3 text-left transition hover:border-[#08C7BA]",
                          step.is_active ? "border-border bg-card" : "border-dashed border-border bg-muted/30 opacity-60",
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[10px] font-semibold uppercase text-muted-foreground">Etapa {idx + 1}</div>
                          <Badge variant="outline" className="text-[10px]">{label}</Badge>
                        </div>
                        <div className="text-xs font-medium text-foreground truncate">{tpl?.name ?? "— sem template —"}</div>
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          {step.channel === "whatsapp" && <><MessageCircle className="h-3 w-3" /> WhatsApp</>}
                          {step.channel === "email" && <><Mail className="h-3 w-3" /> Email</>}
                          {step.channel === "both" && <><MessageCircle className="h-3 w-3" /><Mail className="h-3 w-3" /> WA+Email</>}
                        </div>
                      </button>
                      {idx < steps.length - 1 && (
                        <div className="grid place-items-center px-1 text-muted-foreground">→</div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setEditingStep({ flowId: flow.id, step: { flow_id: flow.id, trigger_type: "after_due", offset_days: 1, channel: "whatsapp", is_active: true, order_index: steps.length + 1 } })}
                  className="min-w-[120px] rounded-xl border-2 border-dashed border-border p-3 text-center text-xs text-muted-foreground hover:border-[#08C7BA] hover:text-[#08C7BA]"
                >
                  <Plus className="mx-auto h-4 w-4 mb-1" />
                  Adicionar etapa
                </button>
              </div>
            </div>
          </AdminCard>
        );
      })}

      {editingFlow && <FlowEditor initial={editingFlow} onClose={() => setEditingFlow(null)} />}
      {editingStep && <StepEditor initial={editingStep.step ?? { flow_id: editingStep.flowId }} templates={tpls ?? []} onClose={() => setEditingStep(null)} />}
    </div>
  );
}

function FlowEditor({ initial, onClose }: { initial: Partial<FlowRow>; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertFlow);
  const [form, setForm] = useState({
    id: initial.id,
    name: initial.name ?? "",
    description: initial.description ?? "",
    is_active: initial.is_active ?? true,
    is_default: initial.is_default ?? false,
    stop_on_paid: initial.stop_on_paid ?? true,
    stop_on_negotiation: initial.stop_on_negotiation ?? true,
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { ...form, description: form.description || null } }),
    onSuccess: () => { toast.success("Fluxo salvo"); qc.invalidateQueries({ queryKey: ["dunning-flows"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Editar fluxo" : "Novo fluxo"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativo</Label></div>
          <div className="flex items-center gap-3"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><Label>Fluxo padrão do sistema</Label></div>
          <div className="flex items-center gap-3"><Switch checked={form.stop_on_paid} onCheckedChange={(v) => setForm({ ...form, stop_on_paid: v })} /><Label>Parar quando fatura for paga</Label></div>
          <div className="flex items-center gap-3"><Switch checked={form.stop_on_negotiation} onCheckedChange={(v) => setForm({ ...form, stop_on_negotiation: v })} /><Label>Parar quando estiver em negociação</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepEditor({ initial, templates, onClose }: { initial: Partial<StepRow>; templates: Template[]; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertStep);
  const delFn = useServerFn(deleteStep);
  const [form, setForm] = useState({
    id: initial.id,
    flow_id: initial.flow_id ?? "",
    order_index: initial.order_index ?? 1,
    trigger_type: (initial.trigger_type ?? "after_due") as "before_due" | "on_due" | "after_due",
    offset_days: initial.offset_days ?? 1,
    template_id: initial.template_id ?? null,
    channel: (initial.channel ?? "whatsapp") as "whatsapp" | "email" | "both",
    is_active: initial.is_active ?? true,
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => { toast.success("Etapa salva"); qc.invalidateQueries({ queryKey: ["dunning-flows"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => delFn({ data: { id: form.id! } }),
    onSuccess: () => { toast.success("Etapa removida"); qc.invalidateQueries({ queryKey: ["dunning-flows"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form.id ? "Editar etapa" : "Nova etapa"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gatilho</Label>
              <Select value={form.trigger_type} onValueChange={(v) => {
                const trig = v as typeof form.trigger_type;
                let offset = form.offset_days;
                if (trig === "on_due") offset = 0;
                if (trig === "before_due" && offset > 0) offset = -offset;
                if (trig === "after_due" && offset < 0) offset = Math.abs(offset);
                setForm({ ...form, trigger_type: trig, offset_days: offset });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_due">Antes do vencimento</SelectItem>
                  <SelectItem value="on_due">No vencimento</SelectItem>
                  <SelectItem value="after_due">Após o vencimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Offset (dias)</Label>
              <Input type="number" value={form.offset_days} onChange={(e) => setForm({ ...form, offset_days: parseInt(e.target.value || "0", 10) })} disabled={form.trigger_type === "on_due"} />
            </div>
          </div>
          <div>
            <Label>Template</Label>
            <Select value={form.template_id ?? ""} onValueChange={(v) => setForm({ ...form, template_id: v || null })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.active).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-muted-foreground">({CATEGORY_META[t.category]?.label ?? t.category})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Canal</Label>
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as typeof form.channel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email (requer conector Resend)</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativa</Label></div>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
          {form.id ? (
            <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm("Remover etapa?")) del.mutate(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ EXECUÇÕES ============

function ExecutionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const fn = useServerFn(listExecutions);
  const { data, isLoading } = useQuery({
    queryKey: ["dunning-executions", statusFilter],
    queryFn: () => fn({ data: { status: statusFilter || undefined, days: 30 } }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="skipped">Pulados</SelectItem>
            <SelectItem value="stopped">Parados</SelectItem>
            <SelectItem value="pending_provider">Pendente provider</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{data?.length ?? 0} registro(s)</span>
      </div>

      <AdminCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma execução no período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left text-[11px] uppercase text-muted-foreground">
                  <th className="p-3">Data</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Fatura</th>
                  <th className="p-3">Mensagem / erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data ?? []).map((ex) => (
                  <tr key={ex.id} className="hover:bg-muted/30">
                    <td className="p-3 text-xs whitespace-nowrap">{new Date(ex.sent_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-xs">{ex.channel}</td>
                    <td className="p-3"><StatusBadge status={ex.status} /></td>
                    <td className="p-3 text-xs font-mono">{ex.invoice_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-md truncate">
                      {ex.error ? <span className="text-destructive">{ex.error}</span> : (ex.rendered_body ?? "").slice(0, 120)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
