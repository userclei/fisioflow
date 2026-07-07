// Motor de dunning (server-only). Chamado por server functions e pelo cron.
import { getAdmin, loadBtzapConfigAdmin, sendText, sendMenuButton, sendMenuList, logMessage, type MenuButton, type MenuListSection } from "./whatsapp-core.server";

type Vars = Record<string, string>;

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtDate(d: string | Date): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Render {{var}} placeholders. Missing keys become empty string.
 */
export function renderVars(body: string, vars: Vars): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

export function buildInvoiceVars(params: {
  workspaceName: string | null;
  responsibleName: string | null;
  amount: number;
  dueDate: string;
  plan: string | null;
  paymentLink?: string | null;
}): Vars {
  const due = new Date(params.dueDate);
  const today = new Date();
  const days = diffDays(today, due);
  return {
    cliente: params.responsibleName ?? params.workspaceName ?? "cliente",
    empresa: params.workspaceName ?? "",
    valor: BRL(Number(params.amount) || 0),
    vencimento: fmtDate(params.dueDate),
    dias_atraso: days > 0 ? String(days) : "0",
    dias_para_vencer: days < 0 ? String(Math.abs(days)) : "0",
    plano: params.plan ?? "",
    link_pagamento: params.paymentLink ?? "",
  };
}

type TickResult = {
  ok: true;
  processedFlows: number;
  processedInvoices: number;
  sent: number;
  failed: number;
  skipped: number;
  details: Array<{ invoiceId: string; stepId: string; status: string; error?: string }>;
};

