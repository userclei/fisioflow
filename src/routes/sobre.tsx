import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — FisioFlow" },
      { name: "description", content: "Sobre o app FisioFlow." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Sobre o FisioFlow"
      icon={Info}
      backTo="/configuracoes"
      emptyTitle="FisioFlow"
      description="App para fisioterapeutas organizarem pacientes, agenda, financeiro e tarefas. Versão 1.0."
    />
  ),
});
