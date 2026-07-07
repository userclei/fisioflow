import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, CheckCircle2, Clock, User } from "lucide-react";
import { useMemo, useState } from "react";
import { createBookingRequest, getAvailableSlots, getPublicBookingLink } from "@/lib/booking.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendar/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Agendar — ${params.slug}` },
      { name: "description", content: "Escolha um horário disponível." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookPage,
});

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DAYS_L = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth()+1).toString().padStart(2,"0");
  const dd = d.getDate().toString().padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function BookPage() {
  const { slug } = Route.useParams();
  const getLink = useServerFn(getPublicBookingLink);
  const getSlots = useServerFn(getAvailableSlots);
  const create = useServerFn(createBookingRequest);

  const link = useQuery({ queryKey: ["public_link", slug], queryFn: () => getLink({ data: { slug } }) });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "form" | "done">("pick");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  const days = useMemo(() => {
    if (!link.data) return [];
    const out: Date[] = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i=0; i<link.data.advance_days; i++) {
      const d = new Date(today); d.setDate(today.getDate()+i);
      if (link.data.working_days.includes(d.getDay())) out.push(d);
    }
    return out;
  }, [link.data]);

  const slots = useQuery({
    queryKey: ["slots", slug, selectedDate],
    enabled: !!selectedDate,
    queryFn: () => getSlots({ data: { slug, date: selectedDate! } }),
  });

  const submit = useMutation({
    mutationFn: () => create({ data: {
      slug, date: selectedDate!, time: selectedTime!,
      name: form.name, email: form.email, phone: form.phone, notes: form.notes,
    }}),
    onSuccess: () => setStep("done"),
  });

  if (link.isLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  if (link.isError || !link.data) return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">Link não encontrado ou desativado.</div>;

  const l = link.data;

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-10 pt-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-muted-foreground">Reunião com</div>
            <div className="text-[16px] font-bold text-foreground truncate">{l.owner_name}</div>
          </div>
        </div>
        <h1 className="text-[22px] font-bold leading-tight text-foreground">{l.title}</h1>
        {l.description && <p className="mt-1 text-[13px] text-muted-foreground">{l.description}</p>}
        <div className="mt-2 flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock size={14}/> {l.duration_min} min</span>
        </div>

        {step === "done" ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <CheckCircle2 size={56} className="text-primary" />
            <h2 className="mt-4 text-[20px] font-bold text-foreground">Agendamento confirmado</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {selectedDate && new Date(selectedDate+"T00:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"long" })}
              {" · "}{selectedTime}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">{l.owner_name} foi notificado(a).</p>
          </div>
        ) : step === "pick" ? (
          <>
            <div className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <CalendarDays size={16}/> Escolha um dia
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {days.map((d) => {
                const iso = isoDate(d);
                const on = selectedDate === iso;
                return (
                  <button key={iso} onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                    className={cn(
                      "flex min-w-[56px] flex-col items-center rounded-2xl border px-3 py-2 transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
                    )}>
                    <span className="text-[10px] font-semibold uppercase opacity-70">{MONTHS[d.getMonth()]}</span>
                    <span className="mt-0.5 text-[18px] font-bold">{d.getDate()}</span>
                    <span className="text-[10px] opacity-70">{DAYS_L[d.getDay()].slice(0,3)}</span>
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-5">
                <div className="text-[13px] font-semibold text-foreground">Horários disponíveis</div>
                {slots.isLoading ? (
                  <p className="mt-2 text-[12px] text-muted-foreground">Carregando…</p>
                ) : (slots.data?.slots.length ?? 0) === 0 ? (
                  <p className="mt-2 text-[12px] text-muted-foreground">Sem horários livres neste dia.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {slots.data!.slots.map((s) => {
                      const on = selectedTime === s;
                      return (
                        <button key={s} onClick={() => setSelectedTime(s)}
                          className={cn(
                            "rounded-xl border py-2.5 text-[13px] font-semibold transition-colors",
                            on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
                          )}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button disabled={!selectedTime} onClick={() => setStep("form")}
              className="mt-6 h-12 w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-40">
              Continuar
            </button>
          </>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-foreground">Nome*</label>
              <input required maxLength={100} value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-foreground">Email</label>
              <input type="email" maxLength={255} value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-foreground">Telefone</label>
              <input maxLength={30} value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-foreground">Observação</label>
              <textarea rows={3} maxLength={1000} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[14px] focus:border-primary focus:outline-none" />
            </div>
            {submit.isError && <p className="text-[12px] text-destructive">{(submit.error as Error).message}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep("pick")}
                className="h-12 flex-1 rounded-full border border-border bg-card text-[15px] font-semibold text-foreground">
                Voltar
              </button>
              <button type="submit" disabled={submit.isPending || !form.name.trim()}
                className="h-12 flex-[2] rounded-full bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-40">
                {submit.isPending ? "Confirmando…" : "Confirmar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
