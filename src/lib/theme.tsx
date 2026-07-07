import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

type ThemeCtx = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "fisioflow.theme";

function getSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return "light" as const;
  const resolved = theme === "system" ? getSystem() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Theme | null) : null;
    const initial: Theme = stored ?? "light";
    setThemeState(initial);
    setResolved(apply(initial));

    if (initial === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => setResolved(apply("system"));
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    setResolved(apply(t));
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, t);
  }

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) return { theme: "system" as Theme, resolved: "light" as const, setTheme: () => {} };
  return v;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolved } = useTheme();
  const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const label = theme === "system" ? "Auto" : resolved === "dark" ? "Escuro" : "Claro";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Tema: ${label} (clique para alternar)`}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-accent",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
