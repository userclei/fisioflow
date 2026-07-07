import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, SectionHeader, StatusBadge } from "@/components/admin/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LegalContent } from "@/components/legal/LegalShell";
import {
  listLegalDocs, getLegalSettings, updateLegalSettings,
  createLegalDraft, updateLegalDoc, publishLegalDoc, deleteLegalDraft,
} from "@/lib/legal.functions";
import { FileText, Shield, Cookie, Plus, Trash2, CheckCircle2, ExternalLink, Save, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/politicas")({
  head: () => ({ meta: [{ title: "Políticas & LGPD — Admin FisioFlow" }] }),
  component: Page,
});

type Kind = "privacy" | "terms" | "cookies";
const KIND_LABEL: Record<Kind, string> = { privacy: "Política de Privacidade", terms: "Termos de Uso", cookies: "Política de Cookies" };

function Page() {
  return (
    <AdminShell
      title="Políticas & LGPD"
      subtitle="Gerencie Política de Privacidade, Termos de Uso e dados institucionais"
    >
      <Tabs defaultValue="privacy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="privacy" className="gap-2"><Shield className="h-4 w-4" /> Privacidade</TabsTrigger>
          <TabsTrigger value="terms" className="gap-2"><FileText className="h-4 w-4" /> Termos</TabsTrigger>
          <TabsTrigger value="cookies" className="gap-2"><Cookie className="h-4 w-4" /> Cookies</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Shield className="h-4 w-4" /> Dados institucionais</TabsTrigger>
        </TabsList>
        <TabsContent value="privacy"><KindTab kind="privacy" publicUrl="/politica-de-privacidade" /></TabsContent>
        <TabsContent value="terms"><KindTab kind="terms" publicUrl="/termos-de-uso" /></TabsContent>
        <TabsContent value="cookies"><KindTab kind="cookies" publicUrl={null} /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function KindTab({ kind, publicUrl }: { kind: Kind; publicUrl: string | null }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLegalDocs);
  const createFn = useServerFn(createLegalDraft);
  const delFn = useServerFn(deleteLegalDraft);
  const pubFn = useServerFn(publishLegalDoc);

  const { data: docs } = useQuery({ queryKey: ["legal-docs", kind], queryFn: () => listFn({ data: { kind } }) });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && docs && docs.length > 0) {
      const current = (docs as any[]).find(d => d.is_current) || docs[0];
      setSelectedId(current.id);
    }
  }, [docs, selectedId]);

  const create = useMutation({
    mutationFn: () => createFn({ data: { kind } }),
    onSuccess: (r) => {
      toast.success(`Nova versão v${(r as any).version} criada`);
      qc.invalidateQueries({ queryKey: ["legal-docs", kind] });
      setSelectedId((r as any).id);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Versão excluída"); qc.invalidateQueries({ queryKey: ["legal-docs", kind] }); setSelectedId(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const publish = useMutation({
    mutationFn: (id: string) => pubFn({ data: { id } }),
    onSuccess: () => { toast.success("Versão publicada — visível ao público"); qc.invalidateQueries({ queryKey: ["legal-docs", kind] }); qc.invalidateQueries({ queryKey: ["legal", kind] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const selected = (docs as any[] | undefined)?.find(d => d.id === selectedId);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <AdminCard>
        <SectionHeader
          title={`Versões (${docs?.length ?? 0})`}
          action={<Button size="sm" onClick={() => create.mutate()} disabled={create.isPending} className="gap-1"><Plus className="h-4 w-4" /> Nova</Button>}
        />
        <div className="space-y-1">
          {(docs ?? []).map((d: any) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                selectedId === d.id ? "bg-[#08C7BA]/10 border border-[#08C7BA]/40" : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">v{d.version}</span>
                {d.is_current ? <StatusBadge status="active" /> : <StatusBadge status="draft" />}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(d.updated_at).toLocaleDateString("pt-BR")}
              </div>
            </button>
          ))}
          {(docs ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">Nenhuma versão</div>
          )}
        </div>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1 text-xs text-[#08C7BA] hover:underline">
            Ver página pública <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </AdminCard>

      {selected ? (
        <Editor
          key={selected.id}
          doc={selected}
          kindLabel={KIND_LABEL[kind]}
          onDelete={() => del.mutate(selected.id)}
          onPublish={() => publish.mutate(selected.id)}
        />
      ) : (
        <AdminCard>
          <div className="py-10 text-center text-muted-foreground">Selecione uma versão à esquerda ou crie uma nova.</div>
        </AdminCard>
      )}
    </div>
  );
}

function Editor({ doc, kindLabel, onDelete, onPublish }: {
  doc: any; kindLabel: string; onDelete: () => void; onPublish: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState<string>(doc.title);
  const [summary, setSummary] = useState<string>(doc.summary || "");
  const [content, setContent] = useState<string>(doc.content_md);
  const [effective, setEffective] = useState<string>(doc.effective_date);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const updFn = useServerFn(updateLegalDoc);
  const save = useMutation({
    mutationFn: () => updFn({ data: { id: doc.id, title, summary: summary || null, content_md: content, effective_date: effective } }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["legal-docs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminCard>
      <SectionHeader
        title={`${kindLabel} — v${doc.version}`}
        description={doc.is_current ? "Versão publicada — cuidado ao editar" : "Rascunho — não visível ao público"}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending} className="gap-1">
              <Save className="h-4 w-4" /> Salvar
            </Button>
            {!doc.is_current && (
              <>
                <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1 text-destructive"><Trash2 className="h-4 w-4" /> Excluir</Button>
                <Button size="sm" onClick={onPublish} className="gap-1"><CheckCircle2 className="h-4 w-4" /> Publicar</Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-3 mb-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Data efetiva</Label>
          <Input type="date" value={effective} onChange={e => setEffective(e.target.value)} />
        </div>
        <div className="md:col-span-3">
          <Label>Resumo (opcional)</Label>
          <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="Breve descrição para meta description e SEO" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="space-y-3">
        <TabsList>
          <TabsTrigger value="edit" className="gap-2"><FileText className="h-4 w-4" /> Markdown</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" /> Pré-visualização</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            value={content} onChange={e => setContent(e.target.value)}
            className="font-mono text-sm min-h-[500px]"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Placeholders disponíveis: <code>{"{{COMPANY_NAME}}"}</code>, <code>{"{{LEGAL_NAME}}"}</code>, <code>{"{{CNPJ}}"}</code>, <code>{"{{ADDRESS}}"}</code>, <code>{"{{DPO_NAME}}"}</code>, <code>{"{{DPO_EMAIL}}"}</code>, <code>{"{{CONTACT_EMAIL}}"}</code>, <code>{"{{JURISDICTION}}"}</code>, <code>{"{{EFFECTIVE_DATE}}"}</code>, <code>{"{{VERSION}}"}</code>
          </div>
        </TabsContent>
        <TabsContent value="preview">
          <div className="rounded-xl border border-border bg-background p-6 md:p-8 max-h-[600px] overflow-auto">
            <LegalContent md={content} />
          </div>
        </TabsContent>
      </Tabs>
    </AdminCard>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const getFn = useServerFn(getLegalSettings);
  const updFn = useServerFn(updateLegalSettings);
  const { data } = useQuery({ queryKey: ["legal-settings"], queryFn: () => getFn() });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  const save = useMutation({
    mutationFn: () => updFn({ data: form }),
    onSuccess: () => { toast.success("Dados atualizados"); qc.invalidateQueries({ queryKey: ["legal-settings"] }); qc.invalidateQueries({ queryKey: ["legal"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return <AdminCard><div className="py-10 text-center text-muted-foreground">Carregando…</div></AdminCard>;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <AdminCard>
      <SectionHeader
        title="Dados institucionais"
        description="Preenchidos automaticamente nos documentos legais via placeholders"
        action={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1"><Save className="h-4 w-4" /> Salvar</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Nome comercial *</Label><Input value={form.company_name || ""} onChange={e => set("company_name", e.target.value)} /></div>
        <div><Label>Razão social</Label><Input value={form.legal_name || ""} onChange={e => set("legal_name", e.target.value)} /></div>
        <div><Label>CNPJ</Label><Input value={form.cnpj || ""} onChange={e => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" /></div>
        <div><Label>Website</Label><Input value={form.website_url || ""} onChange={e => set("website_url", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} /></div>
        <div><Label>Cidade</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>UF</Label><Input value={form.state || ""} onChange={e => set("state", e.target.value)} /></div>
          <div><Label>CEP</Label><Input value={form.zip || ""} onChange={e => set("zip", e.target.value)} /></div>
        </div>
        <div><Label>País</Label><Input value={form.country || ""} onChange={e => set("country", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Foro / Jurisdição *</Label><Input value={form.jurisdiction || ""} onChange={e => set("jurisdiction", e.target.value)} /></div>
        <div className="md:col-span-2 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-3">Encarregado (DPO) — LGPD</h4>
        </div>
        <div><Label>Nome do DPO</Label><Input value={form.dpo_name || ""} onChange={e => set("dpo_name", e.target.value)} /></div>
        <div><Label>E-mail do DPO</Label><Input type="email" value={form.dpo_email || ""} onChange={e => set("dpo_email", e.target.value)} /></div>
        <div className="md:col-span-2 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-3">Contato geral</h4>
        </div>
        <div><Label>E-mail de contato</Label><Input type="email" value={form.contact_email || ""} onChange={e => set("contact_email", e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={form.contact_phone || ""} onChange={e => set("contact_phone", e.target.value)} /></div>
      </div>
    </AdminCard>
  );
}
