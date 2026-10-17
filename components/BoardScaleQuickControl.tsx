"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { ChessKnight } from "lucide-react";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import {
  BOARD_SCALE_DEFAULT_PERCENT,
  BOARD_SCALE_MAX_PERCENT,
  BOARD_SCALE_MIN_PERCENT,
  clampBoardScalePercent,
} from "@/lib/board-scale";
import { useLanguage } from "@/lib/language-context";

/** ~2.5 px of diagonal drag ≈ 1 % scale */
const PX_PER_PERCENT = 2.5;
const STEP = 5;

function snapScale(percent: number): number {
  const clamped = clampBoardScalePercent(percent);
  const snapped = Math.round(clamped / STEP) * STEP;
  return clampBoardScalePercent(snapped);
}

export default function BoardScaleQuickControl() {
  const { settings, updateSettings } = useChessboardSettings();
  const { t } = useLanguage();
  const percent = settings.boardScalePercent;
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPercent: number;
  } | null>(null);

  const setPercent = useCallback(
    (next: number) => {
      updateSettings({ boardScalePercent: snapScale(next) });
    },
    [updateSettings]
  );

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPercent: percent,
    };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const dx = e.clientX - drag.startX;
    // Bottom-right handle: drag right to enlarge, left to shrink
    const delta = dx / PX_PER_PERCENT;
    setPercent(drag.startPercent + delta);
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    dragRef.current = null;
    setDragging(false);
  };

  const onDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    updateSettings({ boardScalePercent: BOARD_SCALE_DEFAULT_PERCENT });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "+") {
      e.preventDefault();
      setPercent(percent + STEP);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "-") {
      e.preventDefault();
      setPercent(percent - STEP);
    } else if (e.key === "Home") {
      e.preventDefault();
      updateSettings({ boardScalePercent: BOARD_SCALE_MIN_PERCENT });
    } else if (e.key === "End") {
      e.preventDefault();
      updateSettings({ boardScalePercent: BOARD_SCALE_MAX_PERCENT });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      updateSettings({ boardScalePercent: BOARD_SCALE_DEFAULT_PERCENT });
    }
  };

  const labels = t.chessboardSettings;

  return (
    <div
      className="pointer-events-auto absolute top-full right-0 z-40 mt-1.5 flex flex-col items-end gap-1"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {(dragging || percent !== BOARD_SCALE_DEFAULT_PERCENT) && (
        <span
          className="select-none rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-cyan-200/95 shadow-md ring-1 ring-cyan-500/30"
          aria-live="polite"
        >
          {percent}%
        </span>
      )}
      <button
        type="button"
        role="slider"
        aria-label={labels.boardScaleHandle}
        aria-valuemin={BOARD_SCALE_MIN_PERCENT}
        aria-valuemax={BOARD_SCALE_MAX_PERCENT}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        title={labels.boardScaleHandleHint}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        className={`inline-flex h-9 w-9 touch-none items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950/95 text-cyan-300 shadow-lg shadow-cyan-950/40 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
          dragging
            ? "scale-110 cursor-grabbing ring-2 ring-cyan-400/60"
            : "cursor-ew-resize hover:scale-105 hover:border-cyan-300 hover:text-cyan-200"
        }`}
      >
        <ChessKnight className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.1} aria-hidden />
      </button>
    </div>
  );
}
