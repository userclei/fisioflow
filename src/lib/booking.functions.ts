import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function serverPublic() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// ================= PUBLIC =================

export const getPublicBookingLink = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: link, error } = await sb
      .from("booking_links")
      .select("id, slug, title, description, duration_min, buffer_min, timezone, working_days, start_time, end_time, advance_days, active, owner_user_id, workspace_id")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!link) throw new Error("Link não encontrado");

    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("auth_user_id", link.owner_user_id)
      .maybeSingle();

    return {
      id: link.id,
      slug: link.slug,
      title: link.title,
      description: link.description,
      duration_min: link.duration_min,
      buffer_min: link.buffer_min,
      timezone: link.timezone,
      working_days: link.working_days,
      start_time: link.start_time,
      end_time: link.end_time,
      advance_days: link.advance_days,
      owner_name: prof?.full_name ?? "Profissional",
      owner_avatar: prof?.avatar_url ?? null,
    };
  });

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutes(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

export const getAvailableSlots = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; date: string }) =>
    z.object({ slug: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: link, error } = await sb
      .from("booking_links")
      .select("id, workspace_id, owner_user_id, duration_min, buffer_min, working_days, start_time, end_time, active")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error || !link) throw new Error("Link não encontrado");

    const day = new Date(data.date + "T00:00:00");
    const dow = day.getDay();
    if (!link.working_days?.includes(dow)) return { slots: [] as string[] };

    // Load taken appointments for this professional on this date
    const { data: appts } = await sb
      .from("appointments")
      .select("start_time, end_time")
      .eq("workspace_id", link.workspace_id)
      .eq("professional_id", link.owner_user_id)
      .eq("event_date", data.date);

    const taken = (appts ?? []).map((a) => ({
      start: toMinutes((a.start_time as string).slice(0, 5)),
      end: toMinutes((a.end_time as string).slice(0, 5)),
    }));

    const startM = toMinutes(link.start_time.slice(0, 5));
    const endM = toMinutes(link.end_time.slice(0, 5));
    const step = link.duration_min + (link.buffer_min ?? 0);
    const now = new Date();
    const isToday = day.toDateString() === now.toDateString();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const slots: string[] = [];
    for (let t = startM; t + link.duration_min <= endM; t += step) {
      if (isToday && t <= nowMin) continue;
      const conflict = taken.some((tk) => t < tk.end && t + link.duration_min > tk.start);
      if (!conflict) slots.push(fromMinutes(t));
    }
    return { slots };
  });

export const createBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((d: {
    slug: string;
    date: string;
    time: string;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) =>
    z.object({
      slug: z.string().min(1).max(80),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().max(255).optional().or(z.literal("")),
      phone: z.string().trim().max(30).optional().or(z.literal("")),
      notes: z.string().trim().max(1000).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: link } = await sb
      .from("booking_links")
      .select("id, workspace_id, owner_user_id, duration_min, active")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (!link) throw new Error("Link não encontrado");

    // Re-validate slot server-side to prevent race
    const avail = await getAvailableSlots({ data: { slug: data.slug, date: data.date } });
    if (!avail.slots.includes(data.time)) throw new Error("Horário indisponível");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Build scheduled_at as timestamptz — treat date/time as local (server stores tz)
    const scheduled = `${data.date}T${data.time}:00`;
    const { data: br, error } = await supabaseAdmin
      .from("booking_requests")
      .insert({
        booking_link_id: link.id,
        workspace_id: link.workspace_id,
        owner_user_id: link.owner_user_id,
        lead_name: data.name,
        lead_email: data.email || null,
        lead_phone: data.phone || null,
        notes: data.notes || null,
        scheduled_at: scheduled,
        duration_min: link.duration_min,
        status: "confirmed",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: br.id, ok: true };
  });

// ================= AUTHENTICATED =================

export const listBookingLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("booking_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertBookingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    slug: string;
    title: string;
    description?: string;
    duration_min: number;
    buffer_min: number;
    working_days: number[];
    start_time: string;
    end_time: string;
    active: boolean;
  }) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().trim().min(3).max(60).regex(/^[a-z0-9][a-z0-9-]+$/, "use letras minúsculas, números e hífen"),
      title: z.string().trim().min(2).max(80),
      description: z.string().trim().max(500).optional().or(z.literal("")),
      duration_min: z.number().int().min(10).max(240),
      buffer_min: z.number().int().min(0).max(120),
      working_days: z.array(z.number().int().min(0).max(6)).min(1),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: prof } = await supabase
      .from("profiles").select("default_workspace_id").eq("auth_user_id", userId).maybeSingle();
    const wsId = prof?.default_workspace_id;
    if (!wsId) throw new Error("Workspace não encontrado");

    if (data.id) {
      const { error } = await supabase.from("booking_links").update({
        slug: data.slug, title: data.title, description: data.description || null,
        duration_min: data.duration_min, buffer_min: data.buffer_min,
        working_days: data.working_days, start_time: data.start_time, end_time: data.end_time,
        active: data.active,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await supabase.from("booking_links").insert({
      workspace_id: wsId, owner_user_id: userId, slug: data.slug, title: data.title,
      description: data.description || null, duration_min: data.duration_min,
      buffer_min: data.buffer_min, working_days: data.working_days,
      start_time: data.start_time, end_time: data.end_time, active: data.active,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteBookingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("booking_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
