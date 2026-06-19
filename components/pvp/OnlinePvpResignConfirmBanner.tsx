"use client";

import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnlinePvpResignConfirmBannerProps = {
  labels: {
    title: string;
    message: string;
    confirm: string;
    cancel: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
};

export default function OnlinePvpResignConfirmBanner({
  labels,
  onConfirm,
  onCancel,
}: OnlinePvpResignConfirmBannerProps) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="pvp-resign-title"
      aria-describedby="pvp-resign-message"
      className="pvp-resign-banner w-full animate-in zoom-in-95 fade-in duration-300 rounded-xl border border-red-500/50 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-red-950/20 px-4 py-4 flex flex-col gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 rounded-full p-2 ring-1 bg-red-500/10 text-red-300 ring-red-400/30">
          <Flag className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 pt-0.5">
          <p id="pvp-resign-title" className="text-sm font-semibold text-slate-50 tracking-tight">
            {labels.title}
          </p>
          <p id="pvp-resign-message" className="text-xs text-slate-400 mt-1 leading-relaxed">
            {labels.message}
          </p>
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 border-slate-600/80 bg-slate-900/50"
          onClick={onCancel}
        >
          {labels.cancel}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-9"
          onClick={onConfirm}
        >
          {labels.confirm}
        </Button>
      </div>
    </div>
  );
}
