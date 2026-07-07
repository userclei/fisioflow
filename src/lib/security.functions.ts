import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SB = {
  from: (t: string) => any;
  rpc: (n: string, p?: any) => any;
};
type Ctx = { supabase: SB; userId: string };

async function assertSuper(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_super_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Acesso negado");
}

// ---------- OVERVIEW ----------

export const securityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [events, incidents, blocks, settings] = await Promise.all([
      ctx.supabase.from("security_events").select("event_type, severity, source").gte("created_at", since),
      ctx.supabase.from("security_incidents").select("id, status, severity").in("status", ["open", "investigating"]),
      ctx.supabase.from("blocked_identifiers").select("type"),
      ctx.supabase.from("security_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    const evs = (events.data ?? []) as Array<{ event_type: string; severity: string; source: string }>;
    const count = (t: string) => evs.filter(e => e.event_type === t).length;
    const blocksByType = ((blocks.data ?? []) as Array<{ type: string }>).reduce((acc: Record<string, number>, b) => {
      acc[b.type] = (acc[b.type] ?? 0) + 1; return acc;
    }, {});

    const critical = evs.filter(e => e.severity === "critical").length;
    const high = evs.filter(e => e.severity === "high").length;
    const score = Math.max(0, 100 - critical * 15 - high * 5 - Math.min(20, evs.length));

    return {
      score,
      threats_24h: evs.length,
      prompt_injection: count("security.prompt_injection_blocked") + count("security.prompt_injection_suspected"),
      bots: count("security.bot_detected"),
      ips_blocked: blocksByType.ip ?? 0,
      phones_blocked: blocksByType.phone ?? 0,
      login_failures: count("security.login_bruteforce_detected"),
      rate_limited: count("security.rate_limit_exceeded"),
      otp_abuse: count("security.otp_abuse"),
      open_incidents: (incidents.data ?? []).length,
      settings: settings.data,
    };
  });

// ---------- EVENTS / LOGS ----------

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().min(1).max(500).default(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error("Falha ao carregar eventos");
    return rows ?? [];
  });

// ---------- PROMPT INJECTION RULES ----------

const piRuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  pattern: z.string().min(1).max(500),
  category: z.enum(["system_prompt", "data_exfiltration", "tool_abuse", "credential_theft", "bypass", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  action: z.enum(["log", "quarantine", "block_ai", "block_number"]),
  is_active: z.boolean().default(true),
});

export const listPIRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await ctx.supabase.from("prompt_injection_rules").select("*").order("severity", { ascending: false });
    if (error) throw new Error("Falha");
    return data ?? [];
  });

export const upsertPIRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => piRuleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    // valida regex
    try { new RegExp(data.pattern, "i"); } catch { throw new Error("Padrão regex inválido"); }
    const row = { ...data };
    const { error } = data.id
      ? await ctx.supabase.from("prompt_injection_rules").update(row).eq("id", data.id)
      : await ctx.supabase.from("prompt_injection_rules").insert(row);
    if (error) throw new Error("Falha ao salvar regra");
    return { ok: true };
  });

export const deletePIRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    await ctx.supabase.from("prompt_injection_rules").delete().eq("id", data.id);
    return { ok: true };
  });

export const testPromptInjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data: rules } = await ctx.supabase.from("prompt_injection_rules").select("*").eq("is_active", true);
    const { detectPromptInjection } = await import("./security-core.server");
    return detectPromptInjection(data.text, (rules ?? []) as any);
  });

// ---------- RATE LIMIT RULES ----------

const rlSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  target: z.enum(["ip", "user", "phone", "email", "workspace", "endpoint"]),
  endpoint_pattern: z.string().min(1).max(200),
  max_requests: z.number().int().min(1).max(100000),
  window_seconds: z.number().int().min(1).max(86400 * 7),
  action: z.enum(["log", "challenge", "block", "quarantine"]),
  is_active: z.boolean().default(true),
});

export const listRateLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data } = await ctx.supabase.from("rate_limit_rules").select("*").order("target", { ascending: true });
    return data ?? [];
  });

export const upsertRateLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rlSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { error } = data.id
      ? await ctx.supabase.from("rate_limit_rules").update(data).eq("id", data.id)
      : await ctx.supabase.from("rate_limit_rules").insert(data);
    if (error) throw new Error("Falha ao salvar");
    return { ok: true };
  });

export const deleteRateLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    await ctx.supabase.from("rate_limit_rules").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- BLOCKED IDENTIFIERS ----------

