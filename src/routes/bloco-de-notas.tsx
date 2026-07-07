import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bell, Copy, LayoutGrid, List, KanbanSquare, Pin, PinOff, Plus,
  Search, Sparkles, Star, StickyNote as StickyNoteIcon, Trash2, Archive,
  ArchiveRestore, User as UserIcon, X, CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/fisioflow/EmptyState";
import { FilterPill } from "@/components/fisioflow/FilterPill";
import { FloatingActionButton } from "@/components/fisioflow/FloatingActionButton";
import { InputField } from "@/components/fisioflow/InputField";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useWorkspace } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bloco-de-notas")({
  head: () => ({
    meta: [
      { title: "Bloco de Notas — FisioFlow" },
      { name: "description", content: "Post-its digitais para lembretes, ideias e anotações rápidas." },
    ],
  }),
  component: BlocoNotasPage,
});

/* ---------- constants ---------- */

type Color = "yellow" | "green" | "blue" | "pink" | "purple" | "white";
type Category = "geral" | "paciente" | "financeiro" | "agenda" | "tarefa" | "ideia" | "urgente";
type Priority = "low" | "medium" | "high" | "urgent";
type ViewStatus = "ideias" | "a_fazer" | "em_andamento" | "concluido" | "arquivado";
type Visibility = "private" | "workspace";

