import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
};

export const InputField = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, icon, rightSlot, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="space-y-2">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold leading-[16px] tracking-tight text-foreground/80"
          >
            {label}
          </label>
        ) : null}
        <div className="group relative flex items-center">
          {icon ? (
            <div className="pointer-events-none absolute left-4 z-10 flex h-full items-center text-muted-foreground/70 transition-colors group-focus-within:text-primary">
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            {...rest}
            className={cn(
              "peer h-12 w-full rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(6,43,73,0.04)] text-[14.5px] text-foreground placeholder:text-muted-foreground/60 transition-all duration-200",
              "hover:border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 focus:shadow-[0_4px_20px_-8px_rgba(8,199,186,0.35)]",
              icon ? "pl-11" : "pl-4",
              rightSlot ? "pr-11" : "pr-4",
              className,
            )}
          />
          {rightSlot ? (
            <div className="absolute right-1.5 z-10 flex h-full items-center">
              {rightSlot}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
InputField.displayName = "InputField";

type PasswordProps = Omit<FieldProps, "type" | "rightSlot">;

export function PasswordField(props: PasswordProps) {
  const [visible, setVisible] = useState(false);
  return (
    <InputField
      {...props}
      type={visible ? "text" : "password"}
      rightSlot={
        <button
          type="button"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          {visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      }
    />
  );
}
