"use client";

import Link from "next/link";
import { Crown, Library, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PlayPickerMode = "personalities" | "library" | "online";

export interface PlayModeRailLabels {
  personalities: string;
  library: string;
  online: string;
  personalitiesHint: string;
  libraryHint: string;
  onlineHint: string;
  onlineCta: string;
}

interface PlayModeRailProps {
  mode: PlayPickerMode;
  onModeChange: (mode: PlayPickerMode) => void;
  labels: PlayModeRailLabels;
}

const MODES: PlayPickerMode[] = ["personalities", "library", "online"];

function ModeIcon({ mode }: { mode: PlayPickerMode }) {
  switch (mode) {
    case "personalities":
      return <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "library":
      return <Library className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "online":
      return <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
}

function modeLabel(mode: PlayPickerMode, labels: PlayModeRailLabels): string {
  switch (mode) {
    case "personalities":
      return labels.personalities;
    case "library":
      return labels.library;
    case "online":
      return labels.online;
  }
}

export default function PlayModeRail({
  mode,
  onModeChange,
  labels,
}: PlayModeRailProps) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden flex flex-col">
      <div className="inline-flex w-full border-b border-slate-800/80 overflow-hidden flex-wrap">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            data-testid={`play-mode-${m}`}
            className={`flex-1 min-w-[72px] px-2 py-2 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1 ${
              mode === m
                ? "bg-cyan-700 text-white"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ModeIcon mode={m} />
            <span className="truncate">{modeLabel(m, labels)}</span>
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3 flex-1 min-h-0">
        {mode === "personalities" && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {labels.personalitiesHint}
          </p>
        )}
        {mode === "library" && (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {labels.libraryHint}
          </p>
        )}
        {mode === "online" && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {labels.onlineHint}
            </p>
            <Button
              asChild
              type="button"
              size="sm"
              className="w-full bg-cyan-700 hover:bg-cyan-600"
            >
              <Link href="/online" data-testid="play-online-cta">
                {labels.onlineCta}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
