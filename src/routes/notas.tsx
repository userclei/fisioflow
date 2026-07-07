import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/notas")({
  head: () => ({
    meta: [
      { title: "Notas — FisioFlow" },
      { name: "description", content: "Registre evoluções e anotações clínicas." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Notas"
      icon={FileText}
      emptyTitle="Nenhuma nota criada"
      description="Registre evoluções, observações e lembretes dos pacientes"
      actionLabel="Criar nota"
    />
  ),
});
