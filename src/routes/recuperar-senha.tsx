import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestWhatsappOtp, verifyWhatsappOtp, resetPasswordWithOtp } from "@/lib/whatsapp.functions";
import { KeyRound, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — FisioFlow" },
      { name: "description", content: "Redefina sua senha via código no WhatsApp." },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const doRequest = useServerFn(requestWhatsappOtp);
  const doVerify = useServerFn(verifyWhatsappOtp);
  const doReset = useServerFn(resetPasswordWithOtp);

  const request = useMutation({
    mutationFn: () => doRequest({ data: { phone, purpose: "reset" } }),
    onSuccess: () => { toast.success("Código enviado no WhatsApp"); setStep("code"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const verify = useMutation({
    mutationFn: async () => {
      const res = await doVerify({ data: { phone, purpose: "reset", code } });
      if (!res.ticket) throw new Error("Falha na validação");
      setTicket(res.ticket);
    },
    onSuccess: () => { toast.success("Código válido — defina uma nova senha"); setStep("password"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) throw new Error("Senhas não conferem");
      if (newPassword.length < 8) throw new Error("Mínimo 8 caracteres");
      return doReset({ data: { phone, ticket, newPassword } });
    },
    onSuccess: () => { toast.success("Senha redefinida! Faça login."); navigate({ to: "/login" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#062B49] via-[#0A3D66] to-[#062B49] px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-center h-14 w-14 mx-auto rounded-2xl bg-[#08C7BA]/10">
          <KeyRound className="h-7 w-7 text-[#08C7BA]" />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold text-[#062B49]">
          {step === "phone" ? "Recuperar senha" : step === "code" ? "Digite o código" : "Nova senha"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {step === "phone" ? "Enviaremos um código no seu WhatsApp." : step === "code" ? `Enviado para ${phone}` : "Escolha uma senha forte"}
        </p>

        <div className="mt-6 space-y-4">
          {step === "phone" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Seu número cadastrado</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" autoFocus />
              </div>
              <Button className="w-full bg-[#08C7BA] hover:bg-[#00afa5] h-11" disabled={!phone || request.isPending} onClick={() => request.mutate()}>
                {request.isPending ? "Enviando…" : "Enviar código"}
              </Button>
            </>
          )}

          {step === "code" && (
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
              <Button className="w-full bg-[#08C7BA] hover:bg-[#00afa5] h-11" disabled={code.length !== 6 || verify.isPending} onClick={() => verify.mutate()}>
                {verify.isPending ? "Validando…" : "Validar código"}
              </Button>
              <button type="button" onClick={() => request.mutate()} disabled={request.isPending} className="w-full text-xs text-muted-foreground hover:text-foreground">
                {request.isPending ? "Reenviando…" : "Reenviar código"}
              </button>
            </>
          )}

          {step === "password" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Nova senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirmar senha</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button className="w-full bg-[#08C7BA] hover:bg-[#00afa5] h-11" disabled={!newPassword || reset.isPending} onClick={() => reset.mutate()}>
                {reset.isPending ? "Salvando…" : "Redefinir senha"}
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center text-xs">
          <Link to="/login" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
