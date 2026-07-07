import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- helpers ----------

type BtzapConfigRow = {
  id: number;
  token: string | null;
  url_base: string | null;
  webhook_secret: string | null;
  endpoint_qr: string;
  endpoint_status: string;
  endpoint_disconnect: string;
  endpoint_send_text: string;
  instance_id: string | null;
  connection_status: string;
  qr_code: string | null;
  phone_number: string | null;
  profile_name: string | null;
  last_check_at: string | null;
  last_error: string | null;
  updated_at: string;
};

type SupabaseCtx = { supabase: { from: (t: string) => never; rpc: (n: string, p?: never) => never }; userId: string };

async function assertSuperAdmin(ctx: SupabaseCtx) {
  const { data, error } = await (ctx.supabase.rpc as unknown as (
    n: string,
    p: { _user_id: string },
  ) => Promise<{ data: boolean | null; error: unknown }>)("is_super_admin", {
    _user_id: ctx.userId,
  });
  if (error || !data) throw new Error("Acesso negado");
}

async function loadConfig(ctx: SupabaseCtx): Promise<BtzapConfigRow> {
  const { data, error } = await (ctx.supabase.from("btzap_config") as unknown as {
    select: (c: string) => { eq: (k: string, v: number) => { maybeSingle: () => Promise<{ data: BtzapConfigRow | null; error: unknown }> } };
  })
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error("Falha ao ler configuração");
  if (!data) throw new Error("Configuração da API WhatsApp não inicializada");
  return data;
}

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function btzapFetch(
  cfg: BtzapConfigRow,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  if (!cfg.token || !cfg.url_base) throw new Error("API WhatsApp não configurada (token/URL base)");
  const url = joinUrl(cfg.url_base, path);
  const res = await fetch(url, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, json, text };
}

function publicConfig(cfg: BtzapConfigRow) {
  return {
    hasToken: !!cfg.token,
    hasWebhookSecret: !!cfg.webhook_secret,
    urlBase: cfg.url_base ?? "",
    endpointQr: cfg.endpoint_qr,
    endpointStatus: cfg.endpoint_status,
    endpointDisconnect: cfg.endpoint_disconnect,
    endpointSendText: cfg.endpoint_send_text,
    instanceId: cfg.instance_id,
    connectionStatus: cfg.connection_status,
    qrCode: cfg.qr_code,
    phoneNumber: cfg.phone_number,
    profileName: cfg.profile_name,
    lastCheckAt: cfg.last_check_at,
    lastError: cfg.last_error,
    updatedAt: cfg.updated_at,
  };
}

// ---------- server functions ----------

export const getBtzapConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as unknown as SupabaseCtx);
    const cfg = await loadConfig(context as unknown as SupabaseCtx);
    return publicConfig(cfg);
  });

const updateSchema = z.object({
  token: z.string().optional(),
  urlBase: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  endpointQr: z.string().min(1).optional(),
  endpointStatus: z.string().min(1).optional(),
  endpointDisconnect: z.string().min(1).optional(),
  endpointSendText: z.string().min(1).optional(),
});

export const updateBtzapConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as unknown as SupabaseCtx);
    const patch: Record<string, unknown> = {};
    if (data.token !== undefined && data.token !== "") patch.token = data.token;
    if (data.urlBase !== undefined) patch.url_base = data.urlBase;
    if (data.webhookSecret !== undefined && data.webhookSecret !== "") patch.webhook_secret = data.webhookSecret;
    if (data.endpointQr !== undefined) patch.endpoint_qr = data.endpointQr;
    if (data.endpointStatus !== undefined) patch.endpoint_status = data.endpointStatus;
    if (data.endpointDisconnect !== undefined) patch.endpoint_disconnect = data.endpointDisconnect;
    if (data.endpointSendText !== undefined) patch.endpoint_send_text = data.endpointSendText;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await (
      (context as unknown as SupabaseCtx).supabase.from("btzap_config") as unknown as {
        update: (p: Record<string, unknown>) => { eq: (k: string, v: number) => Promise<{ error: unknown }> };
      }
    )
      .update(patch)
      .eq("id", 1);
    if (error) throw new Error("Falha ao salvar configuração");
    return { ok: true };
  });

