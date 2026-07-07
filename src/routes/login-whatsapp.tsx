import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestWhatsappOtp, verifyWhatsappOtp } from "@/lib/whatsapp.functions";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, ArrowLeft, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login-whatsapp")({
  head: () => ({
    meta: [
      { title: "Entrar com WhatsApp — FisioFlow" },
      { name: "description", content: "Login sem senha via código no WhatsApp." },
    ],
  }),
  component: LoginWhatsappPage,
});

function LoginWhatsappPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const doRequest = useServerFn(requestWhatsappOtp);
  const doVerify = useServerFn(verifyWhatsappOtp);

  const request = useMutation({
    mutationFn: () => doRequest({ data: { phone, purpose: "login" } }),
    onSuccess: () => { toast.success("Código enviado no WhatsApp"); setStep("code"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const verify = useMutation({
    mutationFn: async () => {
      const res = await doVerify({ data: { phone, purpose: "login", code } });
      if (!res.loginToken || !res.email) throw new Error("Sessão inválida");
      const { error } = await supabase.auth.verifyOtp({
        email: res.email,
        token: res.loginToken,
        type: "magiclink",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bem-vindo!"); navigate({ to: "/home" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#062B49] via-[#0A3D66] to-[#062B49] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-center h-14 w-14 mx-auto rounded-2xl bg-[#08C7BA]/10">
          <MessageCircle className="h-7 w-7 text-[#08C7BA]" />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-[#062B49]">
          {step === "phone" ? "Entrar com WhatsApp" : "Digite o código"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {step === "phone" ? "Você receberá um código no seu WhatsApp." : `Enviamos para ${phone}`}
        </p>

        <div className="mt-6 space-y-4">
          {step === "phone" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Seu número (com DDD)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-[#08C7BA] hover:bg-[#00afa5] h-11"
                disabled={!phone || request.isPending}
                onClick={() => request.mutate()}
              >
                {request.isPending ? "Enviando…" : "Receber código no WhatsApp"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Código de 6 dígitos</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  className="text-center text-2xl font-mono tracking-widest h-14"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-[#08C7BA] hover:bg-[#00afa5] h-11"
                disabled={code.length !== 6 || verify.isPending}
                onClick={() => verify.mutate()}
              >
                {verify.isPending ? "Validando…" : "Entrar"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("phone"); setCode(""); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Trocar número
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border space-y-2 text-center text-xs">
          <Link to="/login" className="text-muted-foreground hover:text-foreground block">
            Entrar com email e senha
          </Link>
          <Link to="/recuperar-senha" className="text-[#08C7BA] hover:underline inline-flex items-center gap-1">
            <KeyRound className="h-3 w-3" /> Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  );
}
