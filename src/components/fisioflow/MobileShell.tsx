import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/auth";
import { BottomNavigation } from "./BottomNavigation";

export function MobileShell({
  children,
  withBottomNav = true,
  className,
}: {
  children: ReactNode;
  withBottomNav?: boolean;
  className?: string;
}) {
  useRequireAuth();
  return (
    <div className="min-h-screen w-full bg-muted/40 dark:bg-background">
      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background md:my-6 md:min-h-[calc(100vh-3rem)] md:rounded-[32px] md:border md:border-border md:shadow-[0_30px_80px_-20px_rgba(6,43,73,0.25)] md:overflow-hidden",
          className,
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: withBottomNav
            ? "calc(env(safe-area-inset-bottom) + 96px)"
            : "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </div>
      {withBottomNav ? <BottomNavigation /> : null}
    </div>
  );
}
