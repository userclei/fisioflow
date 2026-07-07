import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { from: (t: string) => never; rpc: (n: string, p?: never) => never }; userId: string };

async function assertSuper(ctx: Ctx) {
  const { data, error } = await (ctx.supabase.rpc as unknown as (
    n: string,
    p: { _user_id: string },
  ) => Promise<{ data: boolean | null; error: unknown }>)("is_super_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Acesso negado");
}

// ---------- TEMPLATES ----------

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await (ctx.supabase.from("whatsapp_templates") as unknown as {
      select: (c: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }> };
    })
      .select("id, key, name, purpose, body, category, format, description, active, message_type, footer_text, list_button_text, buttons, list_sections, created_at, updated_at")
      .order("category", { ascending: true });
    if (error) throw new Error("Falha ao carregar templates");
    return (data ?? []) as Array<{
      id: string; key: string; name: string; purpose: string; body: string;
      category: string; format: string; description: string | null; active: boolean;
      message_type: "text" | "button" | "list";
      footer_text: string | null; list_button_text: string | null;
      buttons: Array<{ text: string; id?: string }>;
      list_sections: Array<{ title: string; items: Array<{ text: string; id?: string; description?: string }> }>;
      created_at: string; updated_at: string;
    }>;
  });

const buttonSchema = z.object({
  text: z.string().min(1).max(20),
  id: z.string().max(80).optional(),
});
const listItemSchema = z.object({
  text: z.string().min(1).max(24),
  id: z.string().max(80).optional(),
  description: z.string().max(72).optional(),
});
const listSectionSchema = z.object({
  title: z.string().min(1).max(24),
  items: z.array(listItemSchema).max(10),
});

const tplSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  purpose: z.string().max(80).default("custom"),
  body: z.string().min(1).max(4000),
  category: z.enum(["reminder", "due_today", "overdue", "negotiation", "payment_confirmed", "custom"]),
  format: z.enum(["text", "html"]).default("text"),
  description: z.string().max(300).nullable().optional(),
  active: z.boolean().default(true),
  message_type: z.enum(["text", "button", "list"]).default("text"),
  footer_text: z.string().max(60).nullable().optional(),
  list_button_text: z.string().max(20).nullable().optional(),
  buttons: z.array(buttonSchema).max(3).default([]),
  list_sections: z.array(listSectionSchema).max(10).default([]),
});

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tplSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const row = {
      key: data.key,
      name: data.name,
      purpose: data.purpose,
      body: data.body,
      category: data.category,
      format: data.format,
      description: data.description ?? null,
      active: data.active,
      message_type: data.message_type,
      footer_text: data.footer_text ?? null,
      list_button_text: data.list_button_text ?? null,
      buttons: data.buttons,
      list_sections: data.list_sections,
    };
    if (data.id) {
      const { error } = await ((ctx.supabase.from("whatsapp_templates") as unknown as {
        update: (p: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
      }).update(row).eq("id", data.id));
      if (error) throw new Error("Falha ao atualizar template");
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await ((ctx.supabase.from("whatsapp_templates") as unknown as {
      insert: (p: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    }).insert(row).select("id").single());
    if (error) throw new Error("Falha ao criar template");
    return { ok: true, id: ins?.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { error } = await ((ctx.supabase.from("whatsapp_templates") as unknown as {
      delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
    }).delete().eq("id", data.id));
    if (error) throw new Error("Falha ao excluir");
    return { ok: true };
  });

export const previewTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    body: z.string(),
    vars: z.record(z.string()).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuper(context as unknown as Ctx);
    const sample: Record<string, string> = {
      cliente: "Dr. João Silva",
      empresa: "Clínica FisioMax",
      valor: "R$ 89,90",
      vencimento: "15/07/2026",
      dias_atraso: "3",
      dias_para_vencer: "3",
      plano: "PRO Mensal",
      link_pagamento: "https://pay.fisioflow.app/inv/abc123",
      ...(data.vars ?? {}),
    };
    const rendered = data.body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => sample[k] ?? `{{${k}}}`);
    return { rendered };
  });

