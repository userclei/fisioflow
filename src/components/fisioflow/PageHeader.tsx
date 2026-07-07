import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  backTo = "/home",
  right,
}: {
  title: string;
  backTo?: string | false;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-5 pb-4 pt-5">
      <div className="w-10">
        {backTo ? (
          <Link
            to={backTo}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 text-primary transition-colors hover:bg-primary/10"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </Link>
        ) : null}
      </div>
      <h1 className="text-[18px] font-bold leading-6 tracking-tight text-foreground">
        {title}
      </h1>
      <div className="flex w-10 justify-end">{right}</div>
    </header>
  );
}