export const connectBtzap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await assertSuperAdmin(ctx);
    const cfg = await loadConfig(ctx);
    const res = await btzapFetch(cfg, cfg.endpoint_qr, { method: "POST", body: { webhook: null } });
    const body = (res.json ?? {}) as Record<string, unknown>;
    const qr = (body.qrcode as string | undefined) ?? (body.qr as string | undefined) ?? (body.base64 as string | undefined) ?? null;
    const instanceId = (body.instance as string | undefined) ?? (body.instanceId as string | undefined) ?? (body.session as string | undefined) ?? null;
    const patch: Record<string, unknown> = {
      connection_status: res.ok ? "connecting" : "error",
      qr_code: qr,
      last_check_at: new Date().toISOString(),
      last_error: res.ok ? null : `HTTP ${res.status}: ${res.text.slice(0, 200)}`,
    };
    if (instanceId) patch.instance_id = instanceId;
    await ((ctx.supabase.from("btzap_config") as unknown as {
      update: (p: Record<string, unknown>) => { eq: (k: string, v: number) => Promise<{ error: unknown }> };
    }).update(patch).eq("id", 1));
    if (!res.ok) throw new Error(`Provedor respondeu ${res.status}. Verifique token/URL/endpoint.`);
    return { ok: true, qrCode: qr, instanceId };
  });

export const refreshBtzapStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await assertSuperAdmin(ctx);
    const cfg = await loadConfig(ctx);
    const res = await btzapFetch(cfg, cfg.endpoint_status, { method: "GET" });
    const body = (res.json ?? {}) as Record<string, unknown>;
    const status =
      (body.status as string | undefined) ??
      (body.state as string | undefined) ??
      (body.connectionStatus as string | undefined) ??
      (res.ok ? "unknown" : "error");
    const phone = (body.number as string | undefined) ?? (body.phone as string | undefined) ?? (body.wid as string | undefined) ?? null;
    const profile = (body.name as string | undefined) ?? (body.profileName as string | undefined) ?? null;
    const qr = (body.qrcode as string | undefined) ?? (body.qr as string | undefined) ?? null;
    const patch: Record<string, unknown> = {
      connection_status: normalizeStatus(status),
      phone_number: phone ?? cfg.phone_number,
      profile_name: profile ?? cfg.profile_name,
      last_check_at: new Date().toISOString(),
      last_error: res.ok ? null : `HTTP ${res.status}: ${res.text.slice(0, 200)}`,
    };
    if (qr) patch.qr_code = qr;
    if (normalizeStatus(status) === "connected") patch.qr_code = null;
    await ((ctx.supabase.from("btzap_config") as unknown as {
      update: (p: Record<string, unknown>) => { eq: (k: string, v: number) => Promise<{ error: unknown }> };
    }).update(patch).eq("id", 1));
    return { status: normalizeStatus(status), phone, profile };
  });

function normalizeStatus(s: string) {
  const v = s.toLowerCase();
  if (["open", "connected", "online", "ready", "authenticated"].some(k => v.includes(k))) return "connected";
  if (["qr", "pairing", "connecting", "loading"].some(k => v.includes(k))) return "connecting";
  if (["close", "disconnected", "offline", "logout"].some(k => v.includes(k))) return "disconnected";
  if (v.includes("error") || v.includes("fail")) return "error";
  return v || "unknown";
}

export const disconnectBtzap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await assertSuperAdmin(ctx);
    const cfg = await loadConfig(ctx);
    const res = await btzapFetch(cfg, cfg.endpoint_disconnect, { method: "POST" });
    await ((ctx.supabase.from("btzap_config") as unknown as {
      update: (p: Record<string, unknown>) => { eq: (k: string, v: number) => Promise<{ error: unknown }> };
    }).update({
      connection_status: "disconnected",
      qr_code: null,
      last_check_at: new Date().toISOString(),
      last_error: res.ok ? null : `HTTP ${res.status}`,
    }).eq("id", 1));
    return { ok: true };
  });

const sendSchema = z.object({
  to: z.string().min(8),
  body: z.string().min(1).max(4000),
  relatedType: z.string().optional(),
  relatedId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
});

