"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-context";
import { APP_BUILD, APP_NAME, APP_VERSION } from "@/lib/app-version";

export default function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const copy = t.navigation.about;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-bg-secondary max-w-sm border-slate-700">
        <DialogHeader className="items-center text-center sm:text-center">
          <Image
            src="/knight-logo.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-2"
            unoptimized
          />
          <DialogTitle className="text-cyan-300">{copy.title}</DialogTitle>
          <DialogDescription>{copy.tagline}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-500">{copy.version}</dt>
            <dd className="font-mono text-slate-100">{APP_VERSION}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-500">{copy.build}</dt>
            <dd className="font-mono text-cyan-200" title={APP_NAME}>
              {APP_BUILD}
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
