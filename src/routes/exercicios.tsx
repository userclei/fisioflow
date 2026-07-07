import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/exercicios")({
  head: () => ({
    meta: [
      { title: "Exercícios — FisioFlow" },
      { name: "description", content: "Biblioteca de exercícios fisioterapêuticos." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Exercícios"
      icon={Activity}
      emptyTitle="Nenhum exercício cadastrado"
      description="Crie exercícios para prescrever aos seus pacientes"
      actionLabel="Novo exercício"
    />
  ),
});
