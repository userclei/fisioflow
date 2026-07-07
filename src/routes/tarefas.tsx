import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — FisioFlow" },
      { name: "description", content: "Organize suas tarefas e lembretes profissionais." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Tarefas"
      icon={CheckSquare}
      emptyTitle="Nenhuma tarefa"
      description="Crie lembretes para organizar sua rotina profissional"
      actionLabel="Nova tarefa"
    />
  ),
});
