import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SB = { from: (t: string) => any; rpc: (n: string, p?: any) => any };
type Ctx = { supabase: SB; userId: string };

async function assertSuper(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_super_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Acesso negado");
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

// ===================== OVERVIEW =====================
export const affiliatesOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const [aff, conv, comm, payouts] = await Promise.all([
      ctx.supabase.from("affiliates").select("id, status"),
      ctx.supabase.from("affiliate_conversions").select("amount, status"),
      ctx.supabase.from("affiliate_commissions").select("amount, status"),
      ctx.supabase.from("affiliate_payouts").select("total_amount, status"),
    ]);
    const list = (aff.data ?? []) as Array<{ status: string }>;
    const cs = (conv.data ?? []) as Array<{ amount: number; status: string }>;
    const ms = (comm.data ?? []) as Array<{ amount: number; status: string }>;
    const ps = (payouts.data ?? []) as Array<{ total_amount: number; status: string }>;
    const sum = (arr: any[], f: (x: any) => number) => arr.reduce((a, x) => a + Number(f(x) || 0), 0);
    return {
      total_affiliates: list.length,
      active: list.filter(a => a.status === "active").length,
      pending: list.filter(a => a.status === "pending").length,
      revenue_generated: sum(cs.filter(c => c.status === "paid"), c => c.amount),
      commissions_pending: sum(ms.filter(m => m.status === "pending" || m.status === "available"), m => m.amount),
      commissions_paid: sum(ms.filter(m => m.status === "paid"), m => m.amount),
      payouts_pending: sum(ps.filter(p => p.status === "draft" || p.status === "processing"), p => p.total_amount),
    };
  });

// ===================== AFFILIATES =====================
export const listAffiliates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    tier: z.string().optional(),
  }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    let q = ctx.supabase.from("affiliates").select("*").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.tier) q = q.eq("tier", data.tier);
    if (data.search) q = q.or(`name.ilike.%${data.search}%,email.ilike.%${data.search}%,slug.ilike.%${data.search}%`);
    const { data: rows, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAffiliate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const [aff, links, leads, conv, comm, coupons, payouts] = await Promise.all([
      ctx.supabase.from("affiliates").select("*").eq("id", data.id).maybeSingle(),
      ctx.supabase.from("affiliate_links").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }),
      ctx.supabase.from("affiliate_leads").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }).limit(200),
      ctx.supabase.from("affiliate_conversions").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }).limit(200),
      ctx.supabase.from("affiliate_commissions").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }).limit(200),
      ctx.supabase.from("affiliate_coupons").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }),
      ctx.supabase.from("affiliate_payouts").select("*").eq("affiliate_id", data.id).order("created_at", { ascending: false }),
    ]);
    return {
      affiliate: aff.data,
      links: links.data ?? [],
      leads: leads.data ?? [],
      conversions: conv.data ?? [],
      commissions: comm.data ?? [],
      coupons: coupons.data ?? [],
      payouts: payouts.data ?? [],
    };
  });

export const upsertAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    document: z.string().optional().nullable(),
    type: z.enum(["influencer", "professional", "clinic", "partner", "student", "other"]).default("influencer"),
    tier: z.enum(["bronze", "silver", "gold", "platinum"]).default("bronze"),
    status: z.enum(["pending", "active", "suspended", "banned"]).default("pending"),
    slug: z.string().optional(),
    pix_key: z.string().optional().nullable(),
    pix_key_type: z.string().optional().nullable(),
    custom_commission_pct: z.number().nullable().optional(),
    custom_commission_fixed: z.number().nullable().optional(),
    cookie_days: z.number().int().min(1).max(365).default(30),
    instagram: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const slug = data.slug || slugify(data.name) + "-" + Math.random().toString(36).slice(2, 6);
    const payload = { ...data, slug };
    if (data.id) {
      const { error } = await ctx.supabase.from("affiliates").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: row, error } = await ctx.supabase.from("affiliates").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const setAffiliateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "active", "suspended", "banned"]),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const patch: any = { status: data.status };
    if (data.status === "active") { patch.approved_at = new Date().toISOString(); patch.approved_by = ctx.userId; }
    if (data.status === "suspended") patch.suspended_at = new Date().toISOString();
    const { error } = await ctx.supabase.from("affiliates").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== LINKS =====================
export const createAffiliateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    affiliate_id: z.string().uuid(),
    campaign: z.string().optional(),
    destination_url: z.string().default("/"),
    slug: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const slug = data.slug || (slugify(data.campaign || "link") + "-" + Math.random().toString(36).slice(2, 6));
    const { error } = await ctx.supabase.from("affiliate_links").insert({ ...data, slug });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== COMMISSIONS =====================
export const listCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    status: z.string().optional(),
    affiliate_id: z.string().uuid().optional(),
  }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    let q = ctx.supabase.from("affiliate_commissions")
      .select("*, affiliate:affiliates(id,name,email,pix_key)")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.affiliate_id) q = q.eq("affiliate_id", data.affiliate_id);
    const { data: rows, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const markCommissionsAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await ctx.supabase.from("affiliate_commissions")
      .update({ status: "available" }).eq("status", "pending").lte("available_at", today).select("id");
    if (error) throw new Error(error.message);
    return { updated: (data ?? []).length };
  });

