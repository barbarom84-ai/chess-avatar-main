"use client";

import { Minus, Plus } from "lucide-react";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import {
  BOARD_SCALE_MAX_PERCENT,
  BOARD_SCALE_MIN_PERCENT,
  clampBoardScalePercent,
} from "@/lib/board-scale";
import { useLanguage } from "@/lib/language-context";

const STEP = 5;

export default function BoardScaleQuickControl() {
  const { settings, updateSettings } = useChessboardSettings();
  const { t } = useLanguage();
  const percent = settings.boardScalePercent;
  const atMin = percent <= BOARD_SCALE_MIN_PERCENT;
  const atMax = percent >= BOARD_SCALE_MAX_PERCENT;

  const nudge = (delta: number) => {
    updateSettings({
      boardScalePercent: clampBoardScalePercent(percent + delta),
    });
  };

  return (
    <div
      className="board-scale-control absolute top-1.5 right-1.5 z-30 flex items-center gap-0.5 rounded-md border border-slate-700/80 bg-slate-950/85 p-0.5 shadow-lg backdrop-blur-sm opacity-90 sm:opacity-0 sm:pointer-events-none sm:group-hover/board:opacity-100 sm:group-hover/board:pointer-events-auto sm:group-focus-within/board:opacity-100 sm:group-focus-within/board:pointer-events-auto transition-opacity"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={atMin}
        onClick={() => nudge(-STEP)}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-200 hover:bg-slate-800 hover:text-cyan-200 disabled:opacity-35 disabled:pointer-events-none"
        aria-label={t.chessboardSettings.boardScaleDecrease}
        title={t.chessboardSettings.boardScaleDecrease}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        className="min-w-[2.5rem] text-center text-[11px] tabular-nums font-medium text-cyan-200/95"
        aria-live="polite"
      >
        {percent}%
      </span>
      <button
        type="button"
        disabled={atMax}
        onClick={() => nudge(STEP)}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-200 hover:bg-slate-800 hover:text-cyan-200 disabled:opacity-35 disabled:pointer-events-none"
        aria-label={t.chessboardSettings.boardScaleIncrease}
        title={t.chessboardSettings.boardScaleIncrease}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
