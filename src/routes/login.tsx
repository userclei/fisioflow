import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { InputField, PasswordField } from "@/components/fisioflow/InputField";
import { PrimaryButton } from "@/components/fisioflow/PrimaryButton";
import { SocialAuthButtons } from "@/components/fisioflow/SocialAuthButtons";
import { supabase } from "@/integrations/supabase/client";
import { seedSandboxData } from "@/lib/sandbox.functions";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — FisioFlow" },
      { name: "description", content: "Acesse o FisioFlow para organizar sua rotina de fisioterapia." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sandboxBusy, setSandboxBusy] = useState(false);

  useEffect(() => {
    if (ready && session) navigate({ to: "/home" });
  }, [ready, session, navigate]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return toast.error("Preencha todos os campos");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error("E-mail ou senha inválidos");
    navigate({ to: "/home" });
  }

  async function handleSandbox() {
    setSandboxBusy(true);
    try {
      const suffix = crypto.randomUUID().slice(0, 8);
      const sbEmail = `sandbox_${suffix}@fisioflow.test`;
      const sbPassword = crypto.randomUUID();

      const { error: signUpErr } = await supabase.auth.signUp({
        email: sbEmail,
        password: sbPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
          data: { full_name: "Admin Sandbox", is_sandbox: true },
        },
      });
      if (signUpErr) throw signUpErr;

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: sbEmail,
        password: sbPassword,
      });
      if (signInErr) {
        toast.error("Confirme o e-mail primeiro ou desative confirmação nas configs de auth.");
        throw signInErr;
      }

      // Aguarda trigger criar workspace/profile antes do seed
      await new Promise((r) => setTimeout(r, 800));
      await seedSandboxData();

      toast.success("Sessão sandbox criada com dados de exemplo");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar sandbox");
    } finally {
      setSandboxBusy(false);
    }
  }


  async function handleForgot() {
    if (!email) return toast("Digite seu e-mail no campo acima primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) return toast.error("Não foi possível enviar o e-mail");
    toast.success("Enviamos um link de recuperação para seu e-mail");
  }

  return (
    <div className="min-h-screen w-full bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-6 pb-10 pt-10">
        {/* Header: selo com aura teal */}
        <header className="flex flex-col items-center text-center">
          <div className="relative flex flex-col items-center">
            <span aria-hidden className="pointer-events-none absolute -inset-6 rounded-full bg-primary/15 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute -inset-2 rounded-full bg-primary/10 blur-xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[26px] bg-[var(--navy)] shadow-[0_18px_40px_-12px_rgba(6,43,73,0.35)]">
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
            Bem-vindo de volta
          </h1>
          <p className="mt-2 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
            Acesse sua rotina em um toque
          </p>

          <div className="mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-transparent opacity-30" />
        </header>

        {/* Card do formulário */}
        <div className="mt-8 rounded-3xl border border-border/50 bg-card/70 p-6 shadow-[0_20px_60px_-30px_rgba(6,43,73,0.25)] backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <InputField
              name="email" label="E-mail" type="email" autoComplete="email"
              placeholder="seu@email.com" icon={<Mail size={18} />}
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordField
              name="password" label="Senha" placeholder="Sua senha" icon={<Lock size={18} />}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex justify-between items-center -mt-1">
              <Link to="/recuperar-senha" className="text-[12px] font-medium text-[#08C7BA] hover:opacity-70">
                Recuperar por WhatsApp
              </Link>
              <button type="button" onClick={handleForgot}
                className="text-[13px] font-semibold text-primary transition-opacity hover:opacity-70">
                Esqueceu sua senha?
              </button>
            </div>

            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Entrando..." : "Entrar"}
            </PrimaryButton>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">ou continue com</span>
            <span className="h-px flex-1 bg-border/70" />
          </div>

          <SocialAuthButtons />

          <Link
            to="/login-whatsapp"
            className="mt-3 group flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-[#08C7BA]/60 bg-[#08C7BA]/[0.06] px-4 py-3 text-sm font-semibold text-[#08C7BA] transition-all hover:border-[#08C7BA] hover:bg-[#08C7BA]/[0.12]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Entrar com WhatsApp
          </Link>

          <button
            type="button" onClick={handleSandbox} disabled={sandboxBusy}
            className="group mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-primary/60 bg-primary/[0.04] px-4 py-3 transition-all hover:border-primary hover:bg-primary/[0.08] disabled:opacity-60"
          >
            <Sparkles size={16} className="text-primary transition-transform group-hover:scale-110" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13.5px] font-bold text-primary">
                {sandboxBusy ? "Criando sandbox..." : "Testar com login de demonstração"}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                Admin + dados de exemplo prontos
              </span>
            </div>
          </button>
        </div>


        <p className="mt-8 text-center text-[13px] text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-bold text-primary hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
