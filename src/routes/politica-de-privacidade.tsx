import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { LegalShell, LegalContent } from "@/components/legal/LegalShell";
import { getCurrentLegalDoc } from "@/lib/legal.functions";

const opts = queryOptions({
  queryKey: ["legal", "privacy"],
  queryFn: () => getCurrentLegalDoc({ data: { kind: "privacy" } }),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — FisioFlow" },
      { name: "description", content: "Como a FisioFlow trata dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD)." },
      { property: "og:title", content: "Política de Privacidade — FisioFlow" },
      { property: "og:description", content: "Como a FisioFlow trata dados pessoais conforme a LGPD." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/politica-de-privacidade" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: () => (
    <LegalShell><LegalContent md="# Política de Privacidade\n\nDocumento indisponível no momento." /></LegalShell>
  ),
  notFoundComponent: () => (
    <LegalShell><LegalContent md="# Política de Privacidade\n\nDocumento não publicado." /></LegalShell>
  ),
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  if (!data) {
    return (
      <LegalShell>
        <LegalContent md={"# Política de Privacidade\n\nNenhuma versão publicada ainda."} />
      </LegalShell>
    );
  }
  return (
    <LegalShell>
      <LegalContent md={data.content_md} />
    </LegalShell>
  );
}