// ===================== PAYOUTS =====================
export const createPayoutFromAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    affiliate_id: z.string().uuid(),
    method: z.enum(["pix", "ted", "manual", "other"]).default("pix"),
    reference: z.string().optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data: comms, error: e1 } = await ctx.supabase.from("affiliate_commissions")
      .select("id, amount").eq("affiliate_id", data.affiliate_id).eq("status", "available").is("payout_id", null);
    if (e1) throw new Error(e1.message);
    const list = (comms ?? []) as Array<{ id: string; amount: number }>;
    if (list.length === 0) throw new Error("Nenhuma comissão disponível");
    const total = list.reduce((a, c) => a + Number(c.amount), 0);
    const { data: payout, error: e2 } = await ctx.supabase.from("affiliate_payouts")
      .insert({ affiliate_id: data.affiliate_id, total_amount: total, method: data.method, reference: data.reference, status: "draft" })
      .select("id").single();
    if (e2) throw new Error(e2.message);
    const items = list.map(c => ({ payout_id: payout.id, commission_id: c.id, amount: c.amount }));
    await ctx.supabase.from("affiliate_payout_items").insert(items);
    await ctx.supabase.from("affiliate_commissions")
      .update({ payout_id: payout.id }).in("id", list.map(c => c.id));
    return { payout_id: payout.id, total, count: list.length };
  });

export const markPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    payout_id: z.string().uuid(),
    receipt_url: z.string().optional(),
    reference: z.string().optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const now = new Date().toISOString();
    const { error } = await ctx.supabase.from("affiliate_payouts").update({
      status: "paid", paid_at: now, paid_by: ctx.userId,
      receipt_url: data.receipt_url, reference: data.reference,
    }).eq("id", data.payout_id);
    if (error) throw new Error(error.message);
    const { data: items } = await ctx.supabase.from("affiliate_payout_items").select("commission_id").eq("payout_id", data.payout_id);
    const ids = ((items ?? []) as Array<{ commission_id: string }>).map(i => i.commission_id);
    if (ids.length) {
      await ctx.supabase.from("affiliate_commissions").update({ status: "paid", paid_at: now }).in("id", ids);
    }
    return { ok: true };
  });

export const listPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await ctx.supabase.from("affiliate_payouts")
      .select("*, affiliate:affiliates(id,name,email,pix_key)")
      .order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ===================== COUPONS =====================
export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await ctx.supabase.from("affiliate_coupons")
      .select("*, affiliate:affiliates(id,name,email)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    affiliate_id: z.string().uuid(),
    code: z.string().min(2).max(40),
    discount_type: z.enum(["percent", "fixed"]).default("percent"),
    discount_value: z.number().min(0),
    max_uses: z.number().int().nullable().optional(),
    valid_until: z.string().nullable().optional(),
    active: z.boolean().default(true),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const payload = { ...data, code: data.code.toUpperCase() };
    if (data.id) {
      const { error } = await ctx.supabase.from("affiliate_coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: row, error } = await ctx.supabase.from("affiliate_coupons").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

// ===================== RANKING =====================
export const affiliateRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    period_days: z.number().int().min(1).max(365).default(30),
  }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const since = new Date(Date.now() - data.period_days * 86400000).toISOString();
    const [aff, conv, clicks, leads] = await Promise.all([
      ctx.supabase.from("affiliates").select("id, name, email, tier, type, slug, status"),
      ctx.supabase.from("affiliate_conversions").select("affiliate_id, amount, status").gte("created_at", since),
      ctx.supabase.from("affiliate_clicks").select("affiliate_id").gte("created_at", since),
      ctx.supabase.from("affiliate_leads").select("affiliate_id").gte("created_at", since),
    ]);
    const affs = (aff.data ?? []) as Array<any>;
    const map = new Map<string, any>();
    for (const a of affs) map.set(a.id, { ...a, clicks: 0, leads: 0, conversions: 0, revenue: 0 });
    for (const c of (clicks.data ?? []) as any[]) { const r = map.get(c.affiliate_id); if (r) r.clicks++; }
    for (const l of (leads.data ?? []) as any[]) { const r = map.get(l.affiliate_id); if (r) r.leads++; }
    for (const c of (conv.data ?? []) as any[]) {
      const r = map.get(c.affiliate_id); if (!r) continue;
      if (c.status === "paid") { r.conversions++; r.revenue += Number(c.amount || 0); }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  });

// ===================== COMMISSION RULES =====================
export const listCommissionRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await ctx.supabase.from("affiliate_commission_rules").select("*").order("priority", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCommissionRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2),
    plan: z.string().nullable().optional(),
    tier: z.enum(["bronze", "silver", "gold", "platinum"]).nullable().optional(),
    percent: z.number().nullable().optional(),
    fixed_amount: z.number().nullable().optional(),
    recurring: z.boolean().default(false),
    active: z.boolean().default(true),
    priority: z.number().int().default(100),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    if (data.id) {
      const { error } = await ctx.supabase.from("affiliate_commission_rules").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await ctx.supabase.from("affiliate_commission_rules").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
