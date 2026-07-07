// Motor de broadcast (server-only). Envia templates para audiências grandes.
import {
  getAdmin,
  loadBtzapConfigAdmin,
  sendText,
  sendMenuButton,
  sendMenuList,
  logMessage,
  type MenuButton,
  type MenuListSection,
} from "./whatsapp-core.server";
import { renderVars, buildInvoiceVars } from "./dunning-core.server";

type Scope = "all" | "active" | "trial" | "overdue" | "blocked" | "plan";

type Params = {
  title: string;
  templateId: string | null;
  customBody: string | null;
  scope: Scope;
  plan: string | null;
  dryRun: boolean;
  createdBy: string;
};

type Result = {
  ok: true;
  broadcastId: string | null;
  audience: number;
  sent: number;
  failed: number;
  dryRun: boolean;
  samples: Array<{ workspaceName: string; phone: string; rendered: string }>;
};

async function loadTemplate(id: string) {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("whatsapp_templates" as never)
    .select(
      "id, key, body, message_type, footer_text, list_button_text, buttons, list_sections",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Template não encontrado");
  const row = data as unknown as {
    id: string;
    key: string;
    body: string;
    message_type: "text" | "button" | "list" | null;
    footer_text: string | null;
    list_button_text: string | null;
    buttons: MenuButton[] | null;
    list_sections: MenuListSection[] | null;
  };
  return {
    id: row.id,
    key: row.key,
    body: row.body,
    message_type: row.message_type ?? "text",
    footer_text: row.footer_text,
    list_button_text: row.list_button_text,
    buttons: Array.isArray(row.buttons) ? row.buttons : [],
    list_sections: Array.isArray(row.list_sections) ? row.list_sections : [],
  };
}

async function loadAudience(scope: Scope, plan: string | null) {
  const admin = getAdmin();
  let q = admin
    .from("workspaces" as never)
    .select("id, name, phone, responsible_name, plan, status")
    .not("phone", "is", null);

  if (scope === "active") q = q.eq("status", "active");
  else if (scope === "trial") q = q.eq("status", "trial");
  else if (scope === "overdue") q = q.in("status", ["overdue", "pending_payment"]);
  else if (scope === "blocked") q = q.eq("status", "blocked");
  else if (scope === "plan" && plan) q = q.eq("plan", plan);

  const { data, error } = await q;
  if (error) throw new Error("Falha ao carregar audiência");
  return (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    phone: string | null;
    responsible_name: string | null;
    plan: string | null;
    status: string;
  }>;
}

export async function runBroadcastCore(params: Params): Promise<Result> {
  const admin = getAdmin();

  const tpl = params.templateId ? await loadTemplate(params.templateId) : null;
  const rawBody =
    params.customBody ?? tpl?.body ?? "";
  if (!rawBody.trim()) throw new Error("Sem corpo de mensagem");

  const audience = await loadAudience(params.scope, params.plan);
  const withPhone = audience.filter(
    (w) => (w.phone ?? "").replace(/\D/g, "").length >= 10,
  );

  let cfg: Awaited<ReturnType<typeof loadBtzapConfigAdmin>> | null = null;
  try {
    cfg = await loadBtzapConfigAdmin();
  } catch {
    cfg = null;
  }

  // Cria registro do broadcast
  let broadcastId: string | null = null;
  if (!params.dryRun) {
    const { data, error } = await admin
      .from("broadcasts" as never)
      .insert({
        title: params.title,
        template_id: params.templateId,
        custom_body: params.customBody,
        scope: params.scope,
        plan: params.plan,
        audience_total: withPhone.length,
        status: "running",
        created_by: params.createdBy,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error("Falha ao criar broadcast");
    broadcastId = (data as unknown as { id: string }).id;
  }

  let sent = 0;
  let failed = 0;
  const samples: Result["samples"] = [];

  for (const w of withPhone) {
    const phone = (w.phone ?? "").replace(/\D/g, "");
    const vars = buildInvoiceVars({
      workspaceName: w.name,
      responsibleName: w.responsible_name,
      amount: 0,
      dueDate: new Date().toISOString().slice(0, 10),
      plan: w.plan,
      paymentLink: null,
    });
    const rendered = renderVars(rawBody, vars);

    if (samples.length < 3) {
      samples.push({ workspaceName: w.name, phone, rendered });
    }

    if (params.dryRun) {
      continue;
    }

    if (!cfg || !cfg.token || !cfg.url_base) {
      failed++;
      if (broadcastId) {
        await admin.from("broadcast_deliveries" as never).insert({
          broadcast_id: broadcastId,
          workspace_id: w.id,
          phone,
          status: "failed",
          error: "whatsapp_api_not_configured",
        } as never);
      }
      continue;
    }

    try {
      const renderedButtons: MenuButton[] = (tpl?.buttons ?? []).map((b) => ({
        text: renderVars(b.text ?? "", vars),
        id: b.id,
      }));
      const renderedSections: MenuListSection[] = (tpl?.list_sections ?? []).map(
        (s) => ({
          title: renderVars(s.title ?? "", vars),
          items: (s.items ?? []).map((it) => ({
            text: renderVars(it.text ?? "", vars),
            id: it.id,
            description: it.description
              ? renderVars(it.description, vars)
              : undefined,
          })),
        }),
      );
      const footer = tpl?.footer_text ? renderVars(tpl.footer_text, vars) : undefined;
      const listBtn = tpl?.list_button_text
        ? renderVars(tpl.list_button_text, vars)
        : undefined;

      const res =
        tpl?.message_type === "button" && renderedButtons.length > 0
          ? await sendMenuButton(cfg, phone, rendered, renderedButtons, {
              footerText: footer,
            })
          : tpl?.message_type === "list" && renderedSections.length > 0
          ? await sendMenuList(cfg, phone, rendered, renderedSections, {
              footerText: footer,
              listButton: listBtn,
            })
          : await sendText(cfg, phone, rendered);

      await logMessage({
        to: phone,
        body: rendered,
        status: res.ok ? "sent" : "failed",
        error: res.ok ? null : `HTTP ${res.status}`,
        relatedType: "broadcast",
        relatedId: broadcastId,
        workspaceId: w.id,
        template: tpl?.key ?? null,
        metadata: { broadcast_id: broadcastId, template_id: params.templateId },
      });
      if (broadcastId) {
        await admin.from("broadcast_deliveries" as never).insert({
          broadcast_id: broadcastId,
          workspace_id: w.id,
          phone,
          status: res.ok ? "sent" : "failed",
          error: res.ok ? null : `HTTP ${res.status}`,
          rendered_body: rendered,
        } as never);
      }
      if (res.ok) sent++;
      else failed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      if (broadcastId) {
        await admin.from("broadcast_deliveries" as never).insert({
          broadcast_id: broadcastId,
          workspace_id: w.id,
          phone,
          status: "failed",
          error: msg,
          rendered_body: rendered,
        } as never);
      }
    }
  }

  if (broadcastId) {
    await admin
      .from("broadcasts" as never)
      .update({
        sent,
        failed,
        status: "done",
        rendered_sample: samples[0]?.rendered ?? null,
        finished_at: new Date().toISOString(),
      } as never)
      .eq("id", broadcastId);
  }

  return {
    ok: true,
    broadcastId,
    audience: withPhone.length,
    sent,
    failed,
    dryRun: params.dryRun,
    samples,
  };
}
