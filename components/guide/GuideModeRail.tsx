"use client";

import { Cpu, Package, RefreshCw, LifeBuoy, Wrench } from "lucide-react";

export type GuideMode = "fritz" | "pack" | "swap" | "help" | "advanced";

export interface GuideModeRailLabels {
  fritz: string;
  pack: string;
  swap: string;
  help: string;
  advanced: string;
  fritzHint: string;
  packHint: string;
  swapHint: string;
  helpHint: string;
  advancedHint: string;
}

interface GuideModeRailProps {
  mode: GuideMode;
  onModeChange: (mode: GuideMode) => void;
  labels: GuideModeRailLabels;
}

const MODES: GuideMode[] = ["fritz", "pack", "swap", "help", "advanced"];

function ModeIcon({ mode }: { mode: GuideMode }) {
  switch (mode) {
    case "fritz":
      return <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "pack":
      return <Package className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "swap":
      return <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "help":
      return <LifeBuoy className="h-3.5 w-3.5 shrink-0" aria-hidden />;
    case "advanced":
      return <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
}

function modeLabel(mode: GuideMode, labels: GuideModeRailLabels): string {
  switch (mode) {
    case "fritz":
      return labels.fritz;
    case "pack":
      return labels.pack;
    case "swap":
      return labels.swap;
    case "help":
      return labels.help;
    case "advanced":
      return labels.advanced;
  }
}

function modeHint(mode: GuideMode, labels: GuideModeRailLabels): string {
  switch (mode) {
    case "fritz":
      return labels.fritzHint;
    case "pack":
      return labels.packHint;
    case "swap":
      return labels.swapHint;
    case "help":
      return labels.helpHint;
    case "advanced":
      return labels.advancedHint;
  }
}

export default function GuideModeRail({
  mode,
  onModeChange,
  labels,
}: GuideModeRailProps) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden flex flex-col">
      <div className="inline-flex w-full border-b border-slate-800/80 overflow-hidden flex-wrap">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            data-testid={`guide-mode-${m}`}
            className={`flex-1 min-w-[56px] px-1.5 py-2 text-[11px] font-medium transition-colors inline-flex items-center justify-center gap-1 ${
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
      <div className="p-3">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {modeHint(mode, labels)}
        </p>
      </div>
    </div>
  );
}
