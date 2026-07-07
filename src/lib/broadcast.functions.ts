import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: { from: (t: string) => never; rpc: (n: string, p?: never) => never };
  userId: string;
};

async function assertSuper(ctx: Ctx) {
  const { data, error } = await (ctx.supabase.rpc as unknown as (
    n: string,
    p: { _user_id: string },
  ) => Promise<{ data: boolean | null; error: unknown }>)("is_super_admin", {
    _user_id: ctx.userId,
  });
  if (error || !data) throw new Error("Acesso negado");
}

// ---------- Audiência ----------

export const broadcastAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        scope: z
          .enum(["all", "active", "trial", "overdue", "blocked", "plan"])
          .default("all"),
        plan: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    type Q = {
      select: (c: string) => Q;
      in: (k: string, v: string[]) => Q;
      eq: (k: string, v: string) => Q;
      not: (k: string, op: string, v: string) => Q;
      then: <T>(cb: (r: { data: unknown[] | null; error: unknown }) => T) => Promise<T>;
    };
    let q = (ctx.supabase.from("workspaces") as unknown as Q)
      .select("id, name, phone, responsible_name, plan, status")
      .not("phone", "is", "null");

    switch (data.scope) {
      case "active":
        q = q.eq("status", "active");
        break;
      case "trial":
        q = q.eq("status", "trial");
        break;
      case "overdue":
        q = q.in("status", ["overdue", "pending_payment"]);
        break;
      case "blocked":
        q = q.eq("status", "blocked");
        break;
      case "plan":
        if (data.plan) q = q.eq("plan", data.plan);
        break;
      case "all":
      default:
        break;
    }

    const { data: rows, error } = await (q as unknown as Promise<{
      data: unknown[] | null;
      error: unknown;
    }>);
    if (error) throw new Error("Falha ao listar audiência");
    const list = (rows ?? []) as Array<{
      id: string;
      name: string;
      phone: string | null;
      responsible_name: string | null;
      plan: string | null;
      status: string;
    }>;
    const withValidPhone = list.filter(
      (w) => (w.phone ?? "").replace(/\D/g, "").length >= 10,
    );
    return {
      total: list.length,
      valid: withValidPhone.length,
      invalid: list.length - withValidPhone.length,
      sample: withValidPhone.slice(0, 5).map((w) => ({
        name: w.name,
        phone: w.phone,
        plan: w.plan,
        status: w.status,
      })),
    };
  });

// ---------- Envio ----------

const runSchema = z.object({
  templateId: z.string().uuid().optional(),
  customBody: z.string().max(4000).optional(),
  scope: z
    .enum(["all", "active", "trial", "overdue", "blocked", "plan"])
    .default("active"),
  plan: z.string().optional(),
  dryRun: z.boolean().default(false),
  title: z.string().min(2).max(120),
});

export const runBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => runSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);

    const { runBroadcastCore } = await import("./broadcast-core.server");
    return runBroadcastCore({
      title: data.title,
      templateId: data.templateId ?? null,
      customBody: data.customBody ?? null,
      scope: data.scope,
      plan: data.plan ?? null,
      dryRun: data.dryRun,
      createdBy: ctx.userId,
    });
  });

// ---------- Histórico ----------

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertSuper(ctx);
    const { data, error } = await (
      ctx.supabase.from("broadcasts") as unknown as {
        select: (c: string) => {
          order: (k: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
          };
        };
      }
    )
      .select(
        "id, title, scope, plan, template_id, rendered_sample, sent, failed, audience_total, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Falha ao carregar histórico");
    return (data ?? []) as Array<{
      id: string;
      title: string;
      scope: string;
      plan: string | null;
      template_id: string | null;
      rendered_sample: string | null;
      sent: number;
      failed: number;
      audience_total: number;
      status: string;
      created_at: string;
    }>;
  });
