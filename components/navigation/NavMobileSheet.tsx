"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NavMobileSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed bottom-0 left-0 top-auto max-h-[85vh] w-full max-w-full translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-slate-700 bg-slate-950/98 p-0 sm:max-w-full"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-slate-800 px-4 py-3 text-left">
          <DialogTitle className="text-base text-cyan-300">{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-4 py-3 max-h-[calc(85vh-4rem)]">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
