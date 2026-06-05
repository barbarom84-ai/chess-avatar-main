"use client";

import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/language-context";
import type { ContinuousAnalysisDisplay } from "@/hooks/useContinuousAnalysis";

interface ContinuousAnalysisPanelProps {
  enabled: boolean;
  engineReady: boolean;
  isAnalyzing: boolean;
  paused: boolean;
  display: ContinuousAnalysisDisplay | null;
  /** Compact mode: PV lines only (eval shown in EvaluationBar) */
  compact?: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function formatEval(pawns: number): string {
  const v = clamp(pawns, -99, 99);
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}

function formatLineEval(
  evalPawns: number,
  isMate?: boolean,
  mateInMoves?: number
): string {
  if (isMate && mateInMoves != null) {
    const sign = mateInMoves > 0 ? "+" : "-";
    return `M${sign}${Math.abs(mateInMoves)}`;
  }
  return formatEval(evalPawns);
}

export default function ContinuousAnalysisPanel({
  enabled,
  engineReady,
  isAnalyzing,
  paused,
  display,
  compact = false,
}: ContinuousAnalysisPanelProps) {
  const { t } = useLanguage();

  if (!enabled) {
    if (compact) {
      return (
        <p className="text-[11px] text-slate-500 px-1">
          {t.review.continuousAnalysis.inactiveHint}
        </p>
      );
    }
    return (
      <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2">
        <p className="text-xs text-slate-500">{t.review.continuousAnalysis.inactiveHint}</p>
      </div>
    );
  }

  if (!engineReady) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
        {t.review.engineLoading}
      </div>
    );
  }

  if (paused) {
    return (
      <p className="text-[11px] text-amber-200/90 px-1">
        {t.review.continuousAnalysis.pausedDuringReview}
      </p>
    );
  }

  const header = (
    <div className="flex items-center justify-between gap-2 px-1 mb-1">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
        {t.review.continuousAnalysis.engineName}
      </span>
      {display ? (
        <span className="text-[10px] text-slate-500 font-mono">
          {t.review.continuousAnalysis.depth.replace("{n}", String(display.depth))}
        </span>
      ) : isAnalyzing ? (
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t.review.continuousAnalysis.computing}
        </span>
      ) : null}
    </div>
  );

  const lines = display?.depth === 0 && display.lines.length === 0 ? (
    <p className="text-[11px] text-slate-400 px-1">{t.review.layout.gameOver}</p>
  ) : display ? (
    <ScrollArea className={compact ? "max-h-[calc(100%-1.5rem)]" : "max-h-32"}>
      <div className="space-y-1 pr-2">
        {display.lines.map((line) => (
          <div
            key={line.multipv}
            className="text-[11px] font-mono text-slate-400 leading-snug break-words"
          >
            <span className="text-slate-500 mr-1.5 shrink-0">
              {formatLineEval(line.evalPawns, line.isMate, line.mateInMoves)}
            </span>
            <span className="text-slate-300">
              {line.sanPv.length > 0 ? line.sanPv.join(" ") : line.pvUci.join(" ")}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  ) : (
    <p className="text-[11px] text-slate-500 px-1">{t.review.continuousAnalysis.computing}</p>
  );

  if (compact) {
    return (
      <div className="flex flex-col min-h-0 h-full">
        {header}
        {lines}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-2 space-y-1">
      {header}
      {!compact && display && (
        <div className="text-lg font-mono font-semibold text-cyan-300 px-1">
          {display.lines[0]?.isMate && display.lines[0].mateInMoves != null
            ? `M${display.evalWhitePov > 0 ? "+" : "-"}${Math.abs(display.lines[0].mateInMoves)}`
            : formatEval(display.evalWhitePov)}
        </div>
      )}
      {lines}
    </div>
  );
}
