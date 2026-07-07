import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { lovable } from "@/integrations/lovable";

type Provider = "google" | "apple";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.4-1.09 2.58-2.32 3.38v2.81h3.75c2.2-2.03 3.62-5.02 3.62-8.43z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.9l-3.75-2.81c-1.04.71-2.36 1.13-4.19 1.13-3.22 0-5.94-2.17-6.92-5.09H1.19v3.2C3.17 21.31 7.24 24 12 24z" />
      <path fill="#FBBC05" d="M5.08 14.33a7.2 7.2 0 0 1 0-4.66V6.47H1.19a12 12 0 0 0 0 11.06l3.89-3.2z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.32-3.32C17.95 1.19 15.24 0 12 0 7.24 0 3.17 2.69 1.19 6.47l3.89 3.2C6.06 6.92 8.78 4.75 12 4.75z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function SocialAuthButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const navigate = useNavigate();

  async function handle(provider: Provider) {
    setLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(`Não foi possível entrar com ${provider === "google" ? "Google" : "Apple"}`);
        setLoading(null);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/home" });
    } catch {
      toast.error("Erro inesperado no login social");
    } finally {
      setLoading(null);
    }
  }



  const base =
    "group relative flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card text-[13.5px] font-semibold text-foreground shadow-[0_1px_2px_rgba(6,43,73,0.04)] transition-all hover:border-primary/60 hover:shadow-[0_6px_20px_-10px_rgba(8,199,186,0.4)] disabled:opacity-60";

  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        onClick={() => handle("google")}
        disabled={loading !== null}
        className={base}
        aria-label="Entrar com Google"
      >
        <GoogleIcon />
        <span>{loading === "google" ? "Abrindo..." : "Google"}</span>
      </button>
      <button
        type="button"
        onClick={() => handle("apple")}
        disabled={loading !== null}
        className={base}
        aria-label="Entrar com Apple"
      >
        <AppleIcon />
        <span>{loading === "apple" ? "Abrindo..." : "Apple"}</span>
      </button>
    </div>
  );
}
