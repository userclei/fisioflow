import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/fisioflow/EmptyState";
import { FloatingActionButton } from "@/components/fisioflow/FloatingActionButton";
import { InputField } from "@/components/fisioflow/InputField";
import { MobileShell } from "@/components/fisioflow/MobileShell";
import { ModalBottomSheet } from "@/components/fisioflow/ModalBottomSheet";
import { PageHeader } from "@/components/fisioflow/PageHeader";
import { PrimaryButton, SecondaryButton } from "@/components/fisioflow/PrimaryButton";
import { deleteBookingLink, listBookingLinks, upsertBookingLink } from "@/lib/booking.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/agendamentos-link")({
  ssr: false,
  head: () => ({ meta: [{ title: "Links de agendamento — FisioFlow" }] }),
  component: Page,
});

const DAYS = ["D","S","T","Q","Q","S","S"];

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listBookingLinks);
  const del = useServerFn(deleteBookingLink);
  const { data = [], isLoading } = useQuery({ queryKey: ["booking_links"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["booking_links"] }); },
  });

  function copy(slug: string) {
    const url = `${window.location.origin}/agendar/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <MobileShell>
      <PageHeader title="Links de agendamento" backTo="/configuracoes" />
      <div className="px-5">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={Link2} title="Nenhum link ainda"
            description="Crie um link, envie pra pessoa e ela escolhe o horário."
            action={<PrimaryButton onClick={() => { setEditing(null); setOpen(true); }}>Criar link</PrimaryButton>} />
        ) : (
          <ul className="space-y-2">
            {data.map((l: any) => (
              <li key={l.id} className="rounded-2xl bg-card p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground">{l.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground truncate">/agendar/{l.slug}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {l.duration_min}min · {l.start_time.slice(0,5)}–{l.end_time.slice(0,5)}
                      {" · "}{l.active ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                  <button onClick={() => copy(l.slug)} className="rounded-full bg-primary/10 p-2 text-primary" aria-label="Copiar">
                    <Copy size={16} />
                  </button>
                  <button onClick={() => remove.mutate(l.id)} className="rounded-full bg-destructive/10 p-2 text-destructive" aria-label="Remover">
                    <Trash2 size={16} />
                  </button>
                </div>
                <button onClick={() => { setEditing(l); setOpen(true); }}
                  className="mt-2 w-full rounded-xl bg-card-soft py-2 text-[12px] font-semibold text-foreground">
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <FloatingActionButton onClick={() => { setEditing(null); setOpen(true); }} aria-label="Novo link">
        <Plus size={24} strokeWidth={2.4} />
      </FloatingActionButton>
      <LinkSheet open={open} onOpenChange={setOpen} editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["booking_links"] })} />
    </MobileShell>
  );
}

function LinkSheet({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: any; onSaved: () => void;
}) {
  const upsert = useServerFn(upsertBookingLink);
  const isEdit = !!editing;
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [title, setTitle] = useState(editing?.title ?? "Reunião");
  const [duration, setDuration] = useState(String(editing?.duration_min ?? 30));
  const [buffer, setBuffer] = useState(String(editing?.buffer_min ?? 0));
  const [start, setStart] = useState(editing?.start_time?.slice(0,5) ?? "09:00");
  const [end, setEnd] = useState(editing?.end_time?.slice(0,5) ?? "18:00");
  const [days, setDays] = useState<number[]>(editing?.working_days ?? [1,2,3,4,5]);
  const [active, setActive] = useState<boolean>(editing?.active ?? true);
  const [description, setDescription] = useState(editing?.description ?? "");

  // reset when editing changes
  useState(() => {}); // noop

  const save = useMutation({
    mutationFn: () => upsert({ data: {
      id: editing?.id, slug: slug.trim().toLowerCase(), title, description,
      duration_min: Number(duration), buffer_min: Number(buffer),
      working_days: days, start_time: start, end_time: end, active,
    }}),
    onSuccess: () => { toast.success(isEdit ? "Atualizado" : "Criado"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <ModalBottomSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar link" : "Novo link"}>
      <div className="space-y-3">
        <InputField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <InputField label="Slug (URL)" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="reuniao-30min" />
        <InputField label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Duração (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <InputField label="Intervalo (min)" type="number" value={buffer} onChange={(e) => setBuffer(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Início" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <InputField label="Fim" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-foreground">Dias da semana</label>
          <div className="flex gap-1.5">
            {DAYS.map((d, i) => {
              const on = days.includes(i);
              return (
                <button key={i} type="button" onClick={() => setDays(on ? days.filter(x=>x!==i) : [...days,i].sort())}
                  className={cn("h-9 flex-1 rounded-xl text-[13px] font-semibold",
                    on ? "bg-primary text-primary-foreground" : "bg-card-soft text-muted-foreground")}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Ativo
        </label>
        <div className="flex gap-2 pt-2">
          <SecondaryButton onClick={() => onOpenChange(false)}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </PrimaryButton>
        </div>
      </div>
    </ModalBottomSheet>
  );
}
