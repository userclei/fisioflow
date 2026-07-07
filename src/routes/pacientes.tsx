import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Search, UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/fisioflow/EmptyState";
import { FilterPill } from "@/components/fisioflow/FilterPill";
import { FloatingActionButton } from "@/components/fisioflow/FloatingActionButton";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { InputField } from "@/components/fisioflow/InputField";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWorkspace } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — FisioFlow" },
      { name: "description", content: "Cadastre, busque e organize seus pacientes." },
    ],
  }),
  component: PacientesPage,
});

type Filter = "Todos" | "Ativos" | "Inativos";

function PacientesPage() {
  const { user } = useSession();
  const ws = useWorkspace(user);
  const qc = useQueryClient();
  const wsId = ws.data?.workspaceId;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Todos");
  const [open, setOpen] = useState(false);

  const patients = useQuery({
    queryKey: ["patients", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, phone, email, status, treatment_goal")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const items = patients.data ?? [];
    return items.filter((p) => {
      if (filter === "Ativos" && p.status !== "active") return false;
      if (filter === "Inativos" && p.status !== "inactive") return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          p.full_name.toLowerCase().includes(q) ||
          (p.phone ?? "").toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [patients.data, filter, query]);

  const create = useMutation({
    mutationFn: async (payload: {
      full_name: string; phone?: string; email?: string; birth_date?: string; cpf?: string;
      treatment_goal?: string; observations?: string; status: "active" | "inactive";
    }) => {
      if (!wsId || !user) throw new Error("Sem workspace");
      const { error } = await supabase.from("patients").insert({
        workspace_id: wsId,
        created_by: user.id,
        full_name: payload.full_name,
        phone: payload.phone || null,
        email: payload.email || null,
        birth_date: payload.birth_date || null,
        cpf: payload.cpf || null,
        treatment_goal: payload.treatment_goal || null,
        observations: payload.observations || null,
        status: payload.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrado com sucesso");
      qc.invalidateQueries({ queryKey: ["patients", wsId] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <MobileShell>
      <PageHeader title="Pacientes" backTo="/home" />

      <div className="px-5">
        <InputField name="search" placeholder="Buscar pacientes..." icon={<Search size={18} />}
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-5">
        {(["Todos", "Ativos", "Inativos"] as Filter[]).map((f) => (
          <FilterPill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      {patients.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-muted-foreground">
          Carregando pacientes…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col">
          <EmptyState
            icon={UsersRound}
            title={(patients.data?.length ?? 0) === 0 ? "Nenhum paciente" : "Nada encontrado"}
            description={(patients.data?.length ?? 0) === 0 ? "Cadastre seu primeiro paciente" : "Ajuste os filtros ou a busca"}
            action={(patients.data?.length ?? 0) === 0 ? (
              <PrimaryButton onClick={() => setOpen(true)}>Adicionar paciente</PrimaryButton>
            ) : undefined}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2 px-5">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link to="/pacientes/$id" params={{ id: p.id }}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 transition-transform active:scale-[0.99]"
                style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card-soft text-[15px] font-bold text-primary">
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-foreground">{p.full_name}</div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {p.phone || p.email || "Sem contato"}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  p.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {p.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

      )}

      <FloatingActionButton onClick={() => setOpen(true)} aria-label="Adicionar paciente">
        <UserPlus size={22} strokeWidth={2.2} />
      </FloatingActionButton>

      <NewPatientSheet open={open} onOpenChange={setOpen}
        onSave={(p) => create.mutate(p)} saving={create.isPending} />
    </MobileShell>
  );
}

function NewPatientSheet({
  open, onOpenChange, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (p: {
    full_name: string; phone?: string; email?: string; birth_date?: string; cpf?: string;
    treatment_goal?: string; observations?: string; status: "active" | "inactive";
  }) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", birth_date: "", cpf: "",
    treatment_goal: "", observations: "", status: "active" as "active" | "inactive",
  });
  function submit() {
    if (!form.full_name.trim()) return toast.error("Informe o nome do paciente");
    onSave({
      full_name: form.full_name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      birth_date: form.birth_date || undefined,
      cpf: form.cpf || undefined,
      treatment_goal: form.treatment_goal || undefined,
      observations: form.observations || undefined,
      status: form.status,
    });
  }
  return (
    <ModalBottomSheet open={open} onOpenChange={onOpenChange} title="Novo paciente">
      <InputField label="Nome completo *" placeholder="Nome do paciente"
        value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} />
      <InputField label="Telefone / WhatsApp" placeholder="(00) 00000-0000"
        value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
      <InputField label="E-mail" type="email" placeholder="email@exemplo.com"
        value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
      <InputField label="Data de nascimento" type="date"
        value={form.birth_date} onChange={(e) => setForm((s) => ({ ...s, birth_date: e.target.value }))} />
      <InputField label="CPF" placeholder="000.000.000-00"
        value={form.cpf} onChange={(e) => setForm((s) => ({ ...s, cpf: e.target.value }))} />
      <InputField label="Objetivo do tratamento" placeholder="Ex: reabilitação pós-cirúrgica"
        value={form.treatment_goal} onChange={(e) => setForm((s) => ({ ...s, treatment_goal: e.target.value }))} />
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Observações</label>
        <textarea rows={3} value={form.observations}
          onChange={(e) => setForm((s) => ({ ...s, observations: e.target.value }))}
          placeholder="Anotações importantes..."
          className="w-full rounded-xl border border-border bg-card/60 px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      </div>
      <div className="space-y-1.5">
        <label className="text-[14px] font-semibold text-foreground">Status *</label>
        <div className="grid grid-cols-2 gap-2">
          {(["active", "inactive"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, status: s }))}
              className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                form.status === s ? "border-success bg-success/10 text-success" : "border-border bg-card text-muted-foreground"
              }`}>
              ● {s === "active" ? "Ativo" : "Inativo"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <SecondaryButton onClick={() => onOpenChange(false)}>Cancelar</SecondaryButton>
        <PrimaryButton onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</PrimaryButton>
      </div>
    </ModalBottomSheet>
  );
}
