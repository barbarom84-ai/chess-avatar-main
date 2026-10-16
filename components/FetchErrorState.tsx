"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FetchErrorState({
  title,
  message,
  offline,
  retryLabel,
  onRetry,
  secondaryHref,
  secondaryLabel,
  compact,
}: {
  title: string;
  message: string;
  offline?: boolean;
  retryLabel: string;
  onRetry?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={
        compact
          ? "flex flex-col items-center gap-3 py-6 px-3 text-center"
          : "flex flex-col items-center gap-4 py-10 px-4 text-center"
      }
      data-testid="fetch-error-state"
      data-offline={offline ? "true" : "false"}
    >
      {offline && (
        <WifiOff
          className="h-8 w-8 text-amber-400/90"
          aria-hidden
          data-testid="fetch-error-offline-icon"
        />
      )}
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="bg-cyan-700 hover:bg-cyan-600"
            data-testid="fetch-error-retry"
          >
            {retryLabel}
          </Button>
        )}
        {secondaryHref && secondaryLabel && (
          <Button asChild type="button" size="sm" variant="outline">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
