import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SB = { from: (t: string) => any; rpc: (n: string, p?: any) => any };
type Ctx = { supabase: SB; userId: string };

async function assertSuper(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_super_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Acesso negado");
}

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

function interpolate(md: string, doc: any, settings: any) {
  const map: Record<string, string> = {
    "{{COMPANY_NAME}}": settings?.company_name || "FisioFlow",
    "{{LEGAL_NAME}}": settings?.legal_name || "[RAZÃO SOCIAL]",
    "{{CNPJ}}": settings?.cnpj || "[CNPJ]",
    "{{ADDRESS}}": settings?.address || "[ENDEREÇO]",
    "{{CITY}}": settings?.city || "[CIDADE]",
    "{{STATE}}": settings?.state || "[UF]",
    "{{ZIP}}": settings?.zip || "[CEP]",
    "{{COUNTRY}}": settings?.country || "Brasil",
    "{{JURISDICTION}}": settings?.jurisdiction || "Comarca da Capital",
    "{{DPO_NAME}}": settings?.dpo_name || "[NOME DO DPO]",
    "{{DPO_EMAIL}}": settings?.dpo_email || "[EMAIL DO DPO]",
    "{{CONTACT_EMAIL}}": settings?.contact_email || "[EMAIL DE CONTATO]",
    "{{CONTACT_PHONE}}": settings?.contact_phone || "[TELEFONE]",
    "{{EFFECTIVE_DATE}}": doc?.effective_date
      ? new Date(doc.effective_date).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR"),
    "{{VERSION}}": String(doc?.version ?? 1),
  };
  let out = md;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out;
}

// ================= PÚBLICO =================
export const getCurrentLegalDoc = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({
    kind: z.enum(["privacy", "terms", "cookies"]),
  }).parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [doc, settings] = await Promise.all([
      sb.from("legal_documents").select("*")
        .eq("kind", data.kind).eq("is_current", true).maybeSingle(),
      sb.from("legal_settings").select("*").eq("key", "default").maybeSingle(),
    ]);
    if (!doc.data) return null;
    return {
      ...doc.data,
      content_md: interpolate(doc.data.content_md, doc.data, settings.data),
      settings: settings.data,
    };
  });

// ================= ADMIN =================
export const listLegalDocs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    kind: z.enum(["privacy", "terms", "cookies"]).optional(),
  }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    let q = ctx.supabase.from("legal_documents").select("*").order("kind").order("version", { ascending: false });
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getLegalSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await ctx.supabase.from("legal_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateLegalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    company_name: z.string().min(1),
    legal_name: z.string().nullable().optional(),
    cnpj: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country: z.string().default("Brasil"),
    jurisdiction: z.string().min(1),
    dpo_name: z.string().nullable().optional(),
    dpo_email: z.string().email().nullable().optional().or(z.literal("")),
    contact_email: z.string().email().nullable().optional().or(z.literal("")),
    contact_phone: z.string().nullable().optional(),
    website_url: z.string().nullable().optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { error } = await ctx.supabase.from("legal_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createLegalDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    kind: z.enum(["privacy", "terms", "cookies"]),
    from_id: z.string().uuid().optional(), // copiar conteúdo de outra versão
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data: last } = await ctx.supabase.from("legal_documents")
      .select("version").eq("kind", data.kind).order("version", { ascending: false }).limit(1).maybeSingle();
    const nextV = ((last?.version as number | undefined) ?? 0) + 1;

    let source: any = null;
    if (data.from_id) {
      const { data: src } = await ctx.supabase.from("legal_documents").select("*").eq("id", data.from_id).maybeSingle();
      source = src;
    } else {
      const { data: cur } = await ctx.supabase.from("legal_documents")
        .select("*").eq("kind", data.kind).eq("is_current", true).maybeSingle();
      source = cur;
    }
    const title = source?.title
      ?? (data.kind === "privacy" ? "Política de Privacidade" : data.kind === "terms" ? "Termos de Uso" : "Política de Cookies");
    const content = source?.content_md ?? "# " + title + "\n\nConteúdo…";

    const { data: row, error } = await ctx.supabase.from("legal_documents").insert({
      kind: data.kind, version: nextV, title,
      content_md: content, summary: source?.summary,
      is_current: false, created_by: ctx.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id, version: nextV };
  });

export const updateLegalDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    summary: z.string().nullable().optional(),
    content_md: z.string().min(10),
    effective_date: z.string(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { id, ...patch } = data;
    const { error } = await ctx.supabase.from("legal_documents").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishLegalDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    // Trigger cuida de desmarcar as outras
    const { error } = await ctx.supabase.from("legal_documents")
      .update({ is_current: true, published_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLegalDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    // Bloqueia deletar publicado atual
    const { data: doc } = await ctx.supabase.from("legal_documents").select("is_current").eq("id", data.id).maybeSingle();
    if (doc?.is_current) throw new Error("Não é possível excluir a versão publicada atual");
    const { error } = await ctx.supabase.from("legal_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
