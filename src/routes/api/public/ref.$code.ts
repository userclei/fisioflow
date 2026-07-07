import { createFileRoute } from "@tanstack/react-router";

// Rota pública de tracking. Redireciona para destination do link/afiliado
// registrando clique e setando cookie de atribuição por 30 dias.
export const Route = createFileRoute("/api/public/ref/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const linkCode = url.searchParams.get("c") || undefined;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Busca afiliado pelo slug
        const { data: aff } = await supabaseAdmin
          .from("affiliates").select("id, slug, status, cookie_days").eq("slug", params.code).maybeSingle();
        if (!aff || aff.status !== "active") {
          return Response.redirect(new URL("/", url).toString(), 302);
        }

        // Busca link opcional
        let linkId: string | null = null;
        let destination = "/";
        if (linkCode) {
          const { data: link } = await supabaseAdmin
            .from("affiliate_links").select("id, destination_url, active").eq("slug", linkCode).maybeSingle();
          if (link?.active) { linkId = link.id; destination = link.destination_url || "/"; }
        }

        // Visitor id (via cookie existente ou gera novo)
        const cookies = request.headers.get("cookie") || "";
        const existing = /(?:^|; )ff_vid=([^;]+)/.exec(cookies);
        const visitorId = existing?.[1] || crypto.randomUUID();

        // IP/UA/referer
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
          || request.headers.get("cf-connecting-ip") || null;
        const ua = request.headers.get("user-agent") || null;
        const referrer = request.headers.get("referer") || null;

        // Registra clique (fire-and-forget)
        await supabaseAdmin.from("affiliate_clicks").insert({
          affiliate_id: aff.id, link_id: linkId, ip, user_agent: ua, referrer, visitor_id: visitorId,
        });

        // Monta URL de destino (pode ser absoluta ou relativa)
        const dest = destination.startsWith("http") ? destination : new URL(destination, url).toString();

        // Cookies: atribuição + visitor
        const maxAge = (aff.cookie_days || 30) * 86400;
        const headers = new Headers();
        headers.set("Location", dest);
        headers.append("Set-Cookie", `ff_vid=${visitorId}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
        headers.append("Set-Cookie", `ff_aff=${aff.slug}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
        if (linkCode) headers.append("Set-Cookie", `ff_link=${linkCode}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);

        return new Response(null, { status: 302, headers });
      },
    },
  },
});
