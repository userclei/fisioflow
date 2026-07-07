import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  FileText,
  HelpCircle,
  Info,
  Link2,
  Lock,
  LogOut,
  Moon,
  ShieldCheck,
  Star,
  User,
  Users,
} from "lucide-react";
import {
  SettingsItem,
  SettingsSection,
} from "@/components/fisioflow/SettingsSection";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { STORAGE_KEYS, removeStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";


export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — FisioFlow" },
      {
        name: "description",
        content: "Preferências, assinatura e conta do FisioFlow.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    removeStorage(STORAGE_KEYS.user);
    toast.success("Sessão encerrada");
    navigate({ to: "/login", replace: true });
  }

  const themeLabel = theme === "dark" ? "Escuro" : theme === "light" ? "Claro" : "Automático";
  function cycleTheme() {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    toast.success(`Tema: ${next === "dark" ? "Escuro" : next === "light" ? "Claro" : "Automático"}`);
  }


  return (
    <MobileShell>
      <PageHeader title="Configurações" backTo="/home" />
      <div className="px-5">
        <SettingsSection title="Assinatura">

          <SettingsItem
            icon={Star}
            label="Plano PRO"
            value="PRO Mensal"
            to="/assinatura"
          />
        </SettingsSection>

        <SettingsSection title="Vendas">
          <SettingsItem icon={Users} label="CRM" to="/crm" />
          <SettingsItem icon={Link2} label="Links de agendamento" to="/agendamentos-link" />
        </SettingsSection>

        <SettingsSection title="Conta">
          <SettingsItem icon={User} label="Editar perfil" to="/perfil" />
          <SettingsItem icon={Lock} label="Alterar senha" to="/alterar-senha" />
        </SettingsSection>

        <SettingsSection title="Preferências">
          <SettingsItem icon={Bell} label="Notificações" to="/notificacoes" />
          <SettingsItem
            icon={Moon}
            label="Tema"
            value={themeLabel}
            onClick={cycleTheme}
          />
        </SettingsSection>

        <SettingsSection title="Modo de uso">
          <SettingsItem
            icon={Briefcase}
            label="Modo atual"
            value="Profissional"
            onClick={() => toast("Mais modos em breve")}
          />
        </SettingsSection>

        <SettingsSection title="Sobre">
          <SettingsItem icon={Info} label="Sobre o FisioFlow" to="/sobre" />
          <SettingsItem
            icon={FileText}
            label="Termos de uso"
            onClick={() => toast("Termos em breve")}
          />
          <SettingsItem
            icon={ShieldCheck}
            label="Política de privacidade"
            onClick={() => toast("Política em breve")}
          />
          <SettingsItem
            icon={HelpCircle}
            label="Ajuda e suporte"
            onClick={() => toast("Fale conosco em breve")}
          />
          <SettingsItem
            icon={LogOut}
            label="Sair da conta"
            danger
            onClick={handleSignOut}
          />
        </SettingsSection>
      </div>
    </MobileShell>
  );
}
