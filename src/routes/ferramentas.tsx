import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas — FisioFlow" },
      { name: "description", content: "Ferramentas úteis para o fisioterapeuta." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Ferramentas"
      icon={Wrench}
      emptyTitle="Ferramentas em breve"
      description="Calculadora de IMC, escalas clínicas e mais chegando por aqui"
    />
  ),
});
