import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft, FileText, Trash2, Plus, Save, User2, MapPin, IdCard,
  Phone, Mail, Cake, Briefcase, ShieldPlus, StickyNote, ChevronRight,
} from "lucide-react";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { InputField } from "@/components/fisioflow/InputField";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWorkspace } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes/$id")({
  head: () => ({ meta: [{ title: "Paciente — FisioFlow" }] }),
  component: PatientDetailPage,
});

type Doc = { id: string; kind: string; label: string; number?: string; url?: string; created_at: string };

type PatientRow = {
  id: string;
  full_name: string;
  status: "active" | "inactive" | string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  cpf: string | null;
  rg: string | null;
  profession: string | null;
  health_plan: string | null;
  treatment_goal: string | null;
  observations: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  documents: Doc[];
};

type Tab = "info" | "endereco" | "docs" | "notas";

function PatientDetailPage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const ws = useWorkspace(user);
  const wsId = ws.data?.workspaceId;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("info");
  const [form, setForm] = useState<PatientRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  const patient = useQuery({
    queryKey: ["patient", id],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Paciente não encontrado");
      return data as unknown as PatientRow;
    },
  });

  useEffect(() => {
    if (patient.data && !form) {
      setForm({ ...patient.data, documents: Array.isArray(patient.data.documents) ? patient.data.documents : [] });
    }
  }, [patient.data, form]);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from("patients").update(payload as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente atualizado");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients", wsId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients")
        .update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Paciente removido"); navigate({ to: "/pacientes" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  function set<K extends keyof PatientRow>(key: K, value: PatientRow[K]) {
    setForm((s) => (s ? { ...s, [key]: value } : s));
    setDirty(true);
  }

  function addDoc(doc: Omit<Doc, "id" | "created_at">) {
    if (!form) return;
    const next: Doc = { ...doc, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const documents = [next, ...form.documents];
    setForm({ ...form, documents });
    save.mutate({ documents });
    setDocOpen(false);
  }
  function removeDoc(dId: string) {
    if (!form) return;
    const documents = form.documents.filter((d) => d.id !== dId);
    setForm({ ...form, documents });
    save.mutate({ documents });
  }

  if (patient.isLoading || !form) {
    return (
      <MobileShell>
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">Carregando…</div>
      </MobileShell>
    );
  }

  const initials = form.full_name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  return (
    <MobileShell>
      {/* Header rico */}
      <div className="px-5 pt-2">
        <div className="mb-2 flex items-center justify-between">
          <Link to="/pacientes" className="flex h-9 w-9 items-center justify-center rounded-full bg-card" style={{ boxShadow: "var(--shadow-soft)" }}>
            <ArrowLeft size={18} />
          </Link>
          <button onClick={() => { if (confirm("Excluir este paciente?")) remove.mutate(); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-destructive"
            style={{ boxShadow: "var(--shadow-soft)" }}>
            <Trash2 size={16} />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[24px] p-4 text-navy-foreground"
          style={{ background: "linear-gradient(135deg, var(--navy) 0%, #0a3d63 55%, #08c7ba 170%)" }}>
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full" style={{ background: "rgba(8,199,186,0.22)" }} />
          <div className="relative flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-[18px] font-extrabold backdrop-blur">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[18px] font-extrabold">{form.full_name}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/70">
                <span className={cn("rounded-full px-2 py-0.5 font-bold",
                  form.status === "active" ? "bg-[#3ddc97]/25 text-[#c7ffe8]" : "bg-white/15 text-white/70")}>
                  {form.status === "active" ? "Ativo" : "Inativo"}
                </span>
                {form.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{form.phone}</span>}
              </div>
            </div>
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            <MiniStat label="Docs" value={form.documents.length.toString()} />
            <MiniStat label="Idade" value={form.birth_date ? String(ageFrom(form.birth_date)) : "—"} />
            <MiniStat label="Convênio" value={form.health_plan ? "Sim" : "Não"} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 px-5">
        <div className="flex gap-1 rounded-2xl bg-card p-1 text-[12px] font-semibold" style={{ boxShadow: "var(--shadow-soft)" }}>
          {([
            ["info", "Dados", User2],
            ["endereco", "Endereço", MapPin],
            ["docs", "Docs", FileText],
            ["notas", "Notas", StickyNote],
          ] as [Tab, string, typeof User2][]).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn("flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all",
                tab === k ? "bg-gradient-to-br from-primary to-[#00afa5] text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              <Icon size={13} strokeWidth={2.4} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6 pt-4">
        {tab === "info" && (
          <div className="space-y-3">
            <InputField label="Nome completo *" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} icon={<User2 size={16} />} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Telefone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} icon={<Phone size={16} />} />
              <InputField label="WhatsApp" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} icon={<Phone size={16} />} />
            </div>
            <InputField label="E-mail" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} icon={<Mail size={16} />} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Nascimento" type="date" value={form.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} icon={<Cake size={16} />} />
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-foreground">Gênero</label>
                <select value={form.gender ?? ""} onChange={(e) => set("gender", e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-card/60 px-3 text-[14px]">
                  <option value="">—</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="CPF" placeholder="000.000.000-00" value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} icon={<IdCard size={16} />} />
              <InputField label="RG" placeholder="00.000.000-0" value={form.rg ?? ""} onChange={(e) => set("rg", e.target.value)} icon={<IdCard size={16} />} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Profissão" value={form.profession ?? ""} onChange={(e) => set("profession", e.target.value)} icon={<Briefcase size={16} />} />
              <InputField label="Convênio" value={form.health_plan ?? ""} onChange={(e) => set("health_plan", e.target.value)} icon={<ShieldPlus size={16} />} />
            </div>
            <InputField label="Objetivo do tratamento" value={form.treatment_goal ?? ""} onChange={(e) => set("treatment_goal", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Contato emergência" value={form.emergency_contact_name ?? ""} onChange={(e) => set("emergency_contact_name", e.target.value)} />
              <InputField label="Telefone emerg." value={form.emergency_contact_phone ?? ""} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-foreground">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(["active", "inactive"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => set("status", s)}
                    className={cn("rounded-xl border px-3 py-2.5 text-[13px] font-semibold",
                      form.status === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>
                    ● {s === "active" ? "Ativo" : "Inativo"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "endereco" && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <InputField label="Logradouro" value={form.address_street ?? ""} onChange={(e) => set("address_street", e.target.value)} />
              <InputField label="Número" value={form.address_number ?? ""} onChange={(e) => set("address_number", e.target.value)} />
            </div>
            <InputField label="Complemento" value={form.address_complement ?? ""} onChange={(e) => set("address_complement", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Bairro" value={form.address_district ?? ""} onChange={(e) => set("address_district", e.target.value)} />
              <InputField label="CEP" value={form.address_zip ?? ""} onChange={(e) => set("address_zip", e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <InputField label="Cidade" value={form.address_city ?? ""} onChange={(e) => set("address_city", e.target.value)} />
              <InputField label="UF" value={form.address_state ?? ""} onChange={(e) => set("address_state", e.target.value.toUpperCase().slice(0,2))} />
            </div>
          </div>
        )}

        {tab === "docs" && (
          <div className="space-y-3">
            <button onClick={() => setDocOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-4 text-[13px] font-bold text-primary hover:bg-primary/10">
              <Plus size={16} /> Anexar documento
            </button>
            {form.documents.length === 0 ? (
              <div className="rounded-2xl bg-card p-6 text-center text-[13px] text-muted-foreground" style={{ boxShadow: "var(--shadow-soft)" }}>
                Nenhum documento cadastrado
              </div>
            ) : (
              <ul className="space-y-2">
                {form.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-card p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-foreground">{d.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.kind}{d.number ? ` · ${d.number}` : ""}
                      </div>
                    </div>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-card-soft text-primary">
                        <ChevronRight size={16} />
                      </a>
                    )}
                    <button onClick={() => removeDoc(d.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "notas" && (
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-foreground">Observações clínicas</label>
            <textarea rows={10} value={form.observations ?? ""}
              onChange={(e) => set("observations", e.target.value)}
              placeholder="Histórico, restrições, medicamentos…"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
          </div>
        )}
      </div>

      {/* Barra flutuante de salvar */}
      {dirty && tab !== "docs" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-5">
          <div className="pointer-events-auto flex w-full max-w-[440px] items-center gap-2 rounded-2xl bg-card p-2"
            style={{ boxShadow: "0 16px 40px rgba(6,43,73,0.18)" }}>
            <SecondaryButton onClick={() => { setForm(patient.data ? { ...patient.data, documents: Array.isArray(patient.data.documents) ? patient.data.documents : [] } : form); setDirty(false); }}>
              Descartar
            </SecondaryButton>
            <PrimaryButton onClick={() => {
              const { id: _id, ...rest } = form;
              void _id;
              save.mutate(rest);
            }} disabled={save.isPending}>
              <Save size={14} className="mr-1" /> {save.isPending ? "Salvando…" : "Salvar"}
            </PrimaryButton>
          </div>
        </div>
      )}

      <DocSheet open={docOpen} onOpenChange={setDocOpen} onSave={addDoc} />
    </MobileShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-1.5 text-center backdrop-blur-sm">
      <div className="text-[15px] font-extrabold leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">{label}</div>
    </div>
  );
}

function ageFrom(iso: string) {
  const d = new Date(iso); const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function DocSheet({ open, onOpenChange, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSave: (d: { kind: string; label: string; number?: string; url?: string }) => void;
}) {
  const [f, setF] = useState({ kind: "RG", label: "", number: "", url: "" });
  const kinds = ["RG", "CPF", "CNH", "Convênio", "Laudo", "Exame", "Receita", "Outro"];
  useEffect(() => { if (open) setF({ kind: "RG", label: "", number: "", url: "" }); }, [open]);
  return (
    <ModalBottomSheet open={open} onOpenChange={onOpenChange} title="Anexar documento">
      <div className="space-y-1.5">
        <label className="text-[13px] font-semibold text-foreground">Tipo</label>
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button key={k} type="button" onClick={() => setF((s) => ({ ...s, kind: k, label: s.label || k }))}
              className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                f.kind === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>
              {k}
            </button>
          ))}
        </div>
      </div>
      <InputField label="Rótulo *" placeholder="Ex: RG frente, Carteirinha Unimed"
        value={f.label} onChange={(e) => setF((s) => ({ ...s, label: e.target.value }))} />
      <InputField label="Número" placeholder="Número do documento"
        value={f.number} onChange={(e) => setF((s) => ({ ...s, number: e.target.value }))} />
      <InputField label="Link (opcional)" placeholder="https://…"
        value={f.url} onChange={(e) => setF((s) => ({ ...s, url: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <SecondaryButton onClick={() => onOpenChange(false)}>Cancelar</SecondaryButton>
        <PrimaryButton onClick={() => {
          if (!f.label.trim()) { toast.error("Informe o rótulo"); return; }
          onSave({ kind: f.kind, label: f.label.trim(), number: f.number || undefined, url: f.url || undefined });
        }}>Salvar</PrimaryButton>
      </div>
    </ModalBottomSheet>
  );
}