const blockSchema = z.object({
  type: z.enum(["ip", "phone", "email", "user", "workspace", "device"]),
  value: z.string().min(1).max(200),
  reason: z.string().min(1).max(300),
  severity: z.enum(["medium", "high", "critical"]).default("high"),
  is_permanent: z.boolean().default(false),
  block_hours: z.number().int().min(1).max(24 * 365).optional(),
});

export const listBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ type: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    let q = ctx.supabase.from("blocked_identifiers").select("*").order("created_at", { ascending: false });
    if (data.type) q = q.eq("type", data.type);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const createBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => blockSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const core = await import("./security-core.server");
    const value_hash = core.hashValue(data.value);
    const value_masked =
      data.type === "phone" ? core.maskPhone(data.value) :
      data.type === "email" ? core.maskEmail(data.value) :
      data.type === "ip"    ? core.maskIP(data.value) :
      data.value.slice(0, 8) + "***";
    const blocked_until = data.is_permanent || !data.block_hours
      ? null
      : new Date(Date.now() + data.block_hours * 3600 * 1000).toISOString();
    const { error } = await ctx.supabase.from("blocked_identifiers").insert({
      type: data.type, value_hash, value_masked,
      reason: data.reason, severity: data.severity,
      is_permanent: data.is_permanent, blocked_until,
      created_by: ctx.userId,
    });
    if (error) throw new Error("Falha ao bloquear (já pode estar na lista)");
    await ctx.supabase.from("security_events").insert({
      event_type: `security.${data.type}_blocked`, severity: data.severity, source: "admin",
      risk_score: 100, description: `Bloqueio manual: ${data.reason}`,
      metadata: { type: data.type, value_masked, by: ctx.userId },
    });
    return { ok: true };
  });

export const removeBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    await ctx.supabase.from("blocked_identifiers").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- INCIDENTS ----------

const incSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(4000).default(""),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "investigating", "contained", "resolved", "false_positive"]).default("open"),
  source: z.enum(["web", "api", "whatsapp", "admin", "system"]).default("admin"),
});

export const listIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data } = await ctx.supabase.from("security_incidents").select("*").order("opened_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const upsertIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => incSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const row: any = { ...data };
    if (data.status === "resolved" || data.status === "false_positive") row.resolved_at = new Date().toISOString();
    const { error } = data.id
      ? await ctx.supabase.from("security_incidents").update(row).eq("id", data.id)
      : await ctx.supabase.from("security_incidents").insert(row);
    if (error) throw new Error("Falha ao salvar incidente");
    return { ok: true };
  });

// ---------- LGPD ----------

const lgpdSchema = z.object({
  id: z.string().uuid().optional(),
  requester_name: z.string().min(2).max(200),
  requester_email: z.string().email().max(200).optional().nullable(),
  requester_phone: z.string().max(30).optional().nullable(),
  request_type: z.enum(["access", "correction", "deletion", "anonymization", "portability", "consent_revocation"]),
  status: z.enum(["received", "validating_identity", "processing", "completed", "rejected"]).default("received"),
  notes: z.string().max(2000).optional().nullable(),
});

export const listLGPD = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data } = await ctx.supabase.from("lgpd_requests").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertLGPD = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => lgpdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const row: any = { ...data };
    if (data.status === "completed") row.completed_at = new Date().toISOString();
    const { error } = data.id
      ? await ctx.supabase.from("lgpd_requests").update(row).eq("id", data.id)
      : await ctx.supabase.from("lgpd_requests").insert(row);
    if (error) throw new Error("Falha ao salvar");
    return { ok: true };
  });

// ---------- SETTINGS ----------

const settingsSchema = z.object({
  anti_bot_enabled: z.boolean(),
  honeypot_enabled: z.boolean(),
  captcha_enabled: z.boolean(),
  min_form_seconds: z.number().int().min(0).max(60),
  prompt_injection_enabled: z.boolean(),
  waf_enabled: z.boolean(),
  cors_strict: z.boolean(),
  max_payload_kb: z.number().int().min(16).max(10240),
  dpo_name: z.string().max(200).nullable().optional(),
  dpo_email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  privacy_policy_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
  terms_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
  data_retention_days: z.number().int().min(30).max(3650),
});

export const getSecuritySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data } = await ctx.supabase.from("security_settings").select("*").eq("id", 1).maybeSingle();
    return data;
  });

export const updateSecuritySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { error } = await ctx.supabase.from("security_settings").update(data).eq("id", 1);
    if (error) throw new Error("Falha ao salvar");
    return { ok: true };
  });
