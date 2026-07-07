import { BookOpen, CalendarCheck, Database, Layers, ShieldCheck, Wallet } from "lucide-react";

const ITEMS = [
  { icon: BookOpen, label: "Estudos & casos" },
  { icon: CalendarCheck, label: "Agenda organizada" },
  { icon: Database, label: "Pacientes centralizados" },
  { icon: Wallet, label: "Financeiro claro" },
  { icon: Layers, label: "Simples de usar" },
  { icon: ShieldCheck, label: "Dados seguros" },
];

export function TrustBar() {
  return (
    <section className="border-y border-[color:rgba(240,222,218,0.7)] bg-card-soft/40 py-6">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <p className="text-center text-[13px] font-medium text-muted-foreground">
          Fisios organizados atendem mais, cobram sem esquecer e crescem mais rápido. Estudantes organizados tiram nota melhor. É simples assim.
        </p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {ITEMS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/12 text-primary">
                <Icon size={14} strokeWidth={2.4} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
