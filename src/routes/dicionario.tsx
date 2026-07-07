import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/dicionario")({
  head: () => ({
    meta: [
      { title: "Dicionário — FisioFlow" },
      { name: "description", content: "Consulte termos e técnicas da fisioterapia." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Dicionário"
      icon={Search}
      emptyTitle="Pesquise um termo"
      description="Encontre rapidamente conceitos, técnicas e termos da fisioterapia"
    />
  ),
});