type StickyNote = {
  id: string;
  workspace_id: string;
  user_id: string;
  patient_id: string | null;
  title: string;
  content: string;
  category: Category;
  color: Color;
  priority: Priority;
  is_pinned: boolean;
  is_important: boolean;
  is_archived: boolean;
  reminder_at: string | null;
  view_status: ViewStatus;
  position: number;
  tags: string[];
  visibility: Visibility;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const COLOR_BG: Record<Color, string> = {
  yellow: "#FFF4C2",
  green: "#DDF8EF",
  blue: "#DDEEFF",
  pink: "#FFE1E8",
  purple: "#EEE4FF",
  white: "#FFFFFF",
};

const CATEGORY_LABEL: Record<Category, string> = {
  geral: "Geral",
  paciente: "Paciente",
  financeiro: "Financeiro",
  agenda: "Agenda",
  tarefa: "Tarefa",
  ideia: "Ideia",
  urgente: "Urgente",
};

const CATEGORY_DEFAULT_COLOR: Record<Category, Color> = {
  geral: "white",
  paciente: "blue",
  financeiro: "green",
  agenda: "purple",
  tarefa: "yellow",
  ideia: "pink",
  urgente: "pink",
};

const PRIORITY_STYLE: Record<Priority, { label: string; className: string }> = {
  low:    { label: "Baixa",   className: "bg-success/15 text-success" },
  medium: { label: "Média",   className: "bg-[#FFF4C2] text-[#7a5a00]" },
  high:   { label: "Alta",    className: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

const VIEW_STATUS_LABEL: Record<ViewStatus, string> = {
  ideias: "Ideias",
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const FILTERS = [
  "Todas", "Fixadas", "Hoje", "Importantes",
  "Pacientes", "Financeiro", "Tarefas", "Arquivadas",
] as const;
type Filter = typeof FILTERS[number];

type ViewMode = "mural" | "kanban" | "lista";

/* ---------- helpers ---------- */

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function formatShortDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return "Hoje";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function rotationFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return ((h % 21) - 10) / 10; // -1.0 .. 1.0 deg
}

/* ---------- page ---------- */

function BlocoNotasPage() {
  const { user } = useSession();
  const ws = useWorkspace(user);
  const qc = useQueryClient();
  const wsId = ws.data?.workspaceId;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Todas");
  const [view, setView] = useState<ViewMode>("mural");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StickyNote | null>(null);

  const notes = useQuery({
    queryKey: ["sticky_notes", wsId],
    enabled: !!wsId,
    queryFn: async (): Promise<StickyNote[]> => {
      const { data, error } = await supabase
        .from("sticky_notes")
        .select("*")
        .is("deleted_at", null)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StickyNote[];
    },
  });

  const patients = useQuery({
    queryKey: ["patients-min", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const patientMap = useMemo(
    () => Object.fromEntries((patients.data ?? []).map((p) => [p.id, p.full_name])),
    [patients.data],
  );

  const filtered = useMemo(() => {
    const items = notes.data ?? [];
    const today = new Date();
    return items.filter((n) => {
      // filter pills
      switch (filter) {
        case "Fixadas":    if (!n.is_pinned) return false; break;
        case "Hoje":       if (!n.reminder_at || !isSameDay(new Date(n.reminder_at), today)) return false; break;
        case "Importantes":if (!n.is_important) return false; break;
        case "Pacientes":  if (n.category !== "paciente") return false; break;
        case "Financeiro": if (n.category !== "financeiro") return false; break;
        case "Tarefas":    if (n.category !== "tarefa") return false; break;
        case "Arquivadas": if (!n.is_archived) return false; break;
        case "Todas":      if (n.is_archived) return false; break;
      }
      if (query) {
        const q = query.toLowerCase();
        const patientName = n.patient_id ? (patientMap[n.patient_id] ?? "").toLowerCase() : "";
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          CATEGORY_LABEL[n.category].toLowerCase().includes(q) ||
          patientName.includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notes.data, filter, query, patientMap]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sticky_notes", wsId] });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<StickyNote> & { id?: string }) => {
      if (!wsId || !user) throw new Error("Sem workspace");
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("sticky_notes").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sticky_notes").insert({
          workspace_id: wsId,
          user_id: user.id,
          created_by: user.id,
          title: payload.title ?? "",
          content: payload.content ?? "",
          category: payload.category ?? "geral",
          color: payload.color ?? "yellow",
          priority: payload.priority ?? "medium",
          patient_id: payload.patient_id ?? null,
          reminder_at: payload.reminder_at ?? null,
          is_pinned: payload.is_pinned ?? false,
          is_important: payload.is_important ?? false,
          tags: payload.tags ?? [],
          visibility: payload.visibility ?? "private",
          view_status: payload.view_status ?? "ideias",
        });
        if (error) throw error;
      }
    },
    onSuccess: (_r, vars) => {
      invalidate();
      toast.success(vars.id ? "Anotação atualizada" : "Anotação criada");
      setCreateOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<StickyNote> }) => {
      const { error } = await supabase.from("sticky_notes").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sticky_notes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setDetailsId(null); toast.success("Anotação excluída"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const duplicate = useMutation({
    mutationFn: async (n: StickyNote) => {
      if (!wsId || !user) throw new Error("Sem workspace");
      const { error } = await supabase.from("sticky_notes").insert({
        workspace_id: wsId,
        user_id: user.id,
        created_by: user.id,
        title: n.title + " (cópia)",
        content: n.content,
        category: n.category,
        color: n.color,
        priority: n.priority,
        patient_id: n.patient_id,
        reminder_at: n.reminder_at,
        is_pinned: false,
        is_important: n.is_important,
        tags: n.tags,
        visibility: n.visibility,
        view_status: n.view_status,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Anotação duplicada"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const toTask = useMutation({
    mutationFn: async (n: StickyNote) => {
      if (!wsId || !user) throw new Error("Sem workspace");
      const noteToTaskPriority: Record<Priority, "low" | "medium" | "high"> = {
        low: "low", medium: "medium", high: "high", urgent: "high",
      };
      const { error } = await supabase.from("tasks").insert({
        workspace_id: wsId,
        created_by: user.id,
        title: n.title,
        description: n.content || null,
        priority: noteToTaskPriority[n.priority],
        patient_id: n.patient_id,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Nota transformada em tarefa."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar tarefa"),
  });

  const detailsNote = filtered.find((n) => n.id === detailsId) ?? notes.data?.find((n) => n.id === detailsId) ?? null;

  return (
    <MobileShell>
      <PageHeader title="Bloco de Notas" backTo="/home" />

      <div className="px-5">
        <p className="-mt-1 mb-3 text-center text-[12.5px] text-muted-foreground">
          Seus lembretes rápidos em um só lugar.
        </p>
        <InputField
          name="search" placeholder="Buscar anotação..." icon={<Search size={18} />}
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <FilterPill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 px-5">
        <ViewButton active={view === "mural"} onClick={() => setView("mural")} icon={<LayoutGrid size={14} />} label="Mural" />
        <ViewButton active={view === "kanban"} onClick={() => setView("kanban")} icon={<KanbanSquare size={14} />} label="Kanban" />
        <ViewButton active={view === "lista"} onClick={() => setView("lista")} icon={<List size={14} />} label="Lista" />
      </div>

      <div className="mt-4 pb-24">
        {notes.isLoading ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5">
            <EmptyState
              icon={StickyNoteIcon}
              title={(notes.data?.length ?? 0) === 0 ? "Nenhuma anotação ainda" : "Nada encontrado"}
              description={(notes.data?.length ?? 0) === 0
                ? "Crie seu primeiro post-it para organizar lembretes, ideias e pendências."
                : "Ajuste os filtros ou a busca"}
              action={<PrimaryButton onClick={() => { setEditing(null); setCreateOpen(true); }}>Criar anotação</PrimaryButton>}
            />
          </div>
        ) : view === "mural" ? (
          <MuralGrid notes={filtered} patientMap={patientMap} onOpen={setDetailsId} />
        ) : view === "lista" ? (
          <ListView notes={filtered} patientMap={patientMap} onOpen={setDetailsId} />
        ) : (
          <KanbanView
            notes={filtered}
            patientMap={patientMap}
            onOpen={setDetailsId}
            onMove={(id, view_status) => patch.mutate({ id, changes: { view_status, is_archived: view_status === "arquivado" } })}
          />
        )}
      </div>

      <FloatingActionButton onClick={() => { setEditing(null); setCreateOpen(true); }} aria-label="Nova anotação">
        <Plus size={22} strokeWidth={2.4} />
      </FloatingActionButton>

      <NoteFormSheet
        open={createOpen || !!editing}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditing(null); } }}
        initial={editing}
        patients={patients.data ?? []}
        saving={upsert.isPending}
        onSave={(payload) => upsert.mutate(editing ? { ...payload, id: editing.id } : payload)}
      />

      <NoteDetailsSheet
        note={detailsNote}
        patientName={detailsNote?.patient_id ? patientMap[detailsNote.patient_id] : undefined}
        onOpenChange={(v) => { if (!v) setDetailsId(null); }}
        onEdit={(n) => { setDetailsId(null); setEditing(n); }}
        onTogglePin={(n) => patch.mutate({ id: n.id, changes: { is_pinned: !n.is_pinned } })}
        onToggleImportant={(n) => patch.mutate({ id: n.id, changes: { is_important: !n.is_important } })}
        onToggleArchive={(n) => patch.mutate({ id: n.id, changes: { is_archived: !n.is_archived, view_status: !n.is_archived ? "arquivado" : "ideias" } })}
        onDuplicate={(n) => duplicate.mutate(n)}
        onDelete={(n) => { if (confirm("Deseja excluir esta anotação?")) softDelete.mutate(n.id); }}
        onToTask={(n) => toTask.mutate(n)}
      />
    </MobileShell>
  );
}

/* ---------- view atoms ---------- */

function ViewButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground"
               : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {icon} {label}
    </button>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#062B49]/70">
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function PostItCard({
  note, patientName, onClick, compact,
}: { note: StickyNote; patientName?: string; onClick: () => void; compact?: boolean }) {
  const rot = rotationFor(note.id);
  return (
    <button
      onClick={onClick}
      className="group relative block w-full text-left transition-all duration-200 will-change-transform hover:-translate-y-1"
      style={{
        transform: `rotate(${rot}deg)`,
      }}
    >
      <div
        className="rounded-[18px] p-4 shadow-[0_6px_18px_rgba(6,43,73,0.08)] transition-shadow group-hover:shadow-[0_14px_30px_rgba(6,43,73,0.14)]"
        style={{ background: COLOR_BG[note.color], color: "#062B49" }}
      >
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge category={note.category} />
          <div className="flex items-center gap-1.5 text-[#062B49]/70">
            {note.is_important && <Star size={14} fill="currentColor" strokeWidth={0} />}
            {note.reminder_at && <Bell size={13} />}
            {note.is_pinned && <Pin size={13} fill="currentColor" strokeWidth={0} />}
          </div>
        </div>
        <h3 className="mt-2 text-[14.5px] font-bold leading-tight">{note.title || "Sem título"}</h3>
        {note.content && (
          <p className={cn(
            "mt-1 whitespace-pre-wrap text-[12.5px] leading-[18px] text-[#5F5A66]",
            compact ? "line-clamp-3" : "line-clamp-6",
          )}>
            {note.content}
          </p>
        )}
        {note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-medium text-[#062B49]/75">
                #{t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#5F5A66]">
          <span className="inline-flex items-center gap-1">
            {patientName && <><UserIcon size={11} /> {patientName}</>}
          </span>
          <span>{formatShortDate(note.updated_at)}</span>
        </div>
      </div>
    </button>
  );
}

function MuralGrid({
  notes, patientMap, onOpen,
}: { notes: StickyNote[]; patientMap: Record<string, string>; onOpen: (id: string) => void }) {
  return (
    <div className="columns-1 gap-3 px-5 sm:columns-2 md:columns-3 lg:columns-4">
      {notes.map((n) => (
        <div key={n.id} className="mb-3 break-inside-avoid">
          <PostItCard note={n} patientName={n.patient_id ? patientMap[n.patient_id] : undefined} onClick={() => onOpen(n.id)} />
        </div>
      ))}
    </div>
  );
}

function ListView({
  notes, patientMap, onOpen,
}: { notes: StickyNote[]; patientMap: Record<string, string>; onOpen: (id: string) => void }) {
  return (
    <ul className="space-y-2 px-5">
      {notes.map((n) => (
        <li key={n.id}>
          <button
            onClick={() => onOpen(n.id)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left transition-transform active:scale-[0.99]"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <span
              className="h-10 w-2.5 shrink-0 rounded-full"
              style={{ background: COLOR_BG[n.color] }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {n.is_pinned && <Pin size={12} className="text-primary" fill="currentColor" strokeWidth={0} />}
                <div className="truncate text-[14px] font-semibold text-foreground">{n.title || "Sem título"}</div>
              </div>
              <div className="truncate text-[12px] text-muted-foreground">
                {CATEGORY_LABEL[n.category]}
                {n.patient_id ? ` · ${patientMap[n.patient_id] ?? "Paciente"}` : ""}
                {" · "}{formatShortDate(n.updated_at)}
              </div>
            </div>
            {n.is_important && <Star size={14} className="text-yellow-500" fill="currentColor" strokeWidth={0} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

const KANBAN_COLS: ViewStatus[] = ["ideias", "a_fazer", "em_andamento", "concluido", "arquivado"];

function KanbanView({
  notes, patientMap, onOpen, onMove,
}: {
  notes: StickyNote[]; patientMap: Record<string, string>;
  onOpen: (id: string) => void; onMove: (id: string, status: ViewStatus) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto px-5">
      {KANBAN_COLS.map((col) => {
        const colNotes = notes.filter((n) => n.view_status === col);
        return (
          <div key={col} className="w-[260px] shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                {VIEW_STATUS_LABEL[col]}
              </h4>
              <span className="text-[11px] text-muted-foreground">{colNotes.length}</span>
            </div>
            <div className="space-y-2 rounded-2xl bg-card-soft/60 p-2 min-h-[120px]">
              {colNotes.map((n) => (
                <div key={n.id} className="space-y-1">
                  <PostItCard note={n} patientName={n.patient_id ? patientMap[n.patient_id] : undefined} onClick={() => onOpen(n.id)} compact />
                  <div className="flex gap-1 overflow-x-auto">
                    {KANBAN_COLS.filter((c) => c !== col).map((c) => (
                      <button
                        key={c}
                        onClick={() => onMove(n.id, c)}
                        className="rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:text-primary"
                      >
                        → {VIEW_STATUS_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {colNotes.length === 0 && (
                <p className="py-4 text-center text-[11px] text-muted-foreground">Vazio</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- form sheet ---------- */

const COLORS: Color[] = ["yellow", "green", "blue", "pink", "purple", "white"];
const CATEGORIES: Category[] = ["geral", "paciente", "financeiro", "agenda", "tarefa", "ideia", "urgente"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

function NoteFormSheet({
  open, onOpenChange, initial, patients, saving, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: StickyNote | null;
  patients: { id: string; full_name: string }[];
  saving: boolean;
  onSave: (payload: Partial<StickyNote>) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("geral");
  const [color, setColor] = useState<Color>("yellow");
  const [priority, setPriority] = useState<Priority>("medium");
  const [patientId, setPatientId] = useState<string>("");
  const [reminderDate, setReminderDate] = useState<string>("");
  const [reminderTime, setReminderTime] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [pinned, setPinned] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("private");

  // reset on open
  const [openedKey, setOpenedKey] = useState<string>("");
  const key = (initial?.id ?? "new") + String(open);
  if (open && key !== openedKey) {
    setOpenedKey(key);
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setCategory(initial?.category ?? "geral");
    setColor(initial?.color ?? "yellow");
    setPriority(initial?.priority ?? "medium");
    setPatientId(initial?.patient_id ?? "");
    if (initial?.reminder_at) {
      const d = new Date(initial.reminder_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setReminderDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setReminderTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setReminderDate(""); setReminderTime("");
    }
    setTagsInput((initial?.tags ?? []).join(", "));
    setPinned(initial?.is_pinned ?? false);
    setVisibility(initial?.visibility ?? "private");
  }

  function handleCategory(c: Category) {
    setCategory(c);
    if (!initial) setColor(CATEGORY_DEFAULT_COLOR[c]);
  }

  function submit() {
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    let reminder_at: string | null = null;
    if (reminderDate) {
      const t = reminderTime || "09:00";
      reminder_at = new Date(`${reminderDate}T${t}:00`).toISOString();
    }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({
      title: title.trim(),
      content: content.trim(),
      category, color, priority,
      patient_id: patientId || null,
      reminder_at,
      tags,
      is_pinned: pinned,
      visibility,
    });
  }

  return (
    <ModalBottomSheet open={open} onOpenChange={onOpenChange} title={initial ? "Editar anotação" : "Nova anotação"}>
      <div className="space-y-4">
        <InputField
          name="title" label="Título" placeholder="Ex: Retorno do paciente João"
          value={title} onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Conteúdo</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sua anotação aqui..."
            rows={4}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-[14px] text-foreground outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c} type="button" onClick={() => handleCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  category === c ? "border-primary bg-primary text-primary-foreground"
                                 : "border-border bg-card text-muted-foreground",
                )}
              >{CATEGORY_LABEL[c]}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Cor do post-it</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c} type="button" onClick={() => setColor(c)}
                aria-label={c}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-transform",
                  color === c ? "border-primary scale-110" : "border-border",
                )}
                style={{ background: COLOR_BG[c] }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Prioridade</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p} type="button" onClick={() => setPriority(p)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all",
                  priority === p ? PRIORITY_STYLE[p].className + " ring-2 ring-primary"
                                 : "bg-card text-muted-foreground border border-border",
                )}
              >{PRIORITY_STYLE[p].label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">
            Paciente vinculado {category === "paciente" && <span className="text-primary">(sugerido)</span>}
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-[14px] text-foreground outline-none focus:border-primary"
          >
            <option value="">Nenhum</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Lembrete (data)</label>
            <input
              type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-[14px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Hora</label>
            <input
              type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-[14px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <InputField
          name="tags" label="Tags (separadas por vírgula)" placeholder="ex: retorno, urgente"
          value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
        />

        <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Pin size={16} /> Fixar no topo
          </div>
          <button
            type="button" onClick={() => setPinned((v) => !v)}
            className={cn("h-6 w-11 rounded-full transition-colors", pinned ? "bg-primary" : "bg-border")}
          >
            <span className={cn("block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform", pinned && "translate-x-5")} />
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">Visibilidade</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setVisibility("private")}
              className={cn("rounded-2xl border px-3 py-2.5 text-[12.5px] font-semibold",
                visibility === "private" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>
              Privada
            </button>
            <button type="button" onClick={() => setVisibility("workspace")}
              className={cn("rounded-2xl border px-3 py-2.5 text-[12.5px] font-semibold",
                visibility === "workspace" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>
              Equipe
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <SecondaryButton onClick={() => onOpenChange(false)}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : (initial ? "Salvar" : "Criar anotação")}
          </PrimaryButton>
        </div>
      </div>
    </ModalBottomSheet>
  );
}

/* ---------- details sheet ---------- */

function NoteDetailsSheet({
  note, patientName, onOpenChange,
  onEdit, onTogglePin, onToggleImportant, onToggleArchive, onDuplicate, onDelete, onToTask,
}: {
  note: StickyNote | null;
  patientName?: string;
  onOpenChange: (v: boolean) => void;
  onEdit: (n: StickyNote) => void;
  onTogglePin: (n: StickyNote) => void;
  onToggleImportant: (n: StickyNote) => void;
  onToggleArchive: (n: StickyNote) => void;
  onDuplicate: (n: StickyNote) => void;
  onDelete: (n: StickyNote) => void;
  onToTask: (n: StickyNote) => void;
}) {
  if (!note) return null;
  const Action = ({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left text-[13.5px] font-semibold transition-colors",
        danger ? "text-red-600 hover:bg-red-50" : "text-foreground hover:bg-card-soft",
      )}
    >
      <span className={danger ? "text-red-500" : "text-primary"}>{icon}</span>
      {label}
    </button>
  );

  return (
    <ModalBottomSheet open={!!note} onOpenChange={onOpenChange} title="Detalhes">
      <div className="space-y-4">
        <div
          className="rounded-[18px] p-4 shadow-[0_6px_18px_rgba(6,43,73,0.08)]"
          style={{ background: COLOR_BG[note.color], color: "#062B49" }}
        >
          <div className="flex items-start justify-between gap-2">
            <CategoryBadge category={note.category} />
            <div className="flex items-center gap-1.5 text-[#062B49]/70">
              {note.is_important && <Star size={14} fill="currentColor" strokeWidth={0} />}
              {note.reminder_at && <Bell size={13} />}
              {note.is_pinned && <Pin size={13} fill="currentColor" strokeWidth={0} />}
            </div>
          </div>
          <h3 className="mt-2 text-[16px] font-bold">{note.title}</h3>
          {note.content && <p className="mt-1 whitespace-pre-wrap text-[13px] text-[#5F5A66]">{note.content}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#5F5A66]">
            <span className={cn("rounded-full px-2 py-0.5 font-bold", PRIORITY_STYLE[note.priority].className)}>
              {PRIORITY_STYLE[note.priority].label}
            </span>
            {patientName && <span className="inline-flex items-center gap-1"><UserIcon size={11} />{patientName}</span>}
            <span>· {formatShortDate(note.updated_at)}</span>
            {note.reminder_at && <span>· lembrete {new Date(note.reminder_at).toLocaleString("pt-BR")}</span>}
          </div>
          {note.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {note.tags.map((t) => (
                <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10.5px] font-medium text-[#062B49]/75">#{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Action icon={<Sparkles size={16} />} label="Editar" onClick={() => onEdit(note)} />
          <Action
            icon={note.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
            label={note.is_pinned ? "Desfixar" : "Fixar"}
            onClick={() => onTogglePin(note)}
          />
          <Action icon={<Star size={16} />} label={note.is_important ? "Remover importante" : "Marcar importante"} onClick={() => onToggleImportant(note)} />
          <Action icon={<Copy size={16} />} label="Duplicar" onClick={() => onDuplicate(note)} />
          <Action
            icon={note.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            label={note.is_archived ? "Desarquivar" : "Arquivar"}
            onClick={() => onToggleArchive(note)}
          />
          <Action icon={<CheckSquare size={16} />} label="Virar tarefa" onClick={() => onToTask(note)} />
        </div>

        <div className="pt-1">
          <button
            onClick={() => onDelete(note)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13.5px] font-semibold text-red-600"
          >
            <Trash2 size={16} /> Excluir anotação
          </button>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="mx-auto mt-1 flex items-center gap-1 text-[12px] text-muted-foreground"
        >
          <X size={14} /> Fechar
        </button>
      </div>
    </ModalBottomSheet>
  );
}