// ---------- FLOWS ----------

export const listFlows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data: flows, error } = await (ctx.supabase.from("dunning_flows") as unknown as {
      select: (c: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }> };
    })
      .select("id, name, description, is_active, is_default, stop_on_paid, stop_on_negotiation, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Falha ao carregar fluxos");
    const flowsList = (flows ?? []) as Array<{ id: string; name: string; description: string | null; is_active: boolean; is_default: boolean; stop_on_paid: boolean; stop_on_negotiation: boolean; created_at: string }>;

    const { data: steps } = await (ctx.supabase.from("dunning_flow_steps") as unknown as {
      select: (c: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }> };
    }).select("id, flow_id, order_index, trigger_type, offset_days, template_id, channel, is_active")
      .order("order_index", { ascending: true });

    return {
      flows: flowsList,
      steps: (steps ?? []) as Array<{ id: string; flow_id: string; order_index: number; trigger_type: string; offset_days: number; template_id: string | null; channel: string; is_active: boolean }>,
    };
  });

const flowSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(300).nullable().optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  stop_on_paid: z.boolean().default(true),
  stop_on_negotiation: z.boolean().default(true),
});

export const upsertFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flowSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    if (data.is_default) {
      // Remove default de outros
      await ((ctx.supabase.from("dunning_flows") as unknown as {
        update: (p: Record<string, unknown>) => { neq: (k: string, v: string) => Promise<{ error: unknown }> };
      }).update({ is_default: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000"));
    }
    const row = {
      name: data.name,
      description: data.description ?? null,
      is_active: data.is_active,
      is_default: data.is_default,
      stop_on_paid: data.stop_on_paid,
      stop_on_negotiation: data.stop_on_negotiation,
    };
    if (data.id) {
      const { error } = await ((ctx.supabase.from("dunning_flows") as unknown as {
        update: (p: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
      }).update(row).eq("id", data.id));
      if (error) throw new Error("Falha ao atualizar fluxo");
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await ((ctx.supabase.from("dunning_flows") as unknown as {
      insert: (p: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    }).insert(row).select("id").single());
    if (error) throw new Error("Falha ao criar fluxo");
    return { ok: true, id: ins?.id };
  });

export const deleteFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { error } = await ((ctx.supabase.from("dunning_flows") as unknown as {
      delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
    }).delete().eq("id", data.id));
    if (error) throw new Error("Falha ao excluir");
    return { ok: true };
  });

// ---------- STEPS ----------

const stepSchema = z.object({
  id: z.string().uuid().optional(),
  flow_id: z.string().uuid(),
  order_index: z.number().int(),
  trigger_type: z.enum(["before_due", "on_due", "after_due"]),
  offset_days: z.number().int(),
  template_id: z.string().uuid().nullable(),
  channel: z.enum(["whatsapp", "email", "both"]),
  is_active: z.boolean().default(true),
});

export const upsertStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => stepSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const row = {
      flow_id: data.flow_id,
      order_index: data.order_index,
      trigger_type: data.trigger_type,
      offset_days: data.offset_days,
      template_id: data.template_id,
      channel: data.channel,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await ((ctx.supabase.from("dunning_flow_steps") as unknown as {
        update: (p: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
      }).update(row).eq("id", data.id));
      if (error) throw new Error("Falha ao atualizar etapa");
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await ((ctx.supabase.from("dunning_flow_steps") as unknown as {
      insert: (p: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    }).insert(row).select("id").single());
    if (error) throw new Error("Falha ao criar etapa");
    return { ok: true, id: ins?.id };
  });

export const deleteStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { error } = await ((ctx.supabase.from("dunning_flow_steps") as unknown as {
      delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
    }).delete().eq("id", data.id));
    if (error) throw new Error("Falha ao excluir");
    return { ok: true };
  });

// ---------- EXECUTIONS ----------

export const listExecutions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    flowId: z.string().uuid().optional(),
    status: z.string().optional(),
    days: z.number().int().min(1).max(180).default(30),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const since = new Date(Date.now() - data.days * 86400 * 1000).toISOString();
    type Q = {
      select: (c: string) => Q;
      order: (k: string, o: { ascending: boolean }) => Q;
      limit: (n: number) => Q;
      eq: (k: string, v: string) => Q;
      gte: (k: string, v: string) => Q;
      then: <T>(cb: (r: { data: unknown[] | null; error: unknown }) => T) => Promise<T>;
    };
    let q = (ctx.supabase.from("dunning_executions") as unknown as Q)
      .select("id, flow_id, step_id, invoice_id, workspace_id, channel, status, sent_at, error, rendered_body")
      .gte("sent_at", since)
      .order("sent_at", { ascending: false })
      .limit(200);
    if (data.flowId) q = q.eq("flow_id", data.flowId);
    if (data.status) q = q.eq("status", data.status);
    const { data: execs, error } = await (q as unknown as Promise<{ data: unknown[] | null; error: unknown }>);
    if (error) throw new Error("Falha ao carregar execuções");
    return (execs ?? []) as Array<{
      id: string; flow_id: string | null; step_id: string | null; invoice_id: string | null;
      workspace_id: string | null; channel: string; status: string; sent_at: string;
      error: string | null; rendered_body: string | null;
    }>;
  });

