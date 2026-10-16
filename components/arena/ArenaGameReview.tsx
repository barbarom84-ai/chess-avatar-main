"use client";

import { useMemo, type MouseEvent } from "react";
import { Microscope } from "lucide-react";
import {
  evalGraphPoints,
  summarizeArenaGame,
  type ArenaMoveQuality,
} from "@/lib/arena-game-summary";
import { useLanguage } from "@/lib/language-context";

const GRAPH_W = 240;
const GRAPH_H = 56;

const QUALITY_MARK: Record<ArenaMoveQuality, string> = {
  blunder: "??",
  mistake: "?",
  inaccuracy: "?!",
};

export default function ArenaGameReview({
  sans,
  evals,
  finished,
  whiteName,
  blackName,
  displayedPly,
  onSelectPly,
  onAnalyze,
}: {
  sans: string[];
  evals: (number | null)[];
  finished: boolean;
  whiteName: string;
  blackName: string;
  displayedPly: number;
  onSelectPly: (ply: number) => void;
  onAnalyze: () => void;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const points = useMemo(() => evalGraphPoints(evals, GRAPH_W, GRAPH_H), [evals]);
  const summary = useMemo(
    () => (finished ? summarizeArenaGame(sans, evals) : null),
    [finished, sans, evals]
  );

  if (points.length < 2) return null;

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  // White's share of the graph is filled from the curve down, as on Lichess.
  const area = `0,${GRAPH_H} ${line} ${GRAPH_W},${GRAPH_H}`;
  const marker = displayedPly > 0 ? points[Math.min(displayedPly, points.length) - 1] : null;

  const selectFromPointer = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSelectPly(Math.round(ratio * (points.length - 1)) + 1);
  };

  const sideRow = (side: "w" | "b", name: string) => {
    const s = summary!.sides[side];
    return (
      <div className="arena-review__side">
        <span className="truncate text-slate-200">{name}</span>
        <span className="arena-quality" data-quality="blunder" title={ap.blunders}>
          {s.blunders} ??
        </span>
        <span className="arena-quality" data-quality="mistake" title={ap.mistakes}>
          {s.mistakes} ?
        </span>
        <span className="arena-quality" data-quality="inaccuracy" title={ap.inaccuracies}>
          {s.inaccuracies} ?!
        </span>
      </div>
    );
  };

  return (
    <section className="arena-review" aria-label={finished ? ap.reviewTitle : ap.evalGraphLabel}>
      <h3 className="arena-review__title">{finished ? ap.reviewTitle : ap.evalGraphLabel}</h3>
      <svg
        viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
        preserveAspectRatio="none"
        className="arena-evalgraph"
        role="slider"
        tabIndex={0}
        aria-label={ap.evalGraphLabel}
        aria-valuemin={0}
        aria-valuemax={points.length}
        aria-valuenow={displayedPly}
        onClick={selectFromPointer}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onSelectPly(Math.max(0, displayedPly - 1));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onSelectPly(Math.min(points.length, displayedPly + 1));
          } else if (e.key === "Home") {
            e.preventDefault();
            onSelectPly(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onSelectPly(points.length);
          }
        }}
        data-testid="arena-eval-graph"
      >
        <polygon points={area} className="arena-evalgraph__area" />
        <line x1={0} y1={GRAPH_H / 2} x2={GRAPH_W} y2={GRAPH_H / 2} className="arena-evalgraph__mid" />
        <polyline points={line} className="arena-evalgraph__line" />
        {marker && (
          <line x1={marker.x} y1={0} x2={marker.x} y2={GRAPH_H} className="arena-evalgraph__marker" />
        )}
      </svg>

      {summary && (
        <>
          <div className="space-y-1">
            {sideRow("w", whiteName)}
            {sideRow("b", blackName)}
          </div>
          {summary.keyMoments.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {ap.keyMoments}
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.keyMoments.map((m) => (
                  <button
                    key={m.ply}
                    type="button"
                    className="arena-move"
                    data-current={displayedPly === m.ply}
                    data-quality={m.quality}
                    onClick={() => onSelectPly(m.ply)}
                    title={`−${m.loss}`}
                  >
                    {Math.ceil(m.ply / 2)}
                    {m.side === "w" ? ". " : "… "}
                    {m.san}
                    {QUALITY_MARK[m.quality]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">{ap.noKeyMoments}</p>
          )}
          <button
            type="button"
            className="arena-icon-btn w-full"
            onClick={onAnalyze}
            data-testid="arena-analyze"
          >
            <Microscope className="h-4 w-4" />
            <span>{ap.analyzeGame}</span>
          </button>
        </>
      )}
    </section>
  );
}
