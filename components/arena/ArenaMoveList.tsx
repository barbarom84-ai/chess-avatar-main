"use client";

import { useEffect, useRef } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

/**
 * SAN move list with navigation. `displayedPly` is the number of half-moves
 * applied on the displayed board (0 = starting position).
 */
export default function ArenaMoveList({
  sans,
  displayedPly,
  onSelectPly,
}: {
  sans: string[];
  displayedPly: number;
  onSelectPly: (ply: number) => void;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const listRef = useRef<HTMLDivElement>(null);
  const total = sans.length;
  const live = displayedPly >= total;

  useEffect(() => {
    if (!live) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [total, live]);

  const rows: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < total; i += 2) {
    rows.push({ num: i / 2 + 1, white: sans[i], black: sans[i + 1] });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {ap.moveListTitle}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            className="arena-icon-btn"
            aria-label={ap.navFirst}
            title={ap.navFirst}
            disabled={displayedPly === 0}
            onClick={() => onSelectPly(0)}
          >
            <ChevronFirst className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            aria-label={ap.navPrev}
            title={ap.navPrev}
            disabled={displayedPly === 0}
            onClick={() => onSelectPly(Math.max(0, displayedPly - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            aria-label={ap.navNext}
            title={ap.navNext}
            disabled={live}
            onClick={() => onSelectPly(Math.min(total, displayedPly + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            aria-label={ap.navLive}
            title={ap.navLive}
            disabled={live}
            onClick={() => onSelectPly(total)}
          >
            <ChevronLast className="h-4 w-4" />
          </button>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-xs text-slate-500">{ap.moveListEmpty}</p>
      ) : (
        <div ref={listRef} className="arena-movelist" data-testid="arena-move-list">
          {rows.map((row) => {
            const wPly = row.num * 2 - 1;
            const bPly = row.num * 2;
            return (
              <div key={row.num} className="contents">
                <span className="py-0.5 pr-1 text-right font-mono text-xs text-slate-500">
                  {row.num}.
                </span>
                <button
                  type="button"
                  className="arena-move"
                  data-current={displayedPly === wPly}
                  onClick={() => onSelectPly(wPly)}
                >
                  {row.white}
                </button>
                {row.black ? (
                  <button
                    type="button"
                    className="arena-move"
                    data-current={displayedPly === bPly}
                    onClick={() => onSelectPly(bPly)}
                  >
                    {row.black}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!live && total > 0 && (
        <p className="text-[11px] text-amber-300/90">
          {ap.viewingPast
            .replace("{n}", String(displayedPly))
            .replace("{total}", String(total))}
        </p>
      )}
    </div>
  );
}