// ---------- STATS ----------

export const dunningStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(7).max(180).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const since = new Date(Date.now() - data.days * 86400 * 1000).toISOString();

    const { data: execs } = await (ctx.supabase.from("dunning_executions") as unknown as {
      select: (c: string) => { gte: (k: string, v: string) => Promise<{ data: unknown[] | null }> };
    }).select("status, invoice_id, step_id, sent_at, channel").gte("sent_at", since);

    const arr = (execs ?? []) as Array<{ status: string; invoice_id: string; step_id: string; sent_at: string; channel: string }>;
    const totalSent = arr.filter((e) => e.status === "sent").length;
    const totalFailed = arr.filter((e) => e.status === "failed").length;
    const invoicesTouched = new Set(arr.filter((e) => e.status === "sent").map((e) => e.invoice_id)).size;

    // Cross-check com invoices pagas depois do envio
    const invoiceIds = Array.from(new Set(arr.map((e) => e.invoice_id).filter(Boolean)));
    let recoveredValue = 0;
    let recoveredCount = 0;
    if (invoiceIds.length > 0) {
      const { data: paid } = await (ctx.supabase.from("invoices") as unknown as {
        select: (c: string) => { in: (k: string, v: string[]) => { eq: (k: string, v: string) => Promise<{ data: unknown[] | null }> } };
      }).select("id, amount, status, paid_at").in("id", invoiceIds).eq("status", "paid");
      const paidArr = (paid ?? []) as Array<{ id: string; amount: number; paid_at: string | null }>;
      recoveredCount = paidArr.length;
      recoveredValue = paidArr.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    }
    const recoveryRate = invoicesTouched > 0 ? (recoveredCount / invoicesTouched) * 100 : 0;

    // Envios por dia
    const byDay: Record<string, number> = {};
    for (const e of arr) {
      const k = e.sent_at.slice(0, 10);
      byDay[k] = (byDay[k] ?? 0) + 1;
    }
    const timeline = Object.entries(byDay).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));

    // Por step
    const byStep: Record<string, number> = {};
    for (const e of arr) {
      if (!e.step_id) continue;
      byStep[e.step_id] = (byStep[e.step_id] ?? 0) + 1;
    }

    return { totalSent, totalFailed, invoicesTouched, recoveredCount, recoveredValue, recoveryRate, timeline, byStep };
  });

// ---------- MANUAL TICK ----------

export const runDunningTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context as unknown as Ctx);
    const { runDunningTickCore } = await import("./dunning-core.server");
    return runDunningTickCore();
  });
