import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity, Calendar, CheckSquare, DollarSign, FileText, Quote, Search,
  Stethoscope, StickyNote, UsersRound, Wrench,
} from "lucide-react";
import { AppLogo } from "@/components/fisioflow/AppLogo";
import { FeatureCard } from "@/components/fisioflow/FeatureCard";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWorkspace } from "@/lib/auth";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Início — FisioFlow" },
      { name: "description", content: "Painel do fisioterapeuta com acesso rápido à sua rotina." },
    ],
  }),
  component: HomePage,
});

const features = [
  { label: "Agenda", to: "/agenda", icon: Calendar },
  { label: "Pacientes", to: "/pacientes", icon: UsersRound },
  { label: "Notas", to: "/notas", icon: FileText },
  { label: "Bloco de Notas", to: "/bloco-de-notas", icon: StickyNote },
  { label: "Exercícios", to: "/exercicios", icon: Activity },
  { label: "Financeiro", to: "/financeiro", icon: DollarSign },
  { label: "Tarefas", to: "/tarefas", icon: CheckSquare },
  { label: "Ferramentas", to: "/ferramentas", icon: Wrench },
  { label: "Dicionário", to: "/dicionario", icon: Search },
] as const;

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  physiotherapist: "Fisioterapeuta",
  assistant: "Assistente",
};

function greetingFor(hour: number) {
  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

function HomePage() {
  const { user } = useSession();
  const ws = useWorkspace(user);
  const quote = useQuery({
    queryKey: ["quote-of-day"],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_quotes")
        .select("text, author")
        .eq("active", true);
      if (!data?.length) return { text: "Movimento é medicina.", author: "Anônimo" };
      const idx = new Date().getDate() % data.length;
      return data[idx];
    },
  });

  const name = ws.data?.profile.full_name ?? "…";
  const initial = (name || "U").charAt(0).toUpperCase();
  const [greeting, setGreeting] = useState("");
  useEffect(() => { setGreeting(greetingFor(new Date().getHours())); }, []);
  const role = ws.data ? roleLabels[ws.data.role] ?? "Fisioterapeuta" : "Fisioterapeuta";

  return (
    <MobileShell>
      <div className="flex items-center justify-center pt-3">
        <AppLogo size={28} showLabel />
      </div>

      <div className="mt-4 px-5">
        <div className="relative overflow-hidden rounded-[26px] px-5 py-5 text-navy-foreground"
          style={{ backgroundColor: "var(--navy)", minHeight: 176 }}>
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full" style={{ background: "rgba(8,199,186,0.18)" }} />
          <div className="absolute -bottom-14 -left-10 h-36 w-36 rounded-full" style={{ background: "rgba(53,230,211,0.10)" }} />
          <div className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[18px] font-bold">
            {initial}
          </div>
          <p className="relative mt-4 text-[14px] text-white/70">{greeting}</p>
          <h1 className="relative text-[26px] font-extrabold leading-8">{name}!</h1>
          <div className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground">
            <Stethoscope size={14} strokeWidth={2.4} />
            {role}
          </div>
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="rounded-[20px] bg-card px-4 py-4" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 text-primary">
            <Quote size={16} strokeWidth={2.2} />
            <span className="text-[13px] font-bold">Frase do dia</span>
          </div>
          <p className="mt-2 text-[14px] italic leading-[20px] text-foreground">
            {quote.data?.text ?? "Carregando..."}
            {quote.data?.author && (
              <span className="not-italic text-muted-foreground"> — {quote.data.author}</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-5 pb-8">
        {features.map((f) => (
          <FeatureCard key={f.to} label={f.label} to={f.to} icon={f.icon} />
        ))}
      </div>
    </MobileShell>
  );
}
