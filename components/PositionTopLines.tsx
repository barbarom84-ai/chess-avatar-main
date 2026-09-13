"use client";

import { Loader2 } from "lucide-react";
import SanNotation from "@/components/SanNotation";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { formatEvalLabel } from "@/lib/engine-eval";
import { useLanguage } from "@/lib/language-context";
import { localizeSan } from "@/lib/localized-san";
import { turnFromFen } from "@/lib/review-coach-context";
import type { ReviewEngineLine } from "@/lib/review-coach-context";

const LINE_SLOTS = 3;

interface PositionTopLinesProps {
  fen: string | null;
  engineReady: boolean;
  isAnalyzing: boolean;
  paused: boolean;
  gameOver: boolean;
  lines: ReviewEngineLine[];
  depth: number;
  targetDepth: number;
}

export default function PositionTopLines({
  fen,
  engineReady,
  isAnalyzing,
  paused,
  gameOver,
  lines,
  depth,
  targetDepth,
}: PositionTopLinesProps) {
  const { t, lang } = useLanguage();
  const { settings } = useChessboardSettings();
  const movingColor = turnFromFen(fen) === "black" ? "b" : "w";
  const shownDepth = depth || targetDepth;

  return (
    <div className="shrink-0 rounded-md border border-slate-700/70 bg-slate-950/60 px-2 py-1.5">
      <div className="mb-1 flex h-4 items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {t.review.topLines.title}
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {paused || isAnalyzing || !engineReady ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
              {paused
                ? t.review.topLines.paused
                : !engineReady
                  ? t.review.engineLoading
                  : t.review.topLines.computing}
            </span>
          ) : (
            t.review.topLines.depth.replace("{n}", String(shownDepth))
          )}
        </span>
      </div>

      {gameOver ? (
        <div className="flex h-[3.375rem] items-center">
          <p className="text-[11px] text-slate-400">{t.review.layout.gameOver}</p>
        </div>
      ) : (
        <ol className="flex h-[3.375rem] flex-col justify-between">
          {Array.from({ length: LINE_SLOTS }, (_, index) => {
            const line = lines[index];
            return (
              <li
                key={line ? `${line.rank}-${line.uci}` : `slot-${index}`}
                className="flex h-[1.0625rem] items-center gap-2 text-[11px] leading-none"
              >
                {line ? (
                  <>
                    <span className="w-3 shrink-0 text-slate-500 tabular-nums">
                      {line.rank}.
                    </span>
                    <span className="min-w-[4.5rem] text-slate-200">
                      <SanNotation
                        fallbackSan={line.san}
                        movingColor={movingColor}
                        pieceSet={settings.pieceSet}
                        size="sm"
                      />
                    </span>
                    <span className="w-12 shrink-0 font-mono tabular-nums text-cyan-300/90">
                      {formatEvalLabel(
                        line.evalWhitePov,
                        line.isMate,
                        line.mateInMovesWhite
                      )}
                    </span>
                    {line.pvSan.length > 1 ? (
                      <span className="min-w-0 truncate font-mono text-slate-500">
                        {line.pvSan
                          .slice(1, 5)
                          .map((san) => localizeSan(san, lang))
                          .join(" ")}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="w-full rounded-sm bg-slate-800/70 h-2 max-w-[11rem]" />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
