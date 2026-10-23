import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, DollarSign, Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/fisioflow/EmptyState";
import { FilterPill } from "@/components/fisioflow/FilterPill";
import { FloatingActionButton } from "@/components/fisioflow/FloatingActionButton";
import { InputField } from "@/components/fisioflow/InputField";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { SummaryCard } from "@/components/fisioflow/SummaryCard";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWorkspace } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — FisioFlow" },
      { name: "description", content: "Cobranças, pendências e recebimentos do mês." },
    ],
  }),
  component: FinanceiroPage,
});

type Filter = "Todas" | "Pendentes" | "Pagas" | "Atrasadas";
const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function normalizeStatus(status: string, dueDate: string): "pending" | "paid" | "overdue" | "cancelled" {
  if (status === "pending" && dueDate < new Date().toISOString().slice(0, 10)) return "overdue";
  return status as never;
}

function FinanceiroPage() {
  const { user } = useSession();
  const ws = useWorkspace(user);
  const qc = useQueryClient();
  const wsId = ws.data?.workspaceId;
  const [filter, setFilter] = useState<Filter>("Todas");
  const [open, setOpen] = useState(false);

  const charges = useQuery({
    queryKey: ["charges", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charges")
        .select("id, description, amount, due_date, status, paid_at, patient_id, patients(full_name)")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = useMemo(() => charges.data ?? [], [charges.data]);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const pending = useMemo(
    () => list
      .map((c) => ({ ...c, effective: normalizeStatus(c.status, c.due_date) }))
      .filter((c) => c.effective === "pending" || c.effective === "overdue")
      .reduce((s, c) => s + Number(c.amount), 0),
    [list],
  );
  const received = useMemo(
    () => list
      .filter((c) => c.status === "paid" && (c.paid_at ?? "").slice(0, 10) >= monthStartStr)
      .reduce((s, c) => s + Number(c.amount), 0),
    [list, monthStartStr],
  );

  const filtered = useMemo(() => {
    return list.map((c) => ({ ...c, effective: normalizeStatus(c.status, c.due_date) }))
      .filter((c) => {
        if (filter === "Todas") return true;
        if (filter === "Pendentes") return c.effective === "pending";
        if (filter === "Pagas") return c.effective === "paid";
        if (filter === "Atrasadas") return c.effective === "overdue";
        return true;
      });
  }, [list, filter]);

  const create = useMutation({
    mutationFn: async (p: {
      description: string; amount: number; due_date: string;
      status: "pending" | "paid" | "overdue" | "cancelled";
      payment_method?: string; notes?: string; patient_name?: string;
    }) => {
      if (!wsId || !user) throw new Error("Sem workspace");
      const { error } = await supabase.from("charges").insert({
        workspace_id: wsId, created_by: user.id,
        description: p.description, amount: p.amount, due_date: p.due_date,
        status: p.status, payment_method: p.payment_method || null,
        paid_at: p.status === "paid" ? new Date().toISOString() : null,
        notes: p.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cobrança criada com sucesso");
      qc.invalidateQueries({ queryKey: ["charges", wsId] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("charges")
        .update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cobrança marcada como paga");
      qc.invalidateQueries({ queryKey: ["charges", wsId] });
    },
  });

  return (
    <MobileShell>
      <PageHeader title="Financeiro" backTo="/home" />

      <div className="flex gap-3 px-5">
        <SummaryCard icon={Clock} value={currency(pending)} label="Pendente" tone="warning" />
        <SummaryCard icon={CheckCircle2} value={currency(received)} label="Recebido" subtext="mês atual" tone="success" />
      </div>

      <div className="mt-4 px-5">
        <button type="button" onClick={() => toast("Histórico anual em breve")}
          className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-primary bg-transparent px-3.5 py-2 text-[13px] font-semibold text-primary hover:bg-primary/10">
          <Download size={16} /> Histórico anual
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-5">
        {(["Todas", "Pendentes", "Pagas", "Atrasadas"] as Filter[]).map((f) => (
          <FilterPill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      {charges.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={DollarSign} title="Nenhuma cobrança"
          description="Registre suas cobranças para acompanhar o financeiro"
          action={<PrimaryButton onClick={() => setOpen(true)}>Nova cobrança</PrimaryButton>} />
      ) : (
        <ul className="mt-4 space-y-2 px-5">
          {filtered.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3"
              style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-foreground">{c.description}</div>
                <div className="truncate text-[12px] text-muted-foreground">
                  {(c.patients?.full_name ?? "Sem paciente")} · vence {c.due_date.split("-").reverse().join("/")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-foreground">{currency(Number(c.amount))}</div>
                <div className={`text-[11px] font-semibold ${
                  c.effective === "paid" ? "text-success" : c.effective === "overdue" ? "text-destructive" : "text-primary"
                }`}>
                  {c.effective === "paid" ? "Paga" : c.effective === "overdue" ? "Atrasada" : c.effective === "cancelled" ? "Cancelada" : "Pendente"}
                </div>
                {c.effective !== "paid" && c.effective !== "cancelled" && (
                  <button onClick={() => markPaid.mutate(c.id)}
                    className="mt-1 text-[10px] font-semibold text-primary hover:text-primary-dark">
                    Marcar como paga
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <FloatingActionButton onClick={() => setOpen(true)} aria-label="Nova cobrança">
        <Plus size={24} strokeWidth={2.4} />
      </FloatingActionButton>

      <NewChargeSheet open={open} onOpenChange={setOpen} saving={create.isPending}
        onSave={(p) => create.mutate(p)} />
    </MobileShell>
  );
}

function NewChargeSheet({
  open, onOpenChange, onSave, saving,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; saving: boolean;
  onSave: (p: {
    description: string; amount: number; due_date: string;
    status: "pending" | "paid" | "overdue" | "cancelled";
    payment_method?: string; notes?: string; patient_name?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    description: "", amount: "", due_date: new Date().toISOString().slice(0, 10),
    status: "pending" as "pending" | "paid" | "overdue" | "cancelled",
    payment_method: "", notes: "",
  });

  function submit() {
    const amountNum = Number(form.amount.replace(",", "."));
    if (!form.description.trim() || !amountNum || amountNum <= 0) {
      return toast.error("Descrição e valor obrigatórios");
    }
    if (!form.due_date) return toast.error("Informe a data de vencimento");
    onSave({
      description: form.description.trim(), amount: amountNum,
      due_date: form.due_date, status: form.status,
      payment_method: form.payment_method || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <ModalBottomSheet open={open} onOpenChange={onOpenChange} title="Nova cobrança">
      <InputField label="Descrição *" placeholder="Ex: Sessão de fisioterapia"
        value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
      <InputField label="Valor *" placeholder="0,00" inputMode="decimal"
        value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
      <InputField label="Vencimento *" type="date"
        value={form.due_date} onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Status</label>
        <div className="grid grid-cols-3 gap-2">
          {(["pending", "paid", "overdue"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, status: s }))}
              className={`rounded-xl border px-2 py-2 text-[12px] font-semibold transition-colors ${
                form.status === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}>
              {s === "pending" ? "Pendente" : s === "paid" ? "Paga" : "Atrasada"}
            </button>
          ))}
        </div>
      </div>
      <InputField label="Forma de pagamento" placeholder="Pix, dinheiro, cartão..."
        value={form.payment_method} onChange={(e) => setForm((s) => ({ ...s, payment_method: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Observações</label>
        <textarea rows={3} value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
          className="w-full rounded-xl border border-border bg-card/60 px-3.5 py-2.5 text-[14px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <SecondaryButton onClick={() => onOpenChange(false)}>Cancelar</SecondaryButton>
        <PrimaryButton onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</PrimaryButton>
      </div>
    </ModalBottomSheet>
  );
}
