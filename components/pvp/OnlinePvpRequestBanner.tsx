"use client";

import { Handshake, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PvpIncomingRequest =
  | { kind: "draw"; fromLabel: string }
  | { kind: "takeback"; fromLabel: string };

type OnlinePvpRequestBannerProps = {
  request: PvpIncomingRequest | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
  labels: {
    drawTitle: string;
    takebackTitle: string;
    accept: string;
    decline: string;
    dismiss: string;
  };
};

export default function OnlinePvpRequestBanner({
  request,
  onAccept,
  onDecline,
  onDismiss,
  labels,
}: OnlinePvpRequestBannerProps) {
  if (!request) return null;

  const isDraw = request.kind === "draw";
  const Icon = isDraw ? Handshake : RotateCcw;
  const title = isDraw ? labels.drawTitle : labels.takebackTitle;
  const accent = isDraw
    ? "border-amber-400/50 shadow-[0_8px_32px_rgba(251,191,36,0.12)]"
    : "border-violet-400/50 shadow-[0_8px_32px_rgba(167,139,250,0.12)]";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pvp-request-banner w-full animate-in zoom-in-95 fade-in duration-300 rounded-xl border bg-slate-950/95 backdrop-blur-xl shadow-2xl ${accent} px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={`shrink-0 rounded-full p-2 ring-1 ${
            isDraw
              ? "bg-amber-500/10 text-amber-300 ring-amber-400/30"
              : "bg-violet-500/10 text-violet-300 ring-violet-400/30"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-slate-50 tracking-tight">{title}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{request.fromLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
        <Button
          type="button"
          size="sm"
          className="h-8 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 shadow-sm"
          onClick={onAccept}
        >
          {labels.accept}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs border-slate-600/80 bg-slate-900/50"
          onClick={onDecline}
        >
          {labels.decline}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-200 hover:bg-slate-800/80"
          onClick={onDismiss}
          aria-label={labels.dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
