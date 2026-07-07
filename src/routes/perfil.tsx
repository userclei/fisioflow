import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — FisioFlow" },
      { name: "description", content: "Edite seus dados de perfil." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Editar perfil"
      icon={User}
      backTo="/configuracoes"
      emptyTitle="Perfil em breve"
      description="Você poderá editar nome, foto e informações profissionais"
    />
  ),
});