export const sendWhatsappText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await assertSuperAdmin(ctx);
    const cfg = await loadConfig(ctx);
    const to = data.to.replace(/\D/g, "");
    if (to.length < 8) throw new Error("Número inválido");

    // Log queued
    const logInsert = await ((ctx.supabase.from("whatsapp_message_logs") as unknown as {
      insert: (p: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    })
      .insert({
        to_number: to,
        body: data.body,
        status: "queued",
        related_type: data.relatedType ?? "manual",
        related_id: data.relatedId ?? null,
        workspace_id: data.workspaceId ?? null,
        created_by: ctx.userId,
      })
      .select("id")
      .single());
    const logId = logInsert.data?.id;

    const res = await btzapFetch(cfg, cfg.endpoint_send_text, {
      method: "POST",
      body: { number: to, phone: to, to, text: data.body, message: data.body, body: data.body },
    });
    const body = (res.json ?? {}) as Record<string, unknown>;
    const externalId =
      (body.id as string | undefined) ??
      (body.messageId as string | undefined) ??
      ((body.key as Record<string, unknown> | undefined)?.id as string | undefined) ??
      null;

    if (logId) {
      await ((ctx.supabase.from("whatsapp_message_logs") as unknown as {
        update: (p: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
      }).update({
        status: res.ok ? "sent" : "failed",
        external_id: externalId,
        error: res.ok ? null : `HTTP ${res.status}: ${res.text.slice(0, 300)}`,
        sent_at: res.ok ? new Date().toISOString() : null,
        failed_at: res.ok ? null : new Date().toISOString(),
        metadata: body as unknown as Record<string, unknown>,
      }).eq("id", logId));
    }

    if (!res.ok) throw new Error(`Falha no envio (HTTP ${res.status})`);
    return { ok: true, externalId, logId };
  });

// =========================================================
// TEMPLATES (admin)
// =========================================================

const templateSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  purpose: z.string().min(2),
  body: z.string().min(2),
  buttons: z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(1),
    url: z.string().optional(),
    phone: z.string().optional(),
    reply: z.string().optional(),
  })).default([]),
  variables: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as unknown as SupabaseCtx);
    const { data, error } = await ((context as unknown as SupabaseCtx).supabase.from("whatsapp_templates") as unknown as {
      select: (c: string) => { order: (c: string) => Promise<{ data: unknown; error: unknown }> };
    }).select("*").order("key");
    if (error) throw new Error("Falha ao listar templates");
    return (data ?? []) as Array<{ id: string; key: string; name: string; purpose: string; body: string; buttons: Array<Record<string, string>>; variables: string[]; active: boolean }>;
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as unknown as SupabaseCtx);
    const { error } = await ((context as unknown as SupabaseCtx).supabase.from("whatsapp_templates") as unknown as {
      upsert: (row: unknown, opts?: { onConflict?: string }) => Promise<{ error: unknown }>;
    }).upsert({
      key: data.key,
      name: data.name,
      purpose: data.purpose,
      body: data.body,
      buttons: data.buttons,
      variables: data.variables,
      active: data.active,
    }, { onConflict: "key" });
    if (error) throw new Error("Falha ao salvar template");
    return { ok: true };
  });

// =========================================================
// COBRANÇA
// =========================================================

export const sendChargeReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await assertSuperAdmin(ctx);
    const core = await import("./whatsapp-core.server");
    const admin = core.getAdmin();

    const { data: inv } = await admin
      .from("invoices")
      .select("id, amount, due_date, status, workspace_id, workspaces:workspace_id(name, responsible_name, phone)")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!inv) throw new Error("Fatura não encontrada");
    const ws = (inv as unknown as { workspaces: { name?: string; responsible_name?: string; phone?: string } | null }).workspaces;
    const phoneRaw = ws?.phone ?? "";
    if (!phoneRaw) throw new Error("Empresa sem telefone cadastrado");
    const phone = core.normalizePhone(phoneRaw);

    const cfg = await core.loadBtzapConfigAdmin();
    const isOverdue = inv.status === "overdue";
    const templateKey = isOverdue ? "cobranca_vencida" : "cobranca_mensal";
    const { data: tpl } = await admin.from("whatsapp_templates").select("*").eq("key", templateKey).maybeSingle();
    if (!tpl) throw new Error(`Template ${templateKey} não configurado`);

    const nome = ws?.responsible_name ?? ws?.name ?? "cliente";
    const valor = Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const vencimento = new Date(inv.due_date).toLocaleDateString("pt-BR");
    const link = `https://fisioflow.app/assinatura?invoice=${inv.id}`;

    const vars = { nome, valor, vencimento, link_pagamento: link, link_fatura: link };
    const body = core.renderTemplate(tpl.body as string, vars);
    const rawButtons = (tpl.buttons as unknown as Array<{ id?: string; text: string; url?: string; phone?: string; reply?: string }>) ?? [];
    const buttons = rawButtons.map(b => ({
      ...b,
      url: b.url ? core.renderTemplate(b.url, vars) : undefined,
    }));

    const res = buttons.length > 0
      ? await core.sendButtons(cfg, phone, body, buttons)
      : await core.sendText(cfg, phone, body);

    const externalId = (res.json.id as string | undefined) ?? (res.json.messageId as string | undefined) ?? null;
    await core.logMessage({
      to: phone,
      body,
      status: res.ok ? "sent" : "failed",
      externalId,
      error: res.ok ? null : `HTTP ${res.status}`,
      relatedType: "charge",
      relatedId: inv.id,
      workspaceId: inv.workspace_id,
      createdBy: ctx.userId,
      template: templateKey,
      metadata: res.json,
    });
    if (!res.ok) throw new Error(`Falha (HTTP ${res.status})`);
    return { ok: true };
  });

