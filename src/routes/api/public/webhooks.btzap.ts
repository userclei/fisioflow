import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/webhooks/btzap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SERVICE_KEY) {
          return new Response("Server not configured", { status: 500 });
        }
        const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: cfg } = await admin
          .from("btzap_config")
          .select("webhook_secret")
          .eq("id", 1)
          .maybeSingle();

        const providedSecret =
          request.headers.get("x-webhook-secret") ??
          request.headers.get("x-btzap-secret") ??
          new URL(request.url).searchParams.get("secret") ??
          "";
        const expected = cfg?.webhook_secret ?? "";
        if (!expected || providedSecret !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: Record<string, unknown> = {};
        try { payload = await request.json(); } catch { /* ignore */ }

        const event = String(payload.event ?? payload.type ?? "unknown");
        const data = (payload.data ?? payload.message ?? payload) as Record<string, unknown>;
        const externalId =
          (data.id as string | undefined) ??
          (data.messageId as string | undefined) ??
          ((data.key as Record<string, unknown> | undefined)?.id as string | undefined) ??
          null;

        // Connection state update
        if (event.includes("connection") || event.includes("status") || event.includes("qr")) {
          const status = String((data.status as string | undefined) ?? (data.state as string | undefined) ?? "").toLowerCase();
          const patch: Record<string, unknown> = { last_check_at: new Date().toISOString() };
          if (status.includes("open") || status.includes("connect") || status.includes("ready")) {
            patch.connection_status = "connected";
            patch.qr_code = null;
          } else if (status.includes("close") || status.includes("disconnect") || status.includes("logout")) {
            patch.connection_status = "disconnected";
          } else if (status.includes("qr")) {
            patch.connection_status = "connecting";
            if (data.qrcode || data.qr) patch.qr_code = String(data.qrcode ?? data.qr);
          }
          const phone = (data.number as string | undefined) ?? (data.phone as string | undefined);
          const name = (data.name as string | undefined) ?? (data.profileName as string | undefined);
          if (phone) patch.phone_number = phone;
          if (name) patch.profile_name = name;
          await admin.from("btzap_config").update(patch as never).eq("id", 1);
        }

        // Message ack updates
        if (externalId && (event.includes("ack") || event.includes("status") || event.includes("delivery"))) {
          const ack = String((data.status as string | undefined) ?? (data.ack as string | undefined) ?? "").toLowerCase();
          const patch: Record<string, unknown> = {};
          if (ack.includes("read")) { patch.status = "read"; patch.read_at = new Date().toISOString(); }
          else if (ack.includes("deliver")) { patch.status = "delivered"; patch.delivered_at = new Date().toISOString(); }
          else if (ack.includes("sent") || ack.includes("server")) { patch.status = "sent"; patch.sent_at = new Date().toISOString(); }
          else if (ack.includes("fail") || ack.includes("error")) { patch.status = "failed"; patch.failed_at = new Date().toISOString(); patch.error = JSON.stringify(data).slice(0, 500); }
          if (Object.keys(patch).length > 0) {
            await admin.from("whatsapp_message_logs").update(patch as never).eq("external_id", externalId);
          }
        }

        // Log inbound messages as support entries
        if (event.includes("message") && !event.includes("ack")) {
          const from = String((data.from as string | undefined) ?? (data.number as string | undefined) ?? "");
          const bodyText = String((data.body as string | undefined) ?? (data.text as string | undefined) ?? (data.message as string | undefined) ?? "");
          if (from && bodyText) {
            await admin.from("whatsapp_message_logs").insert({
              to_number: from,
              body: bodyText,
              status: "received",
              related_type: "inbound",
              external_id: externalId,
              metadata: payload as unknown as never,
            } as never);
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
