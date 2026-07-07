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
    <div className="min-h-screen w-full bg-background">
      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background",
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
