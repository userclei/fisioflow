import { cn } from "@/lib/utils";
import logoUrl from "@/assets/fisioflow-logo.png";

export function AppLogo({
  size = 52,
  showLabel = false,
  className,
}: {
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  // showLabel kept for API compat; logo already contains wordmark.
  void showLabel;
  return (
    <div className={cn("inline-flex items-center", className)}>
      <img
        src={logoUrl}
        alt="FisioFlow"
        style={{ height: size, width: "auto" }}
        className="select-none"
        draggable={false}
      />
    </div>
  );
}
