import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/alterar-senha")({
  head: () => ({
    meta: [
      { title: "Alterar senha — FisioFlow" },
      { name: "description", content: "Atualize sua senha de acesso." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Alterar senha"
      icon={Lock}
      backTo="/configuracoes"
      emptyTitle="Em breve"
      description="Alteração de senha estará disponível após a conexão com o backend"
    />
  ),
});
