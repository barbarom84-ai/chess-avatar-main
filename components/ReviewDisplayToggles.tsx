"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { ReviewUiPrefKey, ReviewUiPrefs } from "@/lib/review-ui-prefs";

const TOGGLES: ReviewUiPrefKey[] = [
  "moves",
  "moveDetail",
  "summary",
  "keyMoments",
  "evalGraph",
  "coachAnalysis",
];

export default function ReviewDisplayToggles({
  prefs,
  onToggle,
}: {
  prefs: ReviewUiPrefs;
  onToggle: (key: ReviewUiPrefKey) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labels: Record<ReviewUiPrefKey, string> = {
    moves: t.review.layout.tabMoves,
    moveDetail: t.review.layout.tabMove,
    summary: t.review.layout.tabSummary,
    keyMoments: t.review.keyMomentsTitle,
    evalGraph: t.review.layout.tabGraph,
    coachAnalysis: t.review.coach.title,
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const enabledCount = TOGGLES.filter((key) => prefs[key]).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.review.layout.panelsLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
          open
            ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
            : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:text-slate-100"
        )}
      >
        <LayoutGrid className="h-3 w-3" />
        {t.review.layout.panelsLabel}
        <span className="text-slate-500 font-mono">{enabledCount}</span>
        <ChevronDown className={cn("h-3 w-3 text-slate-500", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[12.5rem] rounded-lg border border-cyan-500/30 bg-slate-950 p-1 shadow-xl"
        >
          {TOGGLES.map((key) => {
            const on = prefs[key];
            return (
              <button
                key={key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => onToggle(key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  on
                    ? "text-cyan-100"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    on
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200"
                      : "border-slate-600 bg-slate-900"
                  )}
                >
                  {on ? <Check className="h-3 w-3" /> : null}
                </span>
                {labels[key]}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
