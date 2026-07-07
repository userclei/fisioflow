import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ModalBottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-[480px] rounded-t-[28px] border-border bg-background p-0"
      >
        <div
          className="max-h-[88vh] overflow-y-auto px-5 pb-8 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <SheetHeader className="p-0">
            <SheetTitle className="text-center text-[17px] font-bold text-foreground">
              {title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-4">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
