import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLandingLead } from "@/lib/landing.functions";

const Schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  whatsapp: z.string().trim().max(30).optional(),
  usage_type: z.enum(["profissional", "clinica"]),
  message: z.string().trim().max(500).optional(),
});

const RATE_KEY = "fisio_lead_last_ts";

export function LeadCaptureForm() {
  const [usage, setUsage] = useState<"profissional" | "clinica">("profissional");
  const send = useServerFn(createLandingLead);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof Schema>) => send({ data }),
    onSuccess: () => {
      toast.success("Interesse registrado com sucesso.", {
        description: "Em breve entraremos em contato.",
      });
      localStorage.setItem(RATE_KEY, String(Date.now()));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível enviar agora.");
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const last = Number(localStorage.getItem(RATE_KEY) || 0);
    if (Date.now() - last < 60_000) {
      toast.info("Aguarde um instante antes de enviar novamente.");
      return;
    }
    const form = new FormData(e.currentTarget);
    const parsed = Schema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      whatsapp: form.get("whatsapp") || undefined,
      usage_type: usage,
      message: form.get("message") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    mutation.mutate(parsed.data);
    e.currentTarget.reset();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-border bg-card p-6 md:p-8"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <p className="text-[12px] font-bold uppercase tracking-widest text-primary">Fale com a gente</p>
      <h3 className="mt-1 text-[22px] font-extrabold text-navy md:text-[26px]">
        Estudante ou fisio já atuando? Vem conhecer o FisioFlow.
      </h3>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Deixe seus dados e nossa equipe entra em contato com dica de uso para o seu momento.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required maxLength={100} placeholder="Seu nome" />
        </Field>
        <Field>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required maxLength={255} placeholder="voce@email.com" />
        </Field>
        <Field>
          <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
          <Input id="whatsapp" name="whatsapp" maxLength={30} placeholder="(11) 90000-0000" />
        </Field>
        <Field>
          <Label>Tipo de uso</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["profissional", "clinica"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setUsage(v)}
                className={`rounded-xl border px-3 py-2 text-[13px] font-bold capitalize transition-all ${
                  usage === v
                    ? "border-primary bg-primary text-primary-foreground shadow"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <Label htmlFor="message">Mensagem (opcional)</Label>
        <Textarea id="message" name="message" maxLength={500} rows={3} placeholder="Como podemos te ajudar?" />
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full rounded-full font-bold" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send size={16} className="mr-2" /> Registrar interesse
          </>
        )}
      </Button>
    </form>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}
