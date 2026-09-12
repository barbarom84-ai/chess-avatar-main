"use client";

import SimpleChessboard from "@/components/SimpleChessboard";
import { useLanguage } from "@/lib/language-context";
import type { CoachBoardSight } from "@/lib/coach-board-sight";
import { localizeSan } from "@/lib/localized-san";
import { cn } from "@/lib/utils";

export default function ReviewCoachSightBoard({
  sight,
  orientation = "white",
  className,
}: {
  sight: CoachBoardSight;
  orientation?: "white" | "black";
  className?: string;
}) {
  const { t, lang } = useLanguage();
  const cited = sight.citedLegal
    .slice(0, 3)
    .map((m) => localizeSan(m.san, lang))
    .join(", ");
  const illegal = sight.citedIllegal
    .slice(0, 3)
    .map((san) => localizeSan(san, lang))
    .join(", ");

  return (
    <div
      className={cn(
        "rounded-lg border border-cyan-500/30 bg-slate-950/90 shadow-xl backdrop-blur-sm p-1.5 w-[8.75rem]",
        className
      )}
    >
      <p className="text-[9px] uppercase tracking-wider text-cyan-200/90 font-bold px-0.5 pb-1 truncate">
        {t.review.coach.sightTitle}
      </p>
      <div className="pointer-events-none select-none">
        <SimpleChessboard
          position={sight.fen}
          orientation={orientation}
          lastMove={sight.lastMove}
          arrows={sight.arrows}
          boardMaxWidth="8.25rem"
          showCoordinates={false}
          compact
        />
      </div>
      {cited ? (
        <p className="text-[10px] text-cyan-200/90 px-0.5 pt-1 leading-tight">
          {t.review.coach.sightCited.replace("{moves}", cited)}
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 px-0.5 pt-1 leading-tight">
          {t.review.coach.sightHint}
        </p>
      )}
      {illegal ? (
        <p className="text-[10px] text-amber-300 px-0.5 pt-0.5 leading-tight">
          {t.review.coach.sightIllegal.replace("{moves}", illegal)}
        </p>
      ) : null}
    </div>
  );
}
