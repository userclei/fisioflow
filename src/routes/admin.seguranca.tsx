import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, ShieldAlert, ShieldCheck, Bot, Zap, Globe, FileText, AlertTriangle,
  Ban, Phone, Activity, Settings2, Plus, Trash2, Play, Sparkles,
} from "lucide-react";
import {
  securityOverview, listSecurityEvents,
  listPIRules, upsertPIRule, deletePIRule, testPromptInjection,
  listRateLimits, upsertRateLimit, deleteRateLimit,
  listBlocks, createBlock, removeBlock,
  listIncidents, upsertIncident,
  listLGPD, upsertLGPD,
  getSecuritySettings, updateSecuritySettings,
} from "@/lib/security.functions";

export const Route = createFileRoute("/admin/seguranca")({
  component: SegurancaPage,
});

const SEV_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function SevBadge({ v }: { v: string }) {
  return <Badge className={SEV_BADGE[v] ?? SEV_BADGE.low}>{v}</Badge>;
}

function SegurancaPage() {
  return (
    <AdminShell title="Central de Segurança" subtitle="Proteção em camadas: bots, prompt injection, rate limit, LGPD e incidentes.">
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="overview"><Shield className="h-4 w-4 mr-1.5" />Visão Geral</TabsTrigger>
            <TabsTrigger value="pi"><Sparkles className="h-4 w-4 mr-1.5" />Prompt Injection</TabsTrigger>
            <TabsTrigger value="antibot"><Bot className="h-4 w-4 mr-1.5" />Anti-Bot</TabsTrigger>
            <TabsTrigger value="ratelimit"><Zap className="h-4 w-4 mr-1.5" />Rate Limit</TabsTrigger>
            <TabsTrigger value="firewall"><Globe className="h-4 w-4 mr-1.5" />Firewall</TabsTrigger>
            <TabsTrigger value="lgpd"><FileText className="h-4 w-4 mr-1.5" />LGPD</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="h-4 w-4 mr-1.5" />Incidentes</TabsTrigger>
            <TabsTrigger value="blocks"><Ban className="h-4 w-4 mr-1.5" />Bloqueios</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1.5" />Logs</TabsTrigger>
            <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-1.5" />Config</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="pi" className="mt-6"><PromptInjectionTab /></TabsContent>
          <TabsContent value="antibot" className="mt-6"><AntiBotTab /></TabsContent>
          <TabsContent value="ratelimit" className="mt-6"><RateLimitTab /></TabsContent>
          <TabsContent value="firewall" className="mt-6"><FirewallTab /></TabsContent>
          <TabsContent value="lgpd" className="mt-6"><LGPDTab /></TabsContent>
          <TabsContent value="incidents" className="mt-6"><IncidentsTab /></TabsContent>
          <TabsContent value="blocks" className="mt-6"><BlocksTab /></TabsContent>
          <TabsContent value="logs" className="mt-6"><LogsTab /></TabsContent>
          <TabsContent value="config" className="mt-6"><ConfigTab /></TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

// ---------- OVERVIEW ----------
function OverviewTab() {
  const fn = useServerFn(securityOverview);
  const { data, isLoading } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fn(), refetchInterval: 30_000 });
  if (isLoading || !data) return <div className="text-muted-foreground">Carregando…</div>;

  const scoreColor = data.score >= 80 ? "text-emerald-500" : data.score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = data.score >= 80 ? "from-emerald-500/10" : data.score >= 50 ? "from-amber-500/10" : "from-red-500/10";

  const cards = [
    { label: "Ameaças 24h", value: data.threats_24h, icon: AlertTriangle, tone: "amber" },
    { label: "Prompt Injection", value: data.prompt_injection, icon: Sparkles, tone: "purple" },
    { label: "Bots bloqueados", value: data.bots, icon: Bot, tone: "blue" },
    { label: "IPs bloqueados", value: data.ips_blocked, icon: Globe, tone: "red" },
    { label: "Telefones bloqueados", value: data.phones_blocked, icon: Phone, tone: "red" },
    { label: "Falhas de login", value: data.login_failures, icon: ShieldAlert, tone: "orange" },
    { label: "Rate limit atingido", value: data.rate_limited, icon: Zap, tone: "amber" },
    { label: "Abuso de OTP", value: data.otp_abuse, icon: Phone, tone: "orange" },
    { label: "Incidentes abertos", value: data.open_incidents, icon: AlertTriangle, tone: data.open_incidents > 0 ? "red" : "emerald" },
  ];

  return (
    <div className="space-y-6">
      <Card className={`overflow-hidden bg-gradient-to-br ${scoreBg} to-transparent`}>
        <CardContent className="p-6 flex items-center gap-6">
          <div className="grid place-items-center h-24 w-24 rounded-full bg-background border-4 border-current shadow-lg" style={{ borderColor: "currentColor" }}>
            <span className={`text-4xl font-bold ${scoreColor}`}>{data.score}</span>
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Score de Segurança</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {data.score >= 80 ? "Sistema seguro" : data.score >= 50 ? "Atenção necessária" : "Crítico — ação imediata"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Baseado em eventos das últimas 24h.</div>
          </div>
          <div className="hidden md:flex flex-col gap-2 items-end">
            <StatusPill label="Prompt Injection" ok={data.settings?.prompt_injection_enabled} />
            <StatusPill label="Anti-Bot" ok={data.settings?.anti_bot_enabled} />
            <StatusPill label="WAF/CDN" ok={data.settings?.waf_enabled} warn />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <c.icon className={`h-5 w-5 text-${c.tone}-500`} />
                <span className="text-2xl font-bold text-foreground">{c.value}</span>
              </div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  const color = ok ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ---------- PROMPT INJECTION ----------
function PromptInjectionTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPIRules);
  const upsertFn = useServerFn(upsertPIRule);
  const delFn = useServerFn(deletePIRule);
  const testFn = useServerFn(testPromptInjection);

  const { data: rules = [] } = useQuery({ queryKey: ["pi-rules"], queryFn: () => listFn() });
  const upsert = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => { toast.success("Regra salva"); qc.invalidateQueries({ queryKey: ["pi-rules"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["pi-rules"] }); },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  async function runTest() {
    try {
      const r = await testFn({ data: { text: testText } });
      setTestResult(r);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Regras de Detecção ({(rules as any[]).length})</CardTitle>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing({ name: "", pattern: "", category: "bypass", severity: "high", action: "block_ai", is_active: true })}>
                  <Plus className="h-4 w-4 mr-1" /> Nova regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} regra</DialogTitle></DialogHeader>
                {editing && (
                  <div className="space-y-3">
                    <div><Label>Nome</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
                    <div><Label>Padrão (regex)</Label>
                      <Input className="font-mono text-xs" value={editing.pattern} onChange={e => setEditing({ ...editing, pattern: e.target.value })} placeholder="(?i)ignore instru..." />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Categoria</Label>
                        <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system_prompt">System prompt</SelectItem>
                            <SelectItem value="data_exfiltration">Exfiltração</SelectItem>
                            <SelectItem value="tool_abuse">Abuso de ferramenta</SelectItem>
                            <SelectItem value="credential_theft">Roubo credencial</SelectItem>
                            <SelectItem value="bypass">Bypass</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Severidade</Label>
                        <Select value={editing.severity} onValueChange={v => setEditing({ ...editing, severity: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["low","medium","high","critical"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Ação</Label>
                        <Select value={editing.action} onValueChange={v => setEditing({ ...editing, action: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="log">Apenas log</SelectItem>
                            <SelectItem value="quarantine">Quarentena</SelectItem>
                            <SelectItem value="block_ai">Bloquear IA</SelectItem>
                            <SelectItem value="block_number">Bloquear número</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Ativa</Label></div>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => upsert.mutate(editing)} disabled={upsert.isPending}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(rules as any[]).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{r.name}</span>
                      <SevBadge v={r.severity} />
                      <Badge variant="outline" className="text-xs">{r.action}</Badge>
                      {!r.is_active && <Badge variant="secondary">Inativa</Badge>}
                    </div>
                    <code className="text-xs text-muted-foreground font-mono truncate block mt-1">{r.pattern}</code>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-foreground flex items-center gap-2"><Play className="h-4 w-4" />Testar detecção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={5} value={testText} onChange={e => setTestText(e.target.value)} placeholder="Cole uma mensagem para testar..." />
          <Button onClick={runTest} disabled={!testText} className="w-full">Analisar</Button>
          {testResult && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risco</span>
                <SevBadge v={testResult.level === "safe" ? "low" : testResult.level} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="font-bold text-foreground">{testResult.risk_score}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ação</span>
                <Badge>{testResult.action}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Padrões detectados:</div>
                {testResult.matched.length === 0 ? <span className="text-xs text-emerald-500">Nenhum</span> :
                  testResult.matched.map((m: any) => <div key={m.rule_id} className="text-xs text-foreground">• {m.name}</div>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- ANTI-BOT ----------
function AntiBotTab() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-foreground">Proteção Anti-Bot</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Configurações gerais estão na aba <strong>Config</strong>. Este painel resume as camadas ativas.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { name: "Honeypot invisível", desc: "Campo oculto que bots preenchem" },
            { name: "Tempo mínimo de formulário", desc: "Detecta preenchimento robótico" },
            { name: "Validação de user-agent", desc: "Bloqueia UA vazio/suspeito" },
            { name: "Detecção de e-mail temporário", desc: "Lista de domínios descartáveis" },
            { name: "Rate limit por IP em leads", desc: "Configurável em Rate Limit" },
            { name: "Verificação WhatsApp", desc: "Envia código para número real" },
          ].map(c => (
            <div key={c.name} className="p-3 rounded-lg border bg-card">
              <div className="font-medium text-foreground text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.desc}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- RATE LIMIT ----------
function RateLimitTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRateLimits);
  const upsertFn = useServerFn(upsertRateLimit);
  const delFn = useServerFn(deleteRateLimit);
  const { data: rules = [] } = useQuery({ queryKey: ["rl-rules"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const upsert = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["rl-rules"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rl-rules"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Regras de Rate Limit</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing({ name: "", target: "ip", endpoint_pattern: "*", max_requests: 10, window_seconds: 60, action: "block", is_active: true })}>
              <Plus className="h-4 w-4 mr-1" /> Nova regra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} regra</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Alvo</Label>
                    <Select value={editing.target} onValueChange={v => setEditing({ ...editing, target: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["ip","user","phone","email","workspace","endpoint"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ação</Label>
                    <Select value={editing.action} onValueChange={v => setEditing({ ...editing, action: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["log","challenge","block","quarantine"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Endpoint (pattern)</Label><Input value={editing.endpoint_pattern} onChange={e => setEditing({ ...editing, endpoint_pattern: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Máx. requisições</Label><Input type="number" value={editing.max_requests} onChange={e => setEditing({ ...editing, max_requests: Number(e.target.value) })} /></div>
                  <div><Label>Janela (segundos)</Label><Input type="number" value={editing.window_seconds} onChange={e => setEditing({ ...editing, window_seconds: Number(e.target.value) })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Ativa</Label></div>
              </div>
            )}
            <DialogFooter><Button onClick={() => upsert.mutate(editing)} disabled={upsert.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(rules as any[]).map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{r.name}</span>
                  <Badge variant="outline">{r.target}</Badge>
                  <Badge className={SEV_BADGE[r.action === "block" || r.action === "quarantine" ? "high" : "low"]}>{r.action}</Badge>
                  {!r.is_active && <Badge variant="secondary">Inativa</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <code>{r.endpoint_pattern}</code> — {r.max_requests} req / {r.window_seconds}s
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- FIREWALL ----------
function FirewallTab() {
  const items = [
    { name: "CDN / WAF na borda", status: "warn", desc: "Configure Cloudflare/similar antes da aplicação" },
    { name: "Cache agressivo da landing", status: "ok", desc: "Assets servidos por CDN Lovable" },
    { name: "Rate limit por endpoint", status: "ok", desc: "Configurado no painel Rate Limit" },
    { name: "CORS restrito", status: "ok", desc: "APIs internas mesmo origem" },
    { name: "Headers de segurança", status: "warn", desc: "CSP, HSTS, X-Frame-Options — revisar" },
    { name: "Payload máximo", status: "ok", desc: "Configurável em Config → max_payload_kb" },
    { name: "Bloqueio de métodos", status: "ok", desc: "Handlers só respondem métodos declarados" },
    { name: "Webhooks — assinatura", status: "warn", desc: "Validar HMAC em cada webhook público" },
    { name: "Downloads via link temporário", status: "warn", desc: "Implementar signed URLs quando aplicável" },
  ];
  const c = { ok: "text-emerald-500", warn: "text-amber-500", bad: "text-red-500" };
  return (
    <Card>
      <CardHeader><CardTitle className="text-foreground">Checklist Firewall / WAF / DDoS</CardTitle></CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(i => (
            <div key={i.name} className="p-3 rounded-lg border bg-card flex items-start gap-3">
              <ShieldCheck className={`h-5 w-5 mt-0.5 ${c[i.status as keyof typeof c]}`} />
              <div>
                <div className="font-medium text-foreground text-sm">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- LGPD ----------
function LGPDTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLGPD);
  const upsertFn = useServerFn(upsertLGPD);
  const { data: reqs = [] } = useQuery({ queryKey: ["lgpd"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const upsert = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["lgpd"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total de solicitações</div><div className="text-2xl font-bold text-foreground">{(reqs as any[]).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Em processamento</div><div className="text-2xl font-bold text-amber-500">{(reqs as any[]).filter((r:any) => r.status === "processing").length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Concluídas</div><div className="text-2xl font-bold text-emerald-500">{(reqs as any[]).filter((r:any) => r.status === "completed").length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Solicitações de Titulares (LGPD)</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditing({ requester_name: "", request_type: "access", status: "received" })}><Plus className="h-4 w-4 mr-1" />Nova</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing?.id ? "Atualizar" : "Nova"} solicitação</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div><Label>Nome do titular</Label><Input value={editing.requester_name} onChange={e => setEditing({ ...editing, requester_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>E-mail</Label><Input value={editing.requester_email ?? ""} onChange={e => setEditing({ ...editing, requester_email: e.target.value })} /></div>
                    <div><Label>Telefone</Label><Input value={editing.requester_phone ?? ""} onChange={e => setEditing({ ...editing, requester_phone: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tipo</Label>
                      <Select value={editing.request_type} onValueChange={v => setEditing({ ...editing, request_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="access">Acesso</SelectItem>
                          <SelectItem value="correction">Correção</SelectItem>
                          <SelectItem value="deletion">Exclusão</SelectItem>
                          <SelectItem value="anonymization">Anonimização</SelectItem>
                          <SelectItem value="portability">Portabilidade</SelectItem>
                          <SelectItem value="consent_revocation">Revogação de consentimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Status</Label>
                      <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["received","validating_identity","processing","completed","rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Notas</Label><Textarea rows={3} value={editing.notes ?? ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
                </div>
              )}
              <DialogFooter><Button onClick={() => upsert.mutate(editing)}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(reqs as any[]).length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma solicitação registrada.</div> :
          <div className="space-y-2">{(reqs as any[]).map(r => (
            <div key={r.id} className="p-3 rounded-lg border bg-card flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium text-foreground">{r.requester_name}</div>
                <div className="text-xs text-muted-foreground">{r.requester_email ?? r.requester_phone ?? "—"} · {r.request_type}</div>
              </div>
              <Badge>{r.status}</Badge>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Editar</Button>
            </div>
          ))}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- INCIDENTS ----------
function IncidentsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listIncidents);
  const upsertFn = useServerFn(upsertIncident);
  const { data: items = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const upsert = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["incidents"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Incidentes de Segurança</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing({ title: "", description: "", severity: "medium", status: "open", source: "admin" })}><Plus className="h-4 w-4 mr-1" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Atualizar" : "Novo"} incidente</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea rows={4} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Severidade</Label>
                    <Select value={editing.severity} onValueChange={v => setEditing({ ...editing, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["low","medium","high","critical"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["open","investigating","contained","resolved","false_positive"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Origem</Label>
                    <Select value={editing.source} onValueChange={v => setEditing({ ...editing, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["web","api","whatsapp","admin","system"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter><Button onClick={() => upsert.mutate(editing)}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(items as any[]).length === 0 ? <div className="text-sm text-muted-foreground">Nenhum incidente aberto. 🎉</div> :
        <div className="space-y-2">{(items as any[]).map(i => (
          <div key={i.id} className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">{i.title}</span>
              <SevBadge v={i.severity} />
              <Badge variant="outline">{i.status}</Badge>
              <Badge variant="secondary">{i.source}</Badge>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => { setEditing(i); setOpen(true); }}>Editar</Button>
            </div>
            {i.description && <p className="text-sm text-muted-foreground mt-2">{i.description}</p>}
          </div>
        ))}</div>}
      </CardContent>
    </Card>
  );
}

// ---------- BLOCKS ----------
function BlocksTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBlocks);
  const createFn = useServerFn(createBlock);
  const removeFn = useServerFn(removeBlock);
  const { data: items = [] } = useQuery({ queryKey: ["blocks"], queryFn: () => listFn({ data: {} }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: "ip", value: "", reason: "", severity: "high", is_permanent: false, block_hours: 24 });
  const create = useMutation({
    mutationFn: (d: any) => createFn({ data: d }),
    onSuccess: () => { toast.success("Bloqueado"); qc.invalidateQueries({ queryKey: ["blocks"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Identificadores Bloqueados</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Bloquear</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo bloqueio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["ip","phone","email","user","workspace","device"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Severidade</Label>
                  <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["medium","high","critical"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Valor</Label><Input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Ex: 5511999999999" /></div>
              <div><Label>Motivo</Label><Textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_permanent} onCheckedChange={v => setForm({ ...form, is_permanent: v })} /><Label>Permanente</Label></div>
              {!form.is_permanent && <div><Label>Bloquear por (horas)</Label><Input type="number" value={form.block_hours} onChange={e => setForm({ ...form, block_hours: Number(e.target.value) })} /></div>}
            </div>
            <DialogFooter><Button onClick={() => create.mutate(form)} disabled={create.isPending}>Bloquear</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {(items as any[]).length === 0 ? <div className="text-sm text-muted-foreground">Nenhum bloqueio ativo.</div> :
        <div className="space-y-2">{(items as any[]).map(b => (
          <div key={b.id} className="p-3 rounded-lg border bg-card flex items-center gap-3">
            <Ban className="h-4 w-4 text-red-500" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{b.type}</Badge>
                <code className="text-sm text-foreground">{b.value_masked}</code>
                <SevBadge v={b.severity} />
                {b.is_permanent && <Badge>permanente</Badge>}
                {b.blocked_until && <span className="text-xs text-muted-foreground">até {new Date(b.blocked_until).toLocaleString("pt-BR")}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{b.reason}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}</div>}
      </CardContent>
    </Card>
  );
}

// ---------- LOGS ----------
function LogsTab() {
  const fn = useServerFn(listSecurityEvents);
  const { data: items = [] } = useQuery({ queryKey: ["sec-events"], queryFn: () => fn({ data: { limit: 200 } }), refetchInterval: 15_000 });
  return (
    <Card>
      <CardHeader><CardTitle className="text-foreground">Logs de Segurança (últimos 200)</CardTitle></CardHeader>
      <CardContent>
        {(items as any[]).length === 0 ? <div className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</div> :
        <div className="space-y-1 max-h-[600px] overflow-y-auto">{(items as any[]).map(e => (
          <div key={e.id} className="p-2 rounded border bg-card text-sm flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0 w-32">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
            <SevBadge v={e.severity} />
            <Badge variant="outline" className="text-xs">{e.source}</Badge>
            <span className="text-foreground truncate">{e.event_type}</span>
            <span className="text-muted-foreground truncate flex-1">{e.description}</span>
            <span className="text-xs text-muted-foreground">score {e.risk_score}</span>
          </div>
        ))}</div>}
      </CardContent>
    </Card>
  );
}

// ---------- CONFIG ----------
function ConfigTab() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSecuritySettings);
  const saveFn = useServerFn(updateSecuritySettings);
  const { data } = useQuery({ queryKey: ["sec-settings"], queryFn: () => getFn() });
  const [form, setForm] = useState<any>(null);
  if (data && !form) setTimeout(() => setForm(data), 0);
  const save = useMutation({
    mutationFn: (d: any) => saveFn({ data: d }),
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["sec-settings"] }); qc.invalidateQueries({ queryKey: ["sec-overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (!form) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-foreground">Proteções</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            ["prompt_injection_enabled", "Detector de Prompt Injection"],
            ["anti_bot_enabled", "Proteção Anti-Bot"],
            ["honeypot_enabled", "Honeypot em formulários"],
            ["captcha_enabled", "Captcha adaptativo"],
            ["waf_enabled", "WAF na borda (informativo)"],
            ["cors_strict", "CORS estrito"],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={!!form[k]} onCheckedChange={v => setForm({ ...form, [k]: v })} />
            </div>
          ))}
          <div><Label>Tempo mínimo de formulário (segundos)</Label><Input type="number" value={form.min_form_seconds} onChange={e => setForm({ ...form, min_form_seconds: Number(e.target.value) })} /></div>
          <div><Label>Payload máximo (KB)</Label><Input type="number" value={form.max_payload_kb} onChange={e => setForm({ ...form, max_payload_kb: Number(e.target.value) })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-foreground">LGPD & Retenção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do DPO (Encarregado)</Label><Input value={form.dpo_name ?? ""} onChange={e => setForm({ ...form, dpo_name: e.target.value })} /></div>
          <div><Label>E-mail do DPO</Label><Input value={form.dpo_email ?? ""} onChange={e => setForm({ ...form, dpo_email: e.target.value })} /></div>
          <div><Label>URL Política de Privacidade</Label><Input value={form.privacy_policy_url ?? ""} onChange={e => setForm({ ...form, privacy_policy_url: e.target.value })} /></div>
          <div><Label>URL Termos de Uso</Label><Input value={form.terms_url ?? ""} onChange={e => setForm({ ...form, terms_url: e.target.value })} /></div>
          <div><Label>Retenção de dados (dias)</Label><Input type="number" value={form.data_retention_days} onChange={e => setForm({ ...form, data_retention_days: Number(e.target.value) })} /></div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button size="lg" onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar configurações</Button>
      </div>
    </div>
  );
}
