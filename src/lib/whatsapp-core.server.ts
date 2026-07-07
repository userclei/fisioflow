// Helpers OTP e envio (server-only). Usado dentro de .handler() de server fns.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Servidor sem credenciais");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function generateOtpCode(): string {
  // 6 dígitos, sem começar com 0 fraco
  const n = 100000 + Math.floor(Math.random() * 900000);
  return String(n);
}

export async function hashOtp(phone: string, code: string): Promise<string> {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fisioflow-pepper";
  const enc = new TextEncoder().encode(`${phone}:${code}:${pepper}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function normalizePhone(input: string): string {
  const only = input.replace(/\D/g, "");
  // Aceita 10-15 dígitos. Se não começar com DDI (BR = 55), assume BR se 10-11 dígitos.
  if (only.length === 10 || only.length === 11) return `55${only}`;
  return only;
}

export type BtzapConfigRow = {
  id: number;
  token: string | null;
  url_base: string | null;
  endpoint_send_text: string;
  endpoint_send_buttons: string;
  connection_status: string;
  otp_enabled: boolean;
  billing_automation_enabled: boolean;
  billing_days_before: number;
  billing_days_after: number;
};

export async function loadBtzapConfigAdmin(): Promise<BtzapConfigRow> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("btzap_config")
    .select("id, token, url_base, endpoint_send_text, endpoint_send_buttons, connection_status, otp_enabled, billing_automation_enabled, billing_days_before, billing_days_after")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) throw new Error("Configuração da API WhatsApp indisponível");
  return data as BtzapConfigRow;
}

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function btzapCall(
  cfg: BtzapConfigRow,
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  if (!cfg.token || !cfg.url_base) throw new Error("BTZAP não configurado");
  const res = await fetch(joinUrl(cfg.url_base, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

export type ButtonSpec = { id?: string; text: string; url?: string; phone?: string; reply?: string };

export async function sendText(cfg: BtzapConfigRow, to: string, body: string) {
  return btzapCall(cfg, cfg.endpoint_send_text, {
    number: to, phone: to, to,
    text: body, message: body, body,
  });
}

export async function sendButtons(cfg: BtzapConfigRow, to: string, body: string, buttons: ButtonSpec[]) {
  return btzapCall(cfg, cfg.endpoint_send_buttons, {
    number: to, phone: to, to,
    text: body, message: body, body,
    buttons: buttons.map(b => ({
      id: b.id ?? b.text.slice(0, 20),
      text: b.text,
      url: b.url,
      phone: b.phone,
      reply: b.reply,
    })),
  });
}

// ============ /send/menu (BTZAP) — botões de resposta e listas ============

export type MenuButton = { text: string; id?: string };
export type MenuListItem = { text: string; id?: string; description?: string };
export type MenuListSection = { title: string; items: MenuListItem[] };

function menuChoicesFromButtons(buttons: MenuButton[]): string[] {
  return buttons
    .filter(b => b.text?.trim())
    .map(b => (b.id ? `${b.text}|${b.id}` : b.text));
}

function menuChoicesFromSections(sections: MenuListSection[]): string[] {
  const out: string[] = [];
  for (const s of sections) {
    if (!s.title?.trim()) continue;
    out.push(`[${s.title}]`);
    for (const it of s.items ?? []) {
      if (!it.text?.trim()) continue;
      const parts = [it.text];
      if (it.id) parts.push(it.id);
      if (it.description) parts.push(it.description);
      out.push(parts.join("|"));
    }
  }
  return out;
}

export async function sendMenuButton(
  cfg: BtzapConfigRow,
  to: string,
  text: string,
  buttons: MenuButton[],
  opts: { footerText?: string } = {},
) {
  return btzapCall(cfg, "/send/menu", {
    number: to,
    type: "button",
    text,
    footerText: opts.footerText,
    choices: menuChoicesFromButtons(buttons),
  });
}

export async function sendMenuList(
  cfg: BtzapConfigRow,
  to: string,
  text: string,
  sections: MenuListSection[],
  opts: { footerText?: string; listButton?: string; selectableCount?: number } = {},
) {
  return btzapCall(cfg, "/send/menu", {
    number: to,
    type: "list",
    text,
    footerText: opts.footerText,
    listButton: opts.listButton ?? "Ver opções",
    selectableCount: opts.selectableCount ?? 1,
    choices: menuChoicesFromSections(sections),
  });
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export async function logMessage(params: {
  to: string;
  body: string;
  status: string;
  externalId?: string | null;
  error?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  workspaceId?: string | null;
  createdBy?: string | null;
  template?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getAdmin();
  await admin.from("whatsapp_message_logs").insert({
    to_number: params.to,
    body: params.body,
    status: params.status,
    external_id: params.externalId ?? null,
    error: params.error ?? null,
    related_type: params.relatedType ?? null,
    related_id: params.relatedId ?? null,
    workspace_id: params.workspaceId ?? null,
    created_by: params.createdBy ?? null,
    template: params.template ?? null,
    metadata: (params.metadata ?? {}) as never,
    sent_at: params.status === "sent" ? new Date().toISOString() : null,
    failed_at: params.status === "failed" ? new Date().toISOString() : null,
  } as never);
}