export const runBillingBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await assertSuperAdmin(ctx);
    const core = await import("./whatsapp-core.server");
    const admin = core.getAdmin();
    const cfg = await core.loadBtzapConfigAdmin();

    const today = new Date();
    const before = new Date(today); before.setDate(today.getDate() + cfg.billing_days_before);
    const after = new Date(today); after.setDate(today.getDate() - cfg.billing_days_after);

    const { data: invoices } = await admin
      .from("invoices")
      .select("id, amount, due_date, status, workspace_id, workspaces:workspace_id(name, responsible_name, phone)")
      .in("status", ["pending", "overdue"])
      .gte("due_date", after.toISOString().slice(0, 10))
      .lte("due_date", before.toISOString().slice(0, 10))
      .limit(500);

    let sent = 0, failed = 0, skipped = 0;
    for (const inv of invoices ?? []) {
      const ws = (inv as unknown as { workspaces: { name?: string; responsible_name?: string; phone?: string } | null }).workspaces;
      if (!ws?.phone) { skipped++; continue; }
      const phone = core.normalizePhone(ws.phone);
      const isOverdue = inv.status === "overdue";
      const templateKey = isOverdue ? "cobranca_vencida" : "cobranca_mensal";
      const { data: tpl } = await admin.from("whatsapp_templates").select("*").eq("key", templateKey).eq("active", true).maybeSingle();
      if (!tpl) { skipped++; continue; }
      const nome = ws.responsible_name ?? ws.name ?? "cliente";
      const valor = Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      const vencimento = new Date(inv.due_date).toLocaleDateString("pt-BR");
      const link = `https://fisioflow.app/assinatura?invoice=${inv.id}`;
      const vars = { nome, valor, vencimento, link_pagamento: link, link_fatura: link };
      const body = core.renderTemplate(tpl.body as string, vars);
      const rawButtons = (tpl.buttons as unknown as Array<{ id?: string; text: string; url?: string }>) ?? [];
      const buttons = rawButtons.map(b => ({ ...b, url: b.url ? core.renderTemplate(b.url, vars) : undefined }));
      const res = buttons.length > 0
        ? await core.sendButtons(cfg, phone, body, buttons)
        : await core.sendText(cfg, phone, body);
      await core.logMessage({
        to: phone, body,
        status: res.ok ? "sent" : "failed",
        externalId: (res.json.id as string | undefined) ?? null,
        error: res.ok ? null : `HTTP ${res.status}`,
        relatedType: "charge_batch",
        relatedId: inv.id,
        workspaceId: inv.workspace_id,
        createdBy: ctx.userId,
        template: templateKey,
        metadata: res.json,
      });
      if (res.ok) sent++; else failed++;
    }
    return { total: invoices?.length ?? 0, sent, failed, skipped };
  });

// =========================================================
// OTP (login sem senha, reset)
// Anon-callable: nenhum middleware requireSupabaseAuth aqui.
// =========================================================

const requestOtpSchema = z.object({
  phone: z.string().min(8),
  purpose: z.enum(["login", "reset", "signup", "verify"]),
});

