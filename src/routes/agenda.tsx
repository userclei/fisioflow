import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  Stethoscope,
  User2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/fisioflow/EmptyState";
import { FloatingActionButton } from "@/components/fisioflow/FloatingActionButton";
import { InputField } from "@/components/fisioflow/InputField";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWorkspace } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agenda — FisioFlow" },
      { name: "description", content: "Organize seus atendimentos por dia, semana, mês ou período." },
    ],
  }),
  component: AgendaPage,
});

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAYS_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfWeek(d: Date) {
  const nd = new Date(d);
  const day = nd.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  nd.setDate(nd.getDate() + diff);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function addDays(d: Date, n: number) { const nd = new Date(d); nd.setDate(d.getDate() + n); return nd; }
function addMonths(d: Date, n: number) { const nd = new Date(d); nd.setMonth(d.getMonth() + n); return nd; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function between(d: Date, a: Date, b: Date) {
  const t = d.getTime(); const lo = Math.min(a.getTime(), b.getTime()); const hi = Math.max(a.getTime(), b.getTime());
  return t >= lo && t <= hi;
}

type ViewMode = "Dia" | "Semana" | "Mês" | "Período";
type Appt = {
  id: string; title: string; type: string; event_date: string;
  start_time: string; end_time: string; status: string;
  patient_id: string | null; location?: string | null; notes?: string | null;
  patients: { full_name: string; phone?: string | null } | null;
};

const TYPE_COLORS: Record<string, { bar: string; chip: string; label: string }> = {
  avaliacao: { bar: "#3ddc97", chip: "bg-[#3ddc97]/15 text-[#0d9a68]", label: "Avaliação" },
  sessao:    { bar: "#08c7ba", chip: "bg-primary/15 text-primary", label: "Sessão" },
  retorno:   { bar: "#f6c85f", chip: "bg-[#f6c85f]/20 text-[#8a6a12]", label: "Retorno" },
  outro:     { bar: "#9aa8b5", chip: "bg-muted text-muted-foreground", label: "Outro" },
};

function AgendaPage() {
  const { user } = useSession();
  const ws = useWorkspace(user);
  const qc = useQueryClient();
  const wsId = ws.data?.workspaceId;

  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null); // 2nd endpoint in "Período"
  const [mode, setMode] = useState<ViewMode>("Semana");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Appt | null>(null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return startOfMonth(d); });

  const range = useMemo(() => {
    if (mode === "Dia") return { from: isoDate(selected), to: isoDate(selected) };
    if (mode === "Semana") {
      const from = startOfWeek(selected);
      const to = addDays(from, 6);
      return { from: isoDate(from), to: isoDate(to) };
    }
    if (mode === "Período" && rangeEnd) {
      const a = selected < rangeEnd ? selected : rangeEnd;
      const b = selected < rangeEnd ? rangeEnd : selected;
      return { from: isoDate(a), to: isoDate(b) };
    }
    // Mês (default cursor is source of truth in month/period view)
    return { from: isoDate(startOfMonth(cursor)), to: isoDate(endOfMonth(cursor)) };
  }, [mode, selected, rangeEnd, cursor]);

  const appointments = useQuery({
    queryKey: ["appointments", wsId, range.from, range.to],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, title, type, event_date, start_time, end_time, status, patient_id, location, notes, patients(full_name, phone)")
        .gte("event_date", range.from).lte("event_date", range.to)
        .order("event_date").order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as Appt[];
    },
  });

  const visibleItems = useMemo(() => {
    const all = appointments.data ?? [];
    if (mode === "Dia") return all.filter((a) => a.event_date === isoDate(selected));
    if (mode === "Período" && rangeEnd) return all;
    if (mode === "Mês") return all;
    // Semana: mostra o dia selecionado
    return all.filter((a) => a.event_date === isoDate(selected));
  }, [appointments.data, mode, selected, rangeEnd]);

  const stats = useMemo(() => {
    const all = appointments.data ?? [];
    const totalMin = all.reduce((acc, a) => {
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      return acc + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }, 0);
    const pacientes = new Set(all.map((a) => a.patient_id).filter(Boolean)).size;
    return { total: all.length, horas: (totalMin / 60).toFixed(1), pacientes };
  }, [appointments.data]);

  const headerTitle = mode === "Mês" || mode === "Período"
    ? `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`
    : `${MONTHS[selected.getMonth()]} de ${selected.getFullYear()}`;

  return (
    <MobileShell>
      <PageHeader title="Agenda" backTo="/home" />

      {/* Header rico com gradiente */}
      <div className="px-5">
        <div
          className="relative overflow-hidden rounded-[24px] p-4 text-navy-foreground"
          style={{
            background: "linear-gradient(135deg, var(--navy) 0%, #0a3d63 60%, #08c7ba 160%)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full" style={{ background: "rgba(8,199,186,0.22)" }} />
          <div className="relative flex items-center justify-between">
            <button
              onClick={() => { const nc = addMonths(cursor, -1); setCursor(nc); if (mode !== "Mês" && mode !== "Período") setSelected(addMonths(selected, -1)); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Agenda</div>
              <div className="text-[16px] font-extrabold capitalize">{headerTitle}</div>
            </div>
            <button
              onClick={() => { const nc = addMonths(cursor, 1); setCursor(nc); if (mode !== "Mês" && mode !== "Período") setSelected(addMonths(selected, 1)); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="relative mt-3 grid grid-cols-3 gap-2">
            <StatChip label="Eventos" value={stats.total.toString()} />
            <StatChip label="Horas" value={stats.horas} />
            <StatChip label="Pacientes" value={stats.pacientes.toString()} />
          </div>
        </div>
      </div>

      {/* Segmented control com ícones */}
      <div className="mt-3 px-5">
        <div className="flex gap-1 rounded-2xl bg-card p-1 text-[12px] font-semibold" style={{ boxShadow: "var(--shadow-soft)" }}>
          {([
            ["Dia", CalendarIcon],
            ["Semana", CalendarDays],
            ["Mês", Sparkles],
            ["Período", CalendarRange],
          ] as [ViewMode, typeof CalendarIcon][]).map(([m, Icon]) => (
            <button key={m} onClick={() => { setMode(m); if (m !== "Período") setRangeEnd(null); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all",
                mode === m
                  ? "bg-gradient-to-br from-primary to-[#00afa5] text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              <Icon size={13} strokeWidth={2.4} />
              <span>{m}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendário */}
      {mode === "Mês" || mode === "Período" ? (
        <MonthGrid
          cursor={cursor}
          selected={selected}
          rangeEnd={mode === "Período" ? rangeEnd : null}
          isRangeMode={mode === "Período"}
          onPick={(d) => {
            if (mode !== "Período") { setSelected(d); return; }
            // Range: 1º clique define início e limpa fim; 2º clique define fim
            if (!rangeEnd && !sameDay(d, selected)) { setRangeEnd(d); return; }
            setSelected(d); setRangeEnd(null);
          }}
          events={appointments.data ?? []}
        />
      ) : (
        <WeekStrip selected={selected} onSelect={setSelected} events={appointments.data ?? []} />
      )}

      {/* Resumo do dia / período */}
      <div className="mt-4 flex items-center justify-between px-5">
        <div className="text-[15px] font-bold capitalize text-foreground">
          {mode === "Período" && rangeEnd
            ? `${selected.getDate()}/${selected.getMonth()+1} → ${rangeEnd.getDate()}/${rangeEnd.getMonth()+1}`
            : mode === "Mês"
              ? `${visibleItems.length} evento${visibleItems.length === 1 ? "" : "s"} no mês`
              : `${WEEKDAYS_LONG[selected.getDay()]}, ${selected.getDate()} de ${MONTHS[selected.getMonth()]}`}
        </div>
        <span className="rounded-full bg-card-soft px-2 py-0.5 text-[11px] font-bold text-primary">
          {visibleItems.length}
        </span>
      </div>

      {appointments.isLoading ? (
        <div className="flex flex-1 items-center justify-center py-10 text-[13px] text-muted-foreground">Carregando…</div>
      ) : visibleItems.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="Nenhum evento"
          description="Você não tem eventos agendados para este período"
          action={<PrimaryButton onClick={() => setOpen(true)}>Adicionar evento</PrimaryButton>} />
      ) : (
        <ul className="mt-3 space-y-2 px-5">
          {visibleItems.map((a) => {
            const color = TYPE_COLORS[a.type] ?? TYPE_COLORS.outro;
            return (
              <li key={a.id}
                className="relative flex items-stretch gap-3 overflow-hidden rounded-2xl bg-card p-3 pl-4"
                style={{ boxShadow: "var(--shadow-soft)" }}>
                <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: color.bar }} />
                <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-card-soft p-2">
                  <span className="text-[15px] font-extrabold text-foreground">{a.start_time.slice(0, 5)}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">até {a.end_time.slice(0, 5)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", color.chip)}>{color.label}</span>
                    {(mode === "Mês" || mode === "Período") && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {a.event_date.split("-").reverse().slice(0,2).join("/")}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[14px] font-semibold text-foreground">{a.title}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><User2 size={11} />{a.patients?.full_name ?? "Sem paciente"}</span>
                    {a.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{a.location}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(a)}
                  aria-label="Ver detalhes do agendamento"
                  className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full bg-primary/10 text-primary transition active:scale-95 hover:bg-primary/20">
                  <Eye size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <FloatingActionButton onClick={() => setOpen(true)} aria-label="Novo agendamento">
        <Plus size={24} strokeWidth={2.4} />
      </FloatingActionButton>

      <NewAppointmentSheet open={open} onOpenChange={setOpen} defaultDate={isoDate(selected)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["appointments", wsId] })} />

      <AppointmentDetailsSheet
        appt={detail}
        onClose={() => setDetail(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["appointments", wsId] })}
      />
    </MobileShell>
  );
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído",
  cancelled: "Cancelado", no_show: "Faltou", in_progress: "Em andamento",
};

function normalizePhone(raw?: string | null) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function AppointmentDetailsSheet({ appt, onClose, onChanged }: { appt: Appt | null; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!appt) return null;
  const color = TYPE_COLORS[appt.type] ?? TYPE_COLORS.outro;
  const [y, m, d] = appt.event_date.split("-");
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const dateLabel = `${WEEKDAYS_LONG[dateObj.getDay()]}, ${Number(d)} de ${MONTHS[Number(m) - 1]} de ${y}`;
  const shortDate = `${d}/${m}/${y}`;
  const timeLabel = `${appt.start_time.slice(0, 5)} — ${appt.end_time.slice(0, 5)}`;
  const patientName = appt.patients?.full_name ?? "";
  const phoneDigits = normalizePhone(appt.patients?.phone);
  const canWhatsapp = phoneDigits.length >= 12;

  async function updateStatus(next: "scheduled" | "completed" | "cancelled" | "missed", label: string) {
    setBusy(next);
    const { error } = await supabase.from("appointments").update({ status: next }).eq("id", appt!.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(label);
    onChanged();
    onClose();
  }

  function openWhatsapp(text: string) {
    if (!canWhatsapp) return toast.error("Paciente sem WhatsApp cadastrado");
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const firstName = patientName.split(" ")[0] || "";
  const confirmMsg = `Olá ${firstName}! 👋 Confirmando seu ${color.label.toLowerCase()} no dia ${shortDate} às ${appt.start_time.slice(0,5)}. Podemos confirmar? Responda SIM ou NÃO. Obrigado!`;
  const reminderMsg = `Oi ${firstName}! Só lembrando do seu ${color.label.toLowerCase()} amanhã, ${shortDate} às ${appt.start_time.slice(0,5)}${appt.location ? ` (${appt.location})` : ""}. Nos vemos lá! 💪`;

  async function copyPhone() {
    if (!phoneDigits) return toast.error("Sem telefone");
    await navigator.clipboard.writeText(appt!.patients!.phone!);
    toast.success("Telefone copiado");
  }

  return (
    <ModalBottomSheet open={!!appt} onOpenChange={(v) => !v && onClose()} title="Detalhes do agendamento">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", color.chip)}>{color.label}</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {STATUS_LABEL[appt.status] ?? appt.status}
        </span>
      </div>
      <div className="text-[17px] font-bold text-foreground">{appt.title}</div>

      <div className="space-y-3 rounded-2xl bg-card-soft p-4">
        <DetailRow icon={CalendarIcon} label="Data" value={dateLabel} />
        <DetailRow icon={Clock} label="Horário" value={timeLabel} />
        <DetailRow icon={User2} label="Paciente" value={patientName || "Sem paciente"} />
        {appt.patients?.phone && <DetailRow icon={Phone} label="Telefone" value={appt.patients.phone} />}
        {appt.location && <DetailRow icon={MapPin} label="Local" value={appt.location} />}
        {appt.notes && <DetailRow icon={FileText} label="Observações" value={appt.notes} multiline />}
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton icon={MessageCircle} label="Confirmar" onClick={() => openWhatsapp(confirmMsg)} disabled={!canWhatsapp} tone="whatsapp" />
          <ActionButton icon={MessageCircle} label="Lembrete" onClick={() => openWhatsapp(reminderMsg)} disabled={!canWhatsapp} tone="whatsapp" />
          <ActionButton icon={Phone} label="Ligar" onClick={() => phoneDigits && (window.location.href = `tel:+${phoneDigits}`)} disabled={!canWhatsapp} />
          <ActionButton icon={Copy} label="Copiar nº" onClick={copyPhone} disabled={!phoneDigits} />
        </div>
        {!canWhatsapp && <div className="mt-1.5 text-[11px] text-muted-foreground">Cadastre o telefone do paciente para liberar as ações do WhatsApp.</div>}
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</div>
        <div className="grid grid-cols-3 gap-2">
          <ActionButton icon={CheckCheck} label="Concluir" onClick={() => updateStatus("completed", "Agendamento concluído")} disabled={busy !== null || appt.status === "completed"} tone="success" />
          <ActionButton icon={XCircle} label="Faltou" onClick={() => updateStatus("missed", "Marcado como falta")} disabled={busy !== null || appt.status === "missed"} tone="primary" />
          <ActionButton icon={XCircle} label="Cancelar" onClick={() => updateStatus("cancelled", "Agendamento cancelado")} disabled={busy !== null || appt.status === "cancelled"} tone="danger" />
        </div>
      </div>

      <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
    </ModalBottomSheet>
  );
}

function ActionButton({
  icon: Icon, label, onClick, disabled, tone = "default",
}: {
  icon: typeof CalendarIcon; label: string; onClick: () => void; disabled?: boolean;
  tone?: "default" | "whatsapp" | "success" | "primary" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-card-soft text-foreground hover:bg-muted",
    whatsapp: "bg-[#25D366]/12 text-[#128C4A] hover:bg-[#25D366]/20",
    success: "bg-[#3ddc97]/15 text-[#0d9a68] hover:bg-[#3ddc97]/25",
    primary: "bg-primary/12 text-primary hover:bg-primary/20",
    danger: "bg-[#ef6b6b]/12 text-[#c63a3a] hover:bg-[#ef6b6b]/20",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone],
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function DetailRow({ icon: Icon, label, value, multiline }: { icon: typeof CalendarIcon; label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("text-[13px] font-medium text-foreground", multiline ? "whitespace-pre-wrap" : "truncate")}>{value}</div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-1.5 text-center backdrop-blur-sm">
      <div className="text-[16px] font-extrabold leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">{label}</div>
    </div>
  );
}

function WeekStrip({ selected, onSelect, events }: {
  selected: Date; onSelect: (d: Date) => void; events: { event_date: string }[];
}) {
  const start = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const counts = new Map<string, number>();
  events.forEach((e) => counts.set(e.event_date, (counts.get(e.event_date) ?? 0) + 1));
  const max = Math.max(1, ...Array.from(counts.values()));
  const today = new Date();
  return (
    <div className="mt-3 grid grid-cols-7 gap-1.5 px-5">
      {days.map((d) => {
        const active = sameDay(d, selected);
        const isToday = sameDay(d, today);
        const c = counts.get(isoDate(d)) ?? 0;
        const fill = c / max;
        return (
          <button key={d.toISOString()} onClick={() => onSelect(d)}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-2xl px-1 py-2 transition-all",
              active
                ? "bg-gradient-to-br from-primary to-[#00afa5] text-primary-foreground shadow-[var(--shadow-glow)]"
                : "bg-card text-foreground hover:bg-card-soft",
            )}
            style={{ boxShadow: active ? undefined : "var(--shadow-soft)" }}>
            <span className={cn("text-[9px] font-bold uppercase tracking-wide", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {WEEKDAYS_SHORT[d.getDay()]}
            </span>
            <span className="mt-1 text-[16px] font-extrabold leading-none">{d.getDate()}</span>
            {/* barra de densidade */}
            <div className={cn("mt-1.5 h-1 w-6 overflow-hidden rounded-full", active ? "bg-white/25" : "bg-card-soft")}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${fill * 100}%`, background: active ? "#fff" : "var(--primary)" }}
              />
            </div>
            {isToday && !active && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function MonthGrid({ cursor, selected, rangeEnd, isRangeMode, onPick, events }: {
  cursor: Date; selected: Date; rangeEnd: Date | null; isRangeMode: boolean;
  onPick: (d: Date) => void; events: { event_date: string; type?: string }[];
}) {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);
  const startPad = first.getDay();
  const totalCells = Math.ceil((startPad + last.getDate()) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayOffset = i - startPad;
    return new Date(cursor.getFullYear(), cursor.getMonth(), dayOffset + 1);
  });
  const counts = new Map<string, number>();
  events.forEach((e) => counts.set(e.event_date, (counts.get(e.event_date) ?? 0) + 1));
  const today = new Date();

  return (
    <div className="mt-3 px-5">
      <div className="rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS_SHORT.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isStart = sameDay(d, selected);
            const isEnd = rangeEnd && sameDay(d, rangeEnd);
            const inRange = isRangeMode && rangeEnd && between(d, selected, rangeEnd) && !isStart && !isEnd;
            const isToday = sameDay(d, today);
            const c = counts.get(isoDate(d)) ?? 0;
            const anySelect = isStart || isEnd;
            return (
              <button key={i} onClick={() => onPick(d)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] font-semibold transition-all",
                  !inMonth && "text-muted-foreground/40",
                  inRange && "bg-primary/15 text-primary rounded-none",
                  anySelect && "bg-gradient-to-br from-primary to-[#00afa5] text-primary-foreground shadow-[var(--shadow-glow)]",
                  !anySelect && !inRange && isToday && "bg-card-soft text-primary ring-1 ring-primary/30",
                  !anySelect && !inRange && !isToday && "text-foreground hover:bg-card-soft",
                  isRangeMode && isStart && rangeEnd && "rounded-r-none",
                  isRangeMode && isEnd && "rounded-l-none",
                )}>
                <span>{d.getDate()}</span>
                {c > 0 && !anySelect && (
                  <div className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: Math.min(3, c) }).map((_, k) => (
                      <span key={k} className={cn("h-1 w-1 rounded-full", inRange ? "bg-primary" : "bg-primary")} />
                    ))}
                  </div>
                )}
                {c > 0 && anySelect && (
                  <div className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: Math.min(3, c) }).map((_, k) => (
                      <span key={k} className="h-1 w-1 rounded-full bg-white/90" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {isRangeMode && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-card-soft px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            <span>
              {rangeEnd
                ? `Período: ${selected.getDate()}/${selected.getMonth()+1} a ${rangeEnd.getDate()}/${rangeEnd.getMonth()+1}`
                : "Toque em 2 dias para definir o período"}
            </span>
            {rangeEnd && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                {Math.abs(Math.round((rangeEnd.getTime() - selected.getTime()) / 86400000)) + 1} dias
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewAppointmentSheet({ open, onOpenChange, defaultDate, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; defaultDate: string; onSaved: () => void;
}) {
  const { user } = useSession();
  const ws = useWorkspace(user);
  const wsId = ws.data?.workspaceId;
  const [form, setForm] = useState({
    title: "Atendimento", type: "sessao" as "avaliacao" | "sessao" | "retorno" | "outro",
    event_date: defaultDate, start_time: "09:00", end_time: "10:00",
    location: "", patient_id: "" as string, notes: "",
  });

  const patients = useQuery({
    queryKey: ["patients-lite", wsId],
    enabled: !!wsId && open,
    queryFn: async () => {
      const { data } = await supabase.from("patients")
        .select("id, full_name").is("deleted_at", null).order("full_name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!wsId || !user) throw new Error("Sem workspace");
      if (form.end_time <= form.start_time) throw new Error("Hora final deve ser maior que a inicial");
      const { data: conflicts } = await supabase.from("appointments")
        .select("id").eq("event_date", form.event_date)
        .lt("start_time", form.end_time).gt("end_time", form.start_time)
        .eq("professional_id", user.id);
      if ((conflicts?.length ?? 0) > 0) throw new Error("Já existe um atendimento nesse horário");
      const { error } = await supabase.from("appointments").insert({
        workspace_id: wsId, professional_id: user.id, created_by: user.id,
        title: form.title || "Atendimento", type: form.type,
        event_date: form.event_date, start_time: form.start_time, end_time: form.end_time,
        location: form.location || null, patient_id: form.patient_id || null,
        notes: form.notes || null, status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agendamento criado"); onSaved(); onOpenChange(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const typeIcons: Record<string, typeof Stethoscope> = {
    avaliacao: Sparkles, sessao: Stethoscope, retorno: Clock, outro: CalendarIcon,
  };

  return (
    <ModalBottomSheet open={open} onOpenChange={onOpenChange} title="Novo agendamento">
      <InputField label="Título" value={form.title}
        onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Paciente</label>
        <select value={form.patient_id}
          onChange={(e) => setForm((s) => ({ ...s, patient_id: e.target.value }))}
          className="h-11 w-full rounded-xl border border-border bg-card/60 px-3 text-[14px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25">
          <option value="">Sem paciente</option>
          {(patients.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Tipo</label>
        <div className="grid grid-cols-4 gap-2">
          {(["avaliacao", "sessao", "retorno", "outro"] as const).map((t) => {
            const Icon = typeIcons[t];
            const color = TYPE_COLORS[t];
            const active = form.type === t;
            return (
              <button key={t} type="button" onClick={() => setForm((s) => ({ ...s, type: t }))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-bold capitalize transition-all",
                  active ? "border-transparent text-primary-foreground shadow-[var(--shadow-glow)]" : "border-border bg-card text-muted-foreground",
                )}
                style={active ? { background: `linear-gradient(135deg, ${color.bar}, ${color.bar}dd)` } : undefined}>
                <Icon size={16} strokeWidth={2.4} />
                {color.label}
              </button>
            );
          })}
        </div>
      </div>
      <InputField label="Data *" type="date" value={form.event_date}
        onChange={(e) => setForm((s) => ({ ...s, event_date: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Início *" type="time" value={form.start_time}
          onChange={(e) => setForm((s) => ({ ...s, start_time: e.target.value }))} />
        <InputField label="Fim *" type="time" value={form.end_time}
          onChange={(e) => setForm((s) => ({ ...s, end_time: e.target.value }))} />
      </div>
      <InputField label="Local" placeholder="Consultório, online..."
        value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Observações</label>
        <textarea rows={3} value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          className="w-full rounded-xl border border-border bg-card/60 px-3.5 py-2.5 text-[14px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <SecondaryButton onClick={() => onOpenChange(false)}>Cancelar</SecondaryButton>
        <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </PrimaryButton>
      </div>
    </ModalBottomSheet>
  );
}
