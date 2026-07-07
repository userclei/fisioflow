import type { LucideIcon } from "lucide-react";
import { MobileShell } from "./MobileShell";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "./EmptyState";
import { PrimaryButton } from "./PrimaryButton";
import { toast } from "sonner";

export function PlaceholderScreen({
  title,
  icon,
  emptyTitle,
  description,
  actionLabel,
  withBottomNav = true,
  backTo = "/home" as const,
}: {
  title: string;
  icon: LucideIcon;
  emptyTitle: string;
  description: string;
  actionLabel?: string;
  withBottomNav?: boolean;
  backTo?: string | false;
}) {
  return (
    <MobileShell withBottomNav={withBottomNav}>
      <PageHeader title={title} backTo={backTo} />
      <div className="flex flex-1 flex-col px-5">
        <EmptyState
          icon={icon}
          title={emptyTitle}
          description={description}
          action={
            actionLabel ? (
              <PrimaryButton
                onClick={() => toast("Funcionalidade em desenvolvimento")}
              >
                {actionLabel}
              </PrimaryButton>
            ) : undefined
          }
        />
      </div>
    </MobileShell>
  );
}
