"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/language-context";
import { replayGameFromUcis, type PvpMoveRow } from "@/lib/pvp-chess";

type OnlinePvpMoveListProps = {
  moves: PvpMoveRow[];
};

export default function OnlinePvpMoveList({ moves }: OnlinePvpMoveListProps) {
  const { t } = useLanguage();
  const o = t.playOnline;

  const sanMoves = useMemo(() => {
    if (moves.length === 0) return [] as string[];
    const chess = replayGameFromUcis(moves.map((m) => m.uci));
    return chess.history();
  }, [moves]);

  const lastIndex = sanMoves.length - 1;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <BookOpen className="h-4 w-4 text-cyan-400" aria-hidden />
        <h3 className="text-sm font-semibold text-slate-300">{o.moveListTitle}</h3>
      </div>
      <ScrollArea className="h-[min(280px,40dvh)] rounded-md border border-slate-800 bg-slate-950/40">
        {sanMoves.length === 0 ? (
          <p className="text-sm text-slate-500 p-3">{o.moveListEmpty}</p>
        ) : (
          <div className="p-2 text-sm font-mono leading-relaxed">
            {Array.from({ length: Math.ceil(sanMoves.length / 2) }).map((_, idx) => {
              const moveNum = idx + 1;
              const whiteIndex = idx * 2;
              const blackIndex = whiteIndex + 1;
              return (
                <div key={moveNum} className="flex gap-1 py-0.5">
                  <span className="text-slate-500 w-7 shrink-0">{moveNum}.</span>
                  <span
                    className={
                      whiteIndex === lastIndex
                        ? "text-cyan-300 bg-cyan-950/50 rounded px-1"
                        : "text-slate-200"
                    }
                  >
                    {sanMoves[whiteIndex]}
                  </span>
                  {sanMoves[blackIndex] && (
                    <span
                      className={
                        blackIndex === lastIndex
                          ? "text-cyan-300 bg-cyan-950/50 rounded px-1"
                          : "text-slate-200"
                      }
                    >
                      {sanMoves[blackIndex]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
