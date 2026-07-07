import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { LegalShell, LegalContent } from "@/components/legal/LegalShell";
import { getCurrentLegalDoc } from "@/lib/legal.functions";

const opts = queryOptions({
  queryKey: ["legal", "terms"],
  queryFn: () => getCurrentLegalDoc({ data: { kind: "terms" } }),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — FisioFlow" },
      { name: "description", content: "Regras de uso da plataforma FisioFlow — SaaS para fisioterapeutas e clínicas." },
      { property: "og:title", content: "Termos de Uso — FisioFlow" },
      { property: "og:description", content: "Regras de uso da plataforma FisioFlow." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/termos-de-uso" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: () => (
    <LegalShell><LegalContent md="# Termos de Uso\n\nDocumento indisponível no momento." /></LegalShell>
  ),
  notFoundComponent: () => (
    <LegalShell><LegalContent md="# Termos de Uso\n\nDocumento não publicado." /></LegalShell>
  ),
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  if (!data) {
    return (
      <LegalShell>
        <LegalContent md={"# Termos de Uso\n\nNenhuma versão publicada ainda."} />
      </LegalShell>
    );
  }
  return (
    <LegalShell>
      <LegalContent md={data.content_md} />
    </LegalShell>
  );
}
