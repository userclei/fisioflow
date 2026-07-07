import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/dunning-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey");
        if (!anon || apikey !== anon) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        try {
          const { runDunningTickCore } = await import("@/lib/dunning-core.server");
          const result = await runDunningTickCore();
          return Response.json(result);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
