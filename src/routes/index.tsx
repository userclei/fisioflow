import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useScrollRevealAll } from "@/hooks/useScrollRevealAll";

import { BeforeAfterSection } from "@/components/landing/BeforeAfterSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { FloatingAIChat } from "@/components/landing/FloatingAIChat";

import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LazySection } from "@/components/landing/LazySection";
import { PainSection } from "@/components/landing/PainSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ScrollCardsSection } from "@/components/landing/ScrollCardsSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { TrustBar } from "@/components/landing/TrustBar";


const TITLE = "FisioFlow | Sistema para fisioterapeutas organizarem pacientes, agenda e financeiro";
const DESCRIPTION =
  "Organize pacientes, agenda, notas clínicas, exercícios, tarefas e financeiro com o FisioFlow. Um sistema simples e moderno para fisioterapeutas e clínicas.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "sistema para fisioterapeuta, app para fisioterapia, software para clínica de fisioterapia, agenda para fisioterapeuta, controle financeiro fisioterapia, prontuário fisioterapia, gestão para fisioterapeutas, FisioFlow",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:site_name", content: "FisioFlow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FisioFlow",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web",
          description: DESCRIPTION,
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "BRL" },
            { "@type": "Offer", name: "PRO", price: "49.90", priceCurrency: "BRL" },
            { "@type": "Offer", name: "Clínica", price: "97.00", priceCurrency: "BRL" },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  useScrollRevealAll();

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const prevColorScheme = root.style.colorScheme;
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) root.classList.add("dark");
      root.style.colorScheme = prevColorScheme;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LandingHeader />
      <main className="landing-scroll-effects">
        <HeroSection />
        <LazySection><TrustBar /></LazySection>
        <LazySection><PainSection /></LazySection>
        <LazySection><SolutionSection /></LazySection>
        <LazySection><FeatureGrid /></LazySection>
        <LazySection><HowItWorks /></LazySection>
        <LazySection><CasesSection /></LazySection>
        <LazySection><ScrollCardsSection /></LazySection>
        <LazySection><BeforeAfterSection /></LazySection>
        <LazySection><PricingSection /></LazySection>
        <LazySection><FAQSection /></LazySection>
        <LazySection><FinalCTA /></LazySection>

      </main>
      <LandingFooter />
      <FloatingAIChat />
    </div>
  );
}
