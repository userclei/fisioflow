import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { InputField, PasswordField } from "@/components/fisioflow/InputField";
import { PrimaryButton } from "@/components/fisioflow/PrimaryButton";
import { SocialAuthButtons } from "@/components/fisioflow/SocialAuthButtons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — FisioFlow" },
      { name: "description", content: "Crie sua conta no FisioFlow em segundos." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email || !form.password) return toast.error("Preencha todos os campos");
    if (form.password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres");
    if (form.password !== form.confirm) return toast.error("As senhas não conferem");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.name.trim() },
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada. Bem-vindo(a) ao FisioFlow!");
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen w-full bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-6 pb-10 pt-10">
        <header className="flex flex-col items-center text-center">
          <div className="relative flex flex-col items-center">
            <span aria-hidden className="pointer-events-none absolute -inset-6 rounded-full bg-primary/15 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute -inset-2 rounded-full bg-primary/10 blur-xl animate-pulse" />
            <div
              className="relative flex h-16 w-16 items-center justify-center rounded-[26px] bg-[var(--navy)] shadow-[0_18px_40px_-12px_rgba(6,43,73,0.35)]"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2" fill="white" />
              </svg>
            </div>
            <span className="relative mt-3 text-[15px] font-bold tracking-tight text-foreground">
              Fisio<span className="text-primary">Flow</span>
            </span>
          </div>

          <h1 className="mt-6 text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            Criar conta
          </h1>
          <p className="mt-2 max-w-[240px] text-[14px] leading-relaxed text-muted-foreground">
            Seu espaço profissional começa aqui
          </p>

          <div className="mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-transparent opacity-30" />
        </header>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <InputField label="Nome completo" placeholder="Como quer ser chamado(a)"
            icon={<User size={18} />} value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <InputField label="E-mail" type="email" placeholder="seu@email.com"
            icon={<Mail size={18} />} value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          <PasswordField label="Senha" placeholder="Mínimo 6 caracteres"
            icon={<Lock size={18} />} value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          <PasswordField label="Confirmar senha" placeholder="Repita a senha"
            icon={<Lock size={18} />} value={form.confirm}
            onChange={(e) => setForm((s) => ({ ...s, confirm: e.target.value }))} />

          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Criando..." : "Criar conta"}
          </PrimaryButton>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border/70" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">ou cadastre com</span>
          <span className="h-px flex-1 bg-border/70" />
        </div>

        <SocialAuthButtons />


        <p className="mt-10 text-center text-[13px] text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-bold text-primary">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
