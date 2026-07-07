import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PlaceholderScreen } from "@/components/fisioflow/PlaceholderScreen";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — FisioFlow" },
      { name: "description", content: "Ajuste as notificações do FisioFlow." },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      title="Notificações"
      icon={Bell}
      backTo="/configuracoes"
      emptyTitle="Sem preferências ainda"
      description="Em breve você poderá configurar alertas de agenda, pagamentos e tarefas"
    />
  ),
});
