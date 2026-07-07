import { Check, ChevronDown, List as ListIcon } from "lucide-react";

export type PreviewButton = { text: string; id?: string };
export type PreviewListItem = { text: string; id?: string; description?: string };
export type PreviewListSection = { title: string; items: PreviewListItem[] };

type Props = {
  body: string;
  footer?: string | null;
  type?: "text" | "button" | "list";
  buttons?: PreviewButton[];
  listButtonText?: string | null;
  sections?: PreviewListSection[];
  sender?: string;
  now?: string;
};

function formatTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Mockup visual de mensagem no WhatsApp — usado no preview de templates.
 * Não é 100% fiel, mas dá noção real de layout: bolha, botões, lista.
 */
export function WhatsAppPreview({
  body,
  footer,
  type = "text",
  buttons = [],
  listButtonText,
  sections = [],
  sender = "FisioFlow",
  now,
}: Props) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-[#0b141a] shadow-inner">
      {/* Header WhatsApp */}
      <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-[#08C7BA] grid place-items-center text-white text-sm font-semibold">
          {sender.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{sender}</div>
          <div className="text-[10px] text-white/60">online</div>
        </div>
      </div>

      {/* Chat area com wallpaper leve */}
      <div
        className="p-4 min-h-[280px]"
        style={{
          backgroundColor: "#0b141a",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div className="flex justify-end">
          <div className="max-w-[85%] w-full">
            {/* Bolha principal (verde WhatsApp escuro) */}
            <div className="relative rounded-xl rounded-tr-none bg-[#005c4b] text-white px-3 py-2 shadow">
              <div className="whitespace-pre-line text-[13.5px] leading-relaxed">
                {body || <span className="italic text-white/60">Sem conteúdo…</span>}
              </div>
              {footer && (
                <div className="mt-1 text-[11px] text-white/60 italic">{footer}</div>
              )}
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/60">
                <span>{now ?? formatTime()}</span>
                <Check className="h-3 w-3" />
                <Check className="-ml-2 h-3 w-3 text-[#53bdeb]" />
              </div>
            </div>

            {/* Botões de resposta */}
            {type === "button" && buttons.filter((b) => b.text?.trim()).length > 0 && (
              <div className="mt-1 space-y-[2px]">
                {buttons
                  .filter((b) => b.text?.trim())
                  .slice(0, 3)
                  .map((b, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full rounded-b-none first:rounded-t-lg last:rounded-b-lg bg-[#1f2c33] text-[#53bdeb] text-[13px] font-medium py-2 px-3 hover:bg-[#26343b] transition"
                    >
                      {b.text}
                    </button>
                  ))}
              </div>
            )}

            {/* Lista (menu) */}
            {type === "list" && sections.filter((s) => s.title?.trim()).length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  className="w-full rounded-lg bg-[#1f2c33] text-[#53bdeb] text-[13px] font-medium py-2 px-3 hover:bg-[#26343b] transition flex items-center justify-center gap-2"
                >
                  <ListIcon className="h-4 w-4" />
                  {listButtonText || "Ver opções"}
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="mt-2 rounded-lg bg-[#1f2c33] divide-y divide-white/5 overflow-hidden">
                  {sections
                    .filter((s) => s.title?.trim())
                    .map((s, si) => (
                      <div key={si}>
                        <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-white/50 font-semibold">
                          {s.title}
                        </div>
                        {(s.items ?? [])
                          .filter((it) => it.text?.trim())
                          .map((it, ii) => (
                            <div key={ii} className="px-3 py-2 hover:bg-white/5">
                              <div className="text-[13px] text-white">{it.text}</div>
                              {it.description && (
                                <div className="text-[11px] text-white/60 mt-0.5">
                                  {it.description}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