export async function runDunningTickCore(): Promise<TickResult> {
  const admin = getAdmin();
  const now = new Date();

  // 1) Fluxos ativos com seus steps ativos
  const { data: flowsRaw } = await admin
    .from("dunning_flows" as never)
    .select("id, name, is_active, is_default, stop_on_paid")
    .eq("is_active", true);
  const flows = (flowsRaw ?? []) as unknown as Array<{
    id: string; name: string; is_default: boolean; stop_on_paid: boolean;
  }>;
  if (flows.length === 0) {
    return { ok: true, processedFlows: 0, processedInvoices: 0, sent: 0, failed: 0, skipped: 0, details: [] };
  }
  const defaultFlow = flows.find((f) => f.is_default) ?? flows[0];

  const { data: stepsRaw } = await admin
    .from("dunning_flow_steps" as never)
    .select("id, flow_id, order_index, trigger_type, offset_days, template_id, channel, is_active")
    .eq("is_active", true);
  const steps = (stepsRaw ?? []) as unknown as Array<{
    id: string; flow_id: string; order_index: number; trigger_type: string;
    offset_days: number; template_id: string | null; channel: "whatsapp" | "email" | "both"; is_active: boolean;
  }>;

  // 2) Templates
  const templateIds = Array.from(new Set(steps.map((s) => s.template_id).filter(Boolean))) as string[];
  const templates: Record<string, {
    id: string; body: string; category: string; key: string;
    message_type: "text" | "button" | "list";
    footer_text: string | null;
    list_button_text: string | null;
    buttons: MenuButton[];
    list_sections: MenuListSection[];
  }> = {};
  if (templateIds.length > 0) {
    const { data: tplRaw } = await admin
      .from("whatsapp_templates" as never)
      .select("id, body, category, key, message_type, footer_text, list_button_text, buttons, list_sections")
      .in("id", templateIds);
    for (const t of (tplRaw ?? []) as unknown as Array<{
      id: string; body: string; category: string; key: string;
      message_type: "text" | "button" | "list" | null;
      footer_text: string | null; list_button_text: string | null;
      buttons: MenuButton[] | null; list_sections: MenuListSection[] | null;
    }>) {
      templates[t.id] = {
        id: t.id, body: t.body, category: t.category, key: t.key,
        message_type: t.message_type ?? "text",
        footer_text: t.footer_text,
        list_button_text: t.list_button_text,
        buttons: Array.isArray(t.buttons) ? t.buttons : [],
        list_sections: Array.isArray(t.list_sections) ? t.list_sections : [],
      };
    }
  }

  // 3) Faturas em aberto ou vencidas (janela ampla — motor decide o que baterá offset hoje)
  const { data: invRaw } = await admin
    .from("invoices" as never)
    .select("id, workspace_id, amount, due_date, status")
    .in("status", ["pending", "overdue", "paid"])
    .gte("due_date", new Date(now.getTime() - 30 * 86400 * 1000).toISOString().slice(0, 10))
    .lte("due_date", new Date(now.getTime() + 30 * 86400 * 1000).toISOString().slice(0, 10));
  const invoices = (invRaw ?? []) as unknown as Array<{
    id: string; workspace_id: string; amount: number; due_date: string; status: string;
  }>;

  // 4) Workspaces (nome, telefone, responsável, plano)
  const wsIds = Array.from(new Set(invoices.map((i) => i.workspace_id)));
  const workspaces: Record<string, { id: string; name: string; phone: string | null; responsible_name: string | null; plan: string | null }> = {};
  if (wsIds.length > 0) {
    const { data: wsRaw } = await admin
      .from("workspaces" as never)
      .select("id, name, phone, responsible_name, plan")
      .in("id", wsIds);
    for (const w of (wsRaw ?? []) as unknown as Array<{ id: string; name: string; phone: string | null; responsible_name: string | null; plan: string | null }>) {
      workspaces[w.id] = w;
    }
  }

  // 5) Config BTZAP
  let cfg: Awaited<ReturnType<typeof loadBtzapConfigAdmin>> | null = null;
  try { cfg = await loadBtzapConfigAdmin(); } catch { cfg = null; }

  const result: TickResult = {
    ok: true, processedFlows: flows.length, processedInvoices: invoices.length,
    sent: 0, failed: 0, skipped: 0, details: [],
  };

  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");

  // 6) Para cada invoice, achar steps que batem hoje
  for (const inv of invoices) {
    const due = new Date(inv.due_date + "T00:00:00Z");
    const days = diffDays(today, due); // >0 = atraso, <0 = falta

    for (const step of steps) {
      if (step.flow_id !== defaultFlow.id) continue;
      if (step.offset_days !== days) continue;

      // Idempotência — checa execução prévia bem-sucedida
      const { data: prev } = await admin
        .from("dunning_executions" as never)
        .select("id, status")
        .eq("step_id", step.id)
        .eq("invoice_id", inv.id)
        .in("status", ["sent", "pending_provider"])
        .maybeSingle();
      if (prev) continue;

      // Stop se paga
      if (inv.status === "paid" && defaultFlow.stop_on_paid) {
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: step.channel, status: "stopped",
          error: "invoice_paid",
        } as never);
        result.skipped++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: "stopped" });
        continue;
      }

      const tpl = step.template_id ? templates[step.template_id] : null;
      if (!tpl) {
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: step.channel, status: "failed",
          error: "template_not_found",
        } as never);
        result.failed++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: "failed", error: "template_not_found" });
        continue;
      }

      const ws = workspaces[inv.workspace_id];
      const vars = buildInvoiceVars({
        workspaceName: ws?.name ?? null,
        responsibleName: ws?.responsible_name ?? null,
        amount: Number(inv.amount ?? 0),
        dueDate: inv.due_date,
        plan: ws?.plan ?? null,
        paymentLink: null,
      });
      const rendered = renderVars(tpl.body, vars);

      // Email fica pendente até plugarmos Resend
      if (step.channel === "email") {
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: "email", status: "pending_provider",
          rendered_body: rendered, error: "email_provider_not_configured",
        } as never);
        result.skipped++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: "pending_provider" });
        continue;
      }

      // WhatsApp (ou both -> WhatsApp aqui + email pendente)
      const phone = (ws?.phone ?? "").replace(/\D/g, "");
      if (!phone || phone.length < 10) {
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: step.channel, status: "failed",
          rendered_body: rendered, error: "no_phone",
        } as never);
        result.failed++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: "failed", error: "no_phone" });
        continue;
      }

      if (!cfg || !cfg.token || !cfg.url_base) {
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: step.channel, status: "failed",
          rendered_body: rendered, error: "btzap_not_configured",
        } as never);
        result.failed++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: "failed", error: "btzap_not_configured" });
        continue;
      }

      try {
        // Renderiza também variáveis em textos de botões/itens
        const renderedButtons: MenuButton[] = tpl.buttons.map(b => ({
          text: renderVars(b.text ?? "", vars),
          id: b.id,
        }));
        const renderedSections: MenuListSection[] = tpl.list_sections.map(s => ({
          title: renderVars(s.title ?? "", vars),
          items: (s.items ?? []).map(it => ({
            text: renderVars(it.text ?? "", vars),
            id: it.id,
            description: it.description ? renderVars(it.description, vars) : undefined,
          })),
        }));
        const footer = tpl.footer_text ? renderVars(tpl.footer_text, vars) : undefined;
        const listBtn = tpl.list_button_text ? renderVars(tpl.list_button_text, vars) : undefined;

        const res =
          tpl.message_type === "button" && renderedButtons.length > 0
            ? await sendMenuButton(cfg, phone, rendered, renderedButtons, { footerText: footer })
            : tpl.message_type === "list" && renderedSections.length > 0
            ? await sendMenuList(cfg, phone, rendered, renderedSections, { footerText: footer, listButton: listBtn })
            : await sendText(cfg, phone, rendered);
        await logMessage({
          to: phone, body: rendered,
          status: res.ok ? "sent" : "failed",
          error: res.ok ? null : `HTTP ${res.status}`,
          relatedType: "dunning", relatedId: inv.id,
          workspaceId: inv.workspace_id, template: tpl.key,
          metadata: { flow_id: defaultFlow.id, step_id: step.id, template_key: tpl.key },
        });
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: step.channel,
          status: res.ok ? "sent" : "failed",
          rendered_body: rendered,
          error: res.ok ? null : `HTTP ${res.status}`,
        } as never);
        if (res.ok) result.sent++; else result.failed++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: res.ok ? "sent" : "failed" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin.from("dunning_executions" as never).insert({
          flow_id: defaultFlow.id, step_id: step.id, invoice_id: inv.id,
          workspace_id: inv.workspace_id, channel: step.channel, status: "failed",
          rendered_body: rendered, error: msg,
        } as never);
        result.failed++;
        result.details.push({ invoiceId: inv.id, stepId: step.id, status: "failed", error: msg });
      }
    }
  }

  return result;
}
