import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura — FisioFlow" },
      { name: "description", content: "Gerencie seu plano FisioFlow PRO." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Assinatura"
      icon={Star}
      backTo="/configuracoes"
      emptyTitle="Plano PRO Mensal"
      description="Você está no plano PRO. Em breve poderá gerenciar cobrança e faturas por aqui."
    />
  ),
});
