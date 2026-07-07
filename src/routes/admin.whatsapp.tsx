import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell, AdminCard, StatusBadge } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  connectBtzap,
  disconnectBtzap,
  getBtzapConfig,
  refreshBtzapStatus,
  sendWhatsappText,
  updateBtzapConfig,
  listTemplates,
  upsertTemplate,
  runBillingBatch,
} from "@/lib/whatsapp.functions";
import { Loader2, QrCode, RefreshCw, Send, PowerOff, Copy, FileText, Plus, Zap } from "lucide-react";

export const Route = createFileRoute("/admin/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Admin FisioFlow" }] }),
  component: WhatsappPage,
});

function WhatsappPage() {
  return (
    <AdminShell title="Integração WhatsApp">
      <Tabs defaultValue="conexao" className="space-y-6">
        <TabsList className="bg-white border border-border">
          <TabsTrigger value="conexao">Conexão</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automacao">Automação</TabsTrigger>
          <TabsTrigger value="envio">Envio manual</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="conexao"><ConexaoTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="automacao"><AutomacaoTab /></TabsContent>
        <TabsContent value="envio"><EnvioTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

// ---------------- Conexão ----------------

function ConexaoTab() {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getBtzapConfig);
  const doConnect = useServerFn(connectBtzap);
  const doRefresh = useServerFn(refreshBtzapStatus);
  const doDisconnect = useServerFn(disconnectBtzap);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["btzap-config"],
    queryFn: () => fetchCfg(),
    refetchInterval: 8000,
  });

  const connect = useMutation({
    mutationFn: () => doConnect(),
    onSuccess: () => { toast.success("Solicitação enviada — escaneie o QR."); qc.invalidateQueries({ queryKey: ["btzap-config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refresh = useMutation({
    mutationFn: () => doRefresh(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["btzap-config"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const disc = useMutation({
    mutationFn: () => doDisconnect(),
    onSuccess: () => { toast.success("Desconectado"); qc.invalidateQueries({ queryKey: ["btzap-config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!cfg) return <div className="text-sm text-muted-foreground">Sem configuração.</div>;

  const status = cfg.connectionStatus;
  const configured = cfg.hasToken && !!cfg.urlBase;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AdminCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Status do número oficial</div>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={status === "connected" ? "success" : status === "connecting" ? "pending" : status === "disconnected" ? "inactive" : "failed"} />
              <span className="text-sm text-muted-foreground">{status}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <div><span className="text-muted-foreground">Número: </span>{cfg.phoneNumber ?? "—"}</div>
          <div><span className="text-muted-foreground">Perfil: </span>{cfg.profileName ?? "—"}</div>
          <div><span className="text-muted-foreground">Instância: </span>{cfg.instanceId ?? "—"}</div>
          <div><span className="text-muted-foreground">Última verificação: </span>{cfg.lastCheckAt ? new Date(cfg.lastCheckAt).toLocaleString("pt-BR") : "—"}</div>
          {cfg.lastError && <div className="text-red-600 text-xs mt-2">Erro: {cfg.lastError}</div>}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-[#08C7BA] hover:bg-[#00afa5]"
            disabled={!configured || connect.isPending}
            onClick={() => connect.mutate()}
          >
            {connect.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <QrCode className="h-4 w-4 mr-1" />}
            Gerar QR / Conectar
          </Button>
          <Button size="sm" variant="outline" disabled={disc.isPending} onClick={() => disc.mutate()}>
            <PowerOff className="h-4 w-4 mr-1" /> Desconectar
          </Button>
        </div>
        {!configured && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            Preencha token e URL base na aba <b>Configuração</b> antes de conectar.
          </div>
        )}
      </AdminCard>

      <AdminCard className="p-6 flex flex-col items-center justify-center min-h-[320px]">
        {cfg.qrCode ? (
          <>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Escaneie no WhatsApp Business</div>
            <QrPreview qr={cfg.qrCode} />
            <div className="mt-3 text-xs text-muted-foreground">Atualiza automaticamente a cada 8s</div>
          </>
        ) : status === "connected" ? (
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-sm text-muted-foreground">Número conectado e pronto para enviar mensagens.</div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Sem QR ativo. Clique em <b>Gerar QR</b> para iniciar o pareamento.
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function QrPreview({ qr }: { qr: string }) {
  // Aceita base64 raw, data URL, ou string do QR (fallback: renderiza como imagem se parecer data URL)
  const src = qr.startsWith("data:") ? qr : qr.startsWith("http") ? qr : `data:image/png;base64,${qr}`;
  return <img src={src} alt="QR Code WhatsApp" className="h-64 w-64 rounded-lg border border-border bg-white p-2" />;
}

// ---------------- Configuração ----------------

function ConfigTab() {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getBtzapConfig);
  const doUpdate = useServerFn(updateBtzapConfig);

  const { data: cfg } = useQuery({ queryKey: ["btzap-config"], queryFn: () => fetchCfg() });

  const [form, setForm] = useState({
    token: "",
    urlBase: "",
    webhookSecret: "",
    endpointQr: "",
    endpointStatus: "",
    endpointDisconnect: "",
    endpointSendText: "",
  });

  useEffect(() => {
    if (!cfg) return;
    setForm({
      token: "",
      urlBase: cfg.urlBase ?? "",
      webhookSecret: "",
      endpointQr: cfg.endpointQr,
      endpointStatus: cfg.endpointStatus,
      endpointDisconnect: cfg.endpointDisconnect,
      endpointSendText: cfg.endpointSendText,
    });
  }, [cfg]);

  const save = useMutation({
    mutationFn: (data: typeof form) => doUpdate({ data }),
    onSuccess: () => { toast.success("Configuração salva"); qc.invalidateQueries({ queryKey: ["btzap-config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/webhooks/btzap` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AdminCard className="p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Credenciais da API WhatsApp</div>
          <div className="text-xs text-muted-foreground mt-1">Token e URL base fornecidos pelo painel do provedor.</div>
        </div>
        <div className="space-y-3">
          <Field label={`Token ${cfg?.hasToken ? "(salvo ✓ — deixe vazio para manter)" : ""}`}>
            <Input type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder={cfg?.hasToken ? "••••••••" : "Bearer token da API WhatsApp"} />
          </Field>
          <Field label="URL base">
            <Input value={form.urlBase} onChange={(e) => setForm({ ...form, urlBase: e.target.value })} placeholder="https://api.provedor.com.br" />
          </Field>
          <Field label={`Webhook secret ${cfg?.hasWebhookSecret ? "(salvo ✓ — deixe vazio para manter)" : ""}`}>
            <Input type="password" value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} placeholder="string aleatória forte" />
          </Field>
        </div>
        <div>
          <Button size="sm" className="bg-[#08C7BA] hover:bg-[#00afa5]" onClick={() => save.mutate(form)} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Salvar credenciais
          </Button>
        </div>
      </AdminCard>

      <AdminCard className="p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Endpoints (avançado)</div>
          <div className="text-xs text-muted-foreground mt-1">Ajuste caso a API WhatsApp use paths diferentes dos padrões.</div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Conectar / QR"><Input value={form.endpointQr} onChange={(e) => setForm({ ...form, endpointQr: e.target.value })} /></Field>
          <Field label="Status"><Input value={form.endpointStatus} onChange={(e) => setForm({ ...form, endpointStatus: e.target.value })} /></Field>
          <Field label="Desconectar"><Input value={form.endpointDisconnect} onChange={(e) => setForm({ ...form, endpointDisconnect: e.target.value })} /></Field>
          <Field label="Enviar texto"><Input value={form.endpointSendText} onChange={(e) => setForm({ ...form, endpointSendText: e.target.value })} /></Field>
        </div>
        <div>
          <Button size="sm" variant="outline" onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar endpoints</Button>
        </div>
      </AdminCard>

      <AdminCard className="p-6 lg:col-span-2">
        <div className="text-sm font-semibold text-foreground">URL de webhook (configurar no provedor)</div>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copiado"); }}>
            <Copy className="h-4 w-4 mr-1" /> Copiar
          </Button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Na API WhatsApp, aponte o webhook para essa URL. Envie o <code>webhook secret</code> no header <code>x-webhook-secret</code> (ou parâmetro <code>?secret=</code>).
          Chamadas sem o secret correto retornam 401.
        </div>
      </AdminCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ---------------- Envio manual ----------------

function EnvioTab() {
  const doSend = useServerFn(sendWhatsappText);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: () => doSend({ data: { to, body, relatedType: "manual" } }),
    onSuccess: () => { toast.success("Mensagem enviada"); setBody(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminCard className="p-6 max-w-xl space-y-4">
      <div>
        <div className="text-sm font-semibold text-foreground">Enviar mensagem manual</div>
        <div className="text-xs text-muted-foreground mt-1">Envio pelo número oficial do FisioFlow. Fica registrado em Logs.</div>
      </div>
      <Field label="Número (DDI + DDD + número, só dígitos)">
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="5511999998888" />
      </Field>
      <Field label="Mensagem">
        <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Olá! Aqui é o FisioFlow…" />
      </Field>
      <Button
        className="bg-[#08C7BA] hover:bg-[#00afa5]"
        disabled={!to || !body || send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
        Enviar
      </Button>
    </AdminCard>
  );
}

// ---------------- Logs ----------------

type LogRow = {
  id: string;
  to_number: string;
  body: string | null;
  status: string;
  related_type: string | null;
  error: string | null;
  external_id: string | null;
  created_at: string;
};

function LogsTab() {
  const { data: logs = [], refetch, isFetching } = useQuery<LogRow[]>({
    queryKey: ["whatsapp-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_message_logs")
        .select("id,to_number,body,status,related_type,error,external_id,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    refetchInterval: 15_000,
  });

  return (
    <AdminCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-foreground">Últimas 200 mensagens</div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {logs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma mensagem enviada ainda.</div>
      ) : (
        <div className="divide-y divide-border">
          {logs.map((l) => (
            <div key={l.id} className="p-4 grid grid-cols-1 md:grid-cols-[160px_1fr_120px_140px] gap-3 items-start text-sm">
              <div className="text-muted-foreground text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
              <div>
                <div className="font-medium">{l.to_number}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{l.body ?? "—"}</div>
                {l.error && <div className="text-xs text-red-600 mt-1">{l.error}</div>}
              </div>
              <div className="text-xs text-muted-foreground">{l.related_type ?? "manual"}</div>
              <StatusBadge status={l.status === "sent" || l.status === "delivered" || l.status === "read" ? "success" : l.status === "failed" ? "failed" : "pending"} />
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

// ---------------- Templates ----------------

type TemplateRow = {
  id: string;
  key: string;
  name: string;
  purpose: string;
  body: string;
  buttons: Array<{ id?: string; text: string; url?: string; phone?: string; reply?: string }>;
  variables: string[];
  active: boolean;
};

function TemplatesTab() {
  const fetchTpls = useServerFn(listTemplates);
  const doUpsert = useServerFn(upsertTemplate);
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["wpp-templates"],
    queryFn: () => fetchTpls(),
  });

  const [editing, setEditing] = useState<TemplateRow | null>(null);

  const save = useMutation({
    mutationFn: (t: TemplateRow) => doUpsert({ data: {
      key: t.key, name: t.name, purpose: t.purpose, body: t.body,
      buttons: t.buttons, variables: t.variables, active: t.active,
    } }),
    onSuccess: () => { toast.success("Template salvo"); qc.invalidateQueries({ queryKey: ["wpp-templates"] }); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <AdminCard className="p-3">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Templates</div>
          <Button size="sm" variant="ghost" onClick={() => setEditing({
            id: "", key: "novo_template", name: "Novo template", purpose: "custom",
            body: "Olá {nome}!", buttons: [], variables: ["nome"], active: true,
          })}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setEditing(t as TemplateRow)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-muted transition ${editing?.id === t.id ? "bg-muted" : ""}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium truncate">{t.name}</span>
                {!t.active && <span className="text-[10px] text-muted-foreground">(off)</span>}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.key} · {t.purpose}</div>
            </button>
          ))}
          {templates.length === 0 && <div className="p-4 text-xs text-muted-foreground text-center">Nenhum template.</div>}
        </div>
      </AdminCard>

      {editing ? (
        <AdminCard className="p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Chave (interno)">
              <Input value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="cobranca_mensal" />
            </Field>
            <Field label="Nome">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Finalidade">
              <Input value={editing.purpose} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })} placeholder="billing / otp_login / etc" />
            </Field>
            <Field label="Ativo">
              <div className="flex items-center h-10"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /></div>
            </Field>
          </div>
          <Field label={`Corpo — variáveis: ${editing.variables.map(v => "{" + v + "}").join(" ")}`}>
            <Textarea rows={8} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Botões</Label>
              <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, buttons: [...editing.buttons, { text: "Novo botão" }] })}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {editing.buttons.map((b, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input placeholder="Texto" value={b.text} onChange={(e) => {
                    const nb = [...editing.buttons]; nb[idx] = { ...nb[idx], text: e.target.value };
                    setEditing({ ...editing, buttons: nb });
                  }} />
                  <Input placeholder="URL (use {link_pagamento})" value={b.url ?? ""} onChange={(e) => {
                    const nb = [...editing.buttons]; nb[idx] = { ...nb[idx], url: e.target.value };
                    setEditing({ ...editing, buttons: nb });
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => {
                    const nb = editing.buttons.filter((_, i) => i !== idx);
                    setEditing({ ...editing, buttons: nb });
                  }}>Remover</Button>
                </div>
              ))}
              {editing.buttons.length === 0 && <div className="text-xs text-muted-foreground">Sem botões (envia como texto puro).</div>}
            </div>
          </div>
          <Field label="Variáveis (uma por linha, sem chaves)">
            <Textarea rows={3} value={editing.variables.join("\n")} onChange={(e) => setEditing({ ...editing, variables: e.target.value.split("\n").filter(Boolean) })} />
          </Field>
          <div className="flex gap-2">
            <Button className="bg-[#08C7BA] hover:bg-[#00afa5]" disabled={save.isPending} onClick={() => save.mutate(editing)}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Salvar template
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </AdminCard>
      ) : (
        <AdminCard className="p-8 text-center text-sm text-muted-foreground">
          Selecione um template ou crie um novo.
        </AdminCard>
      )}
    </div>
  );
}

// ---------------- Automação de cobrança ----------------

function AutomacaoTab() {
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getBtzapConfig);
  const doUpdate = useServerFn(updateBtzapConfig);
  const doBatch = useServerFn(runBillingBatch);

  const { data: cfg } = useQuery({ queryKey: ["btzap-config"], queryFn: () => fetchCfg() });

  // Lê os campos extra direto da tabela pra editar
  const { data: raw } = useQuery({
    queryKey: ["btzap-config-raw"],
    queryFn: async () => {
      const { data } = await supabase.from("btzap_config").select("*").eq("id", 1).maybeSingle();
      return data as { billing_automation_enabled: boolean; billing_days_before: number; billing_days_after: number; otp_enabled: boolean } | null;
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [before, setBefore] = useState(3);
  const [after, setAfter] = useState(1);
  const [otp, setOtp] = useState(true);

  useEffect(() => {
    if (raw) {
      setEnabled(raw.billing_automation_enabled);
      setBefore(raw.billing_days_before);
      setAfter(raw.billing_days_after);
      setOtp(raw.otp_enabled);
    }
  }, [raw]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("btzap_config").update({
        billing_automation_enabled: enabled,
        billing_days_before: before,
        billing_days_after: after,
        otp_enabled: otp,
      } as never).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["btzap-config-raw"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: () => doBatch(),
    onSuccess: (r) => toast.success(`Lote enviado: ${r.sent} ok · ${r.failed} falhas · ${r.skipped} pulados`),
    onError: (e: Error) => toast.error(e.message),
  });

  const connected = cfg?.connectionStatus === "connected";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AdminCard className="p-6 space-y-5">
        <div>
          <div className="text-sm font-semibold text-foreground">Automação de cobrança</div>
          <div className="text-xs text-muted-foreground mt-1">Envia mensalidades no WhatsApp automaticamente conforme vencimento.</div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Ativar automação</div>
            <div className="text-xs text-muted-foreground">Quando ligada, o lote pode ser disparado pelo cron.</div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dias antes do vencimento"><Input type="number" min={0} max={30} value={before} onChange={(e) => setBefore(Number(e.target.value))} /></Field>
          <Field label="Dias após vencimento"><Input type="number" min={0} max={60} value={after} onChange={(e) => setAfter(Number(e.target.value))} /></Field>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="text-sm font-medium">OTP via WhatsApp</div>
            <div className="text-xs text-muted-foreground">Habilita login e reset por código.</div>
          </div>
          <Switch checked={otp} onCheckedChange={setOtp} />
        </div>
        <div className="flex gap-2">
          <Button className="bg-[#08C7BA] hover:bg-[#00afa5]" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Salvar
          </Button>
        </div>
      </AdminCard>

      <AdminCard className="p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Disparo manual do lote</div>
          <div className="text-xs text-muted-foreground mt-1">
            Envia agora para todas as mensalidades dentro da janela acima (pendentes/vencidas com telefone cadastrado).
          </div>
        </div>
        <Button
          disabled={!connected || runNow.isPending}
          onClick={() => runNow.mutate()}
          className="bg-[#062B49] hover:bg-[#0A3D66]"
        >
          {runNow.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
          Disparar cobrança agora
        </Button>
        {!connected && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Conecte o número na aba <b>Conexão</b> primeiro.</div>}
        <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
          <div><b>Cron sugerido:</b> configure no seu scheduler para chamar o disparo diariamente às 9h.</div>
          <div>URL do lote (server function): use o painel — chamada externa não é exposta por segurança.</div>
        </div>
      </AdminCard>
    </div>
  );
}