export const requestWhatsappOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestOtpSchema.parse(d))
  .handler(async ({ data }) => {
    const core = await import("./whatsapp-core.server");
    const admin = core.getAdmin();
    const cfg = await core.loadBtzapConfigAdmin();
    if (!cfg.otp_enabled) throw new Error("OTP desativado");

    const phone = core.normalizePhone(data.phone);

    // Rate limit: máx 3 códigos em 10min por telefone/purpose
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await admin
      .from("whatsapp_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("purpose", data.purpose)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("Muitas tentativas. Aguarde alguns minutos.");

    // Para login/reset: precisa existir profile com esse telefone
    let userId: string | null = null;
    if (data.purpose === "login" || data.purpose === "reset") {
      const { data: prof } = await admin
        .from("profiles")
        .select("auth_user_id")
        .eq("phone_e164", phone)
        .maybeSingle();
      if (!prof?.auth_user_id) throw new Error("Número não cadastrado");
      userId = prof.auth_user_id as string;
    }

    const code = core.generateOtpCode();
    const code_hash = await core.hashOtp(phone, code);
    await admin.from("whatsapp_otp_codes").insert({
      phone, code_hash, purpose: data.purpose, user_id: userId,
    } as never);

    const tplKey = data.purpose === "login" ? "codigo_login"
      : data.purpose === "reset" ? "codigo_reset"
      : "codigo_cadastro";
    const { data: tpl } = await admin.from("whatsapp_templates").select("body,buttons").eq("key", tplKey).maybeSingle();
    const body = tpl?.body ? core.renderTemplate(tpl.body as string, { codigo: code }) : `Seu código: ${code}`;
    const buttons = (tpl?.buttons as unknown as Array<{ text: string; url?: string; reply?: string }>) ?? [];

    const res = buttons.length > 0
      ? await core.sendButtons(cfg, phone, body, buttons)
      : await core.sendText(cfg, phone, body);
    await core.logMessage({
      to: phone,
      body: `[OTP ${data.purpose}] enviado`,
      status: res.ok ? "sent" : "failed",
      externalId: (res.json.id as string | undefined) ?? null,
      error: res.ok ? null : `HTTP ${res.status}`,
      relatedType: `otp_${data.purpose}`,
      template: tplKey,
    });
    if (!res.ok) throw new Error("Falha ao enviar código");
    return { ok: true, expiresIn: 600 };
  });

const verifyOtpSchema = z.object({
  phone: z.string().min(8),
  purpose: z.enum(["login", "reset", "signup", "verify"]),
  code: z.string().length(6),
});

export const verifyWhatsappOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyOtpSchema.parse(d))
  .handler(async ({ data }) => {
    const core = await import("./whatsapp-core.server");
    const admin = core.getAdmin();
    const phone = core.normalizePhone(data.phone);
    const code_hash = await core.hashOtp(phone, data.code);

    const { data: row } = await admin
      .from("whatsapp_otp_codes")
      .select("id, code_hash, expires_at, used_at, attempts, max_attempts, user_id, purpose")
      .eq("phone", phone)
      .eq("purpose", data.purpose)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("Código expirado ou inválido");
    if (new Date(row.expires_at as string).getTime() < Date.now()) throw new Error("Código expirado");
    if ((row.attempts as number) >= (row.max_attempts as number)) throw new Error("Muitas tentativas");

    if ((row.code_hash as string) !== code_hash) {
      await admin.from("whatsapp_otp_codes").update({ attempts: (row.attempts as number) + 1 } as never).eq("id", row.id as string);
      throw new Error("Código incorreto");
    }
    await admin.from("whatsapp_otp_codes").update({ used_at: new Date().toISOString() } as never).eq("id", row.id as string);

    if (data.purpose === "login") {
      const userId = row.user_id as string;
      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (!email) throw new Error("Usuário sem email");
      const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (error || !link) throw new Error("Falha ao gerar sessão");
      // Retorna hashed_token + email para o cliente chamar verifyOtp(type: 'magiclink')
      return {
        ok: true,
        loginToken: link.properties?.hashed_token ?? null,
        email,
      };
    }
    if (data.purpose === "reset" || data.purpose === "verify" || data.purpose === "signup") {
      // Retorna um ticket curto (id do OTP usado) — próxima chamada exige esse ticket + nova senha
      return { ok: true, ticket: row.id as string };
    }
    return { ok: true };
  });

const resetSchema = z.object({
  phone: z.string().min(8),
  ticket: z.string().uuid(),
  newPassword: z.string().min(8).max(72),
});

export const resetPasswordWithOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ data }) => {
    const core = await import("./whatsapp-core.server");
    const admin = core.getAdmin();
    const phone = core.normalizePhone(data.phone);
    // Só aceita ticket usado nos últimos 5min do mesmo telefone
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: row } = await admin
      .from("whatsapp_otp_codes")
      .select("id, user_id, purpose, used_at, phone")
      .eq("id", data.ticket)
      .maybeSingle();
    if (!row || row.phone !== phone || row.purpose !== "reset" || !row.used_at) throw new Error("Ticket inválido");
    if (new Date(row.used_at as string).toISOString() < since) throw new Error("Ticket expirado");

    const { error } = await admin.auth.admin.updateUserById(row.user_id as string, { password: data.newPassword });
    if (error) throw new Error("Falha ao atualizar senha");
    return { ok: true };
  });

