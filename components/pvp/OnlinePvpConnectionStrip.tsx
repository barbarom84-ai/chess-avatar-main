"use client";

import { WifiOff } from "lucide-react";
import type { PvpConnectionInfo } from "@/lib/pvp-connection";

type OnlinePvpConnectionStripProps = {
  connection: PvpConnectionInfo;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  prominent?: boolean;
};

export default function OnlinePvpConnectionStrip({
  connection,
  message,
  onRetry,
  retryLabel,
  prominent = false,
}: OnlinePvpConnectionStripProps) {
  if (connection.level !== "poor" && connection.level !== "offline") return null;

  const isOffline = connection.level === "offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 border ${
        prominent
          ? "rounded-xl px-4 py-3 text-sm shadow-lg backdrop-blur-xl"
          : "rounded-md px-2.5 py-1.5 text-xs"
      } ${
        isOffline
          ? prominent
            ? "border-red-500/50 bg-red-950/90 text-red-100"
            : "border-red-500/40 bg-red-950/40 text-red-200"
          : prominent
            ? "border-amber-500/50 bg-amber-950/90 text-amber-50"
            : "border-amber-500/40 bg-amber-950/30 text-amber-100"
      }`}
    >
      <WifiOff className={`${prominent ? "h-5 w-5" : "h-3.5 w-3.5"} shrink-0 opacity-80`} aria-hidden />
      <span className="flex-1 min-w-0">{message}</span>
      {onRetry && retryLabel ? (
        <button
          type="button"
          className="shrink-0 underline underline-offset-2 hover:no-underline opacity-90"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
