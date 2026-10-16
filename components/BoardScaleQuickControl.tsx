"use client";

import { Slider } from "@/components/ui/slider";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import {
  BOARD_SCALE_MAX_PERCENT,
  BOARD_SCALE_MIN_PERCENT,
} from "@/lib/board-scale";
import { useLanguage } from "@/lib/language-context";

export default function BoardScaleQuickControl() {
  const { settings, updateSettings } = useChessboardSettings();
  const { t } = useLanguage();
  const percent = settings.boardScalePercent;

  return (
    <div
      className="board-scale-control absolute top-1.5 right-1.5 z-30 flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/90 px-2 py-1.5 shadow-lg backdrop-blur-sm opacity-90 sm:opacity-0 sm:pointer-events-none sm:group-hover/board:opacity-100 sm:group-hover/board:pointer-events-auto sm:group-focus-within/board:opacity-100 sm:group-focus-within/board:pointer-events-auto transition-opacity"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Slider
        min={BOARD_SCALE_MIN_PERCENT}
        max={BOARD_SCALE_MAX_PERCENT}
        step={5}
        value={[percent]}
        onValueChange={(v) => {
          const n = v[0];
          if (typeof n === "number") updateSettings({ boardScalePercent: n });
        }}
        className="w-[5.5rem] sm:w-28"
        aria-label={t.chessboardSettings.boardScale}
      />
      <span
        className="min-w-[2.5rem] text-right text-[11px] tabular-nums font-medium text-cyan-200/95"
        aria-live="polite"
      >
        {percent}%
      </span>
    </div>
  );
}
