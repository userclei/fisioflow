import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, X, Send, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GREETING: UIMessage = {
  id: "greeting",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "Oi! 👋 Sou a **Flow**, assistente do FisioFlow. Posso te contar sobre planos, recursos ou já iniciar seu atendimento no WhatsApp. Como posso ajudar?",
    },
  ],
};

function renderText(text: string) {
  // Markdown mínimo: **bold** e quebras de linha
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p}</span>
    ),
  );
}

export function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: "landing-flow",
    messages: [GREETING],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const busy = status === "submitted" || status === "streaming";

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <>
      {/* Bolinha flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat com a Flow"}
        className={cn(
          "fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_12px_32px_rgba(8,199,186,0.45)] transition-all",
          "bg-gradient-to-br from-[#08C7BA] to-[#0891A6] hover:scale-105 active:scale-95",
          open && "rotate-90",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full bg-[#08C7BA] opacity-40" />
        )}
      </button>

      {/* Painel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-5 z-[60] flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(6,43,73,0.28)]",
            "h-[min(560px,calc(100vh-8rem))] animate-in fade-in slide-in-from-bottom-4 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-[#062B49] to-[#0A3A5E] px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5 text-[#08C7BA]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Flow — Assistente IA</div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online agora
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#F6F3F0]/60 p-4 dark:bg-[#0a1622]/60">
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Flow está digitando…
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                Não consegui responder agora. Tente novamente em instantes.
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-background p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Escreva sua mensagem…"
                className="max-h-28 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-[#08C7BA] focus:ring-2 focus:ring-[#08C7BA]/20"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={busy || !input.trim()}
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition",
                  busy || !input.trim()
                    ? "bg-muted-foreground/30 cursor-not-allowed"
                    : "bg-gradient-to-br from-[#08C7BA] to-[#0891A6] hover:brightness-110 active:scale-95",
                )}
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              Ao conversar você concorda com nossa política de privacidade.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter((p) => p.type === "text") as { type: "text"; text: string }[];
  const toolParts = message.parts.filter((p) => p.type?.startsWith("tool-")) as Array<{
    type: string;
    toolName?: string;
    state?: string;
    output?: unknown;
  }>;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-1.5")}>
        {textParts.length > 0 && (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
              isUser
                ? "bg-gradient-to-br from-[#08C7BA] to-[#0891A6] text-white rounded-br-sm"
                : "bg-white text-foreground rounded-bl-sm dark:bg-[#0f2033]",
            )}
          >
            {textParts.map((p, i) => (
              <div key={i}>{renderText(p.text)}</div>
            ))}
          </div>
        )}
        {toolParts.map((tp, i) => {
          const name = tp.toolName ?? tp.type?.replace(/^tool-/, "") ?? "ação";
          const done = tp.state === "output-available" || tp.state === "result";
          const label =
            name === "capture_lead"
              ? "Dados registrados"
              : name === "send_whatsapp"
                ? "Mensagem enviada no WhatsApp"
                : `Ação: ${name}`;
          const out = tp.output as { ok?: boolean } | undefined;
          const ok = out?.ok !== false;
          return (
            <div
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                done && ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {done && ok ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
