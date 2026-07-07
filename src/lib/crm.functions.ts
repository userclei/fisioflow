import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const stages = ["novo","contato","qualificado","agendado","convertido","perdido"] as const;
const activityTypes = ["nota","ligacao","email","whatsapp","reuniao","outro"] as const;

async function getWorkspaceId(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("default_workspace_id").eq("auth_user_id", userId).maybeSingle();
  if (!data?.default_workspace_id) throw new Error("Workspace não encontrado");
  return data.default_workspace_id as string;
}

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("crm_leads")
      .select("id, name, email, phone, source, stage, tags, value_cents, next_action_at, last_contact_at, created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lead, error } = await context.supabase
      .from("crm_leads").select("*").eq("id", data.id).maybeSingle();
    if (error || !lead) throw new Error("Lead não encontrado");
    const { data: acts } = await context.supabase
      .from("crm_activities").select("id, type, content, created_at")
      .eq("lead_id", data.id).order("created_at", { ascending: false });
    return { lead, activities: acts ?? [] };
  });

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; email?: string; phone?: string; stage?: string; notes?: string }) =>
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255).optional().or(z.literal("")),
      phone: z.string().trim().max(30).optional().or(z.literal("")),
      stage: z.enum(stages).optional(),
      notes: z.string().trim().max(2000).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wsId = await getWorkspaceId(context.supabase, context.userId);
    const { data: created, error } = await context.supabase.from("crm_leads").insert({
      workspace_id: wsId, owner_user_id: context.userId, name: data.name,
      email: data.email || null, phone: data.phone || null,
      stage: data.stage ?? "novo", notes: data.notes || null, source: "manual",
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string; name?: string; email?: string; phone?: string;
    stage?: string; notes?: string; value_cents?: number; next_action_at?: string | null;
    tags?: string[];
  }) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(2).max(100).optional(),
      email: z.string().trim().max(255).optional().or(z.literal("")),
      phone: z.string().trim().max(30).optional().or(z.literal("")),
      stage: z.enum(stages).optional(),
      notes: z.string().trim().max(2000).optional().or(z.literal("")),
      value_cents: z.number().int().min(0).optional(),
      next_action_at: z.string().nullable().optional(),
      tags: z.array(z.string().max(30)).max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v === "" ? null : v;
    const { error } = await context.supabase.from("crm_leads").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("crm_leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lead_id: string; type: string; content: string }) =>
    z.object({
      lead_id: z.string().uuid(),
      type: z.enum(activityTypes),
      content: z.string().trim().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wsId = await getWorkspaceId(context.supabase, context.userId);
    const { error } = await context.supabase.from("crm_activities").insert({
      lead_id: data.lead_id, workspace_id: wsId, type: data.type,
      content: data.content, created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("crm_leads").update({ last_contact_at: new Date().toISOString() }).eq("id", data.lead_id);
    return { ok: true };
  });
