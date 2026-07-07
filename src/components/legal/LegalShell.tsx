import { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function LegalContent({ md, className }: { md: string; className?: string }) {
  return (
    <div className={cn(
      "prose prose-slate dark:prose-invert max-w-none",
      "prose-headings:font-semibold prose-headings:text-foreground",
      "prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-0",
      "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border prose-h2:pb-2",
      "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2",
      "prose-p:text-foreground/85 prose-p:leading-relaxed",
      "prose-li:text-foreground/85 prose-li:my-1",
      "prose-strong:text-foreground prose-strong:font-semibold",
      "prose-a:text-[#08C7BA] prose-a:no-underline hover:prose-a:underline",
      "prose-table:text-sm prose-th:bg-muted prose-th:text-foreground prose-td:text-foreground/85",
      "prose-hr:border-border",
      "prose-code:text-[#08C7BA] prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
      className,
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  );
}

export function LegalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F3F0] dark:bg-[#0a1622]">
      <header className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 md:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#08C7BA] to-[#00afa5] text-white text-sm font-bold shadow-[0_6px_20px_rgba(8,199,186,0.4)]">F</div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">FisioFlow</div>
              <div className="text-sm font-semibold text-foreground leading-tight">Documentos legais</div>
            </div>
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/politica-de-privacidade" className="text-foreground/70 hover:text-foreground">Privacidade</a>
            <a href="/termos-de-uso" className="text-foreground/70 hover:text-foreground">Termos</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 md:px-8 py-10">
        <article className="rounded-2xl border border-border bg-card p-6 md:p-10 shadow-[0_8px_24px_rgba(6,43,73,0.05)]">
          {children}
        </article>
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FisioFlow. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
