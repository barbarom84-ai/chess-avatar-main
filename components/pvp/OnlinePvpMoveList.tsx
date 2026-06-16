"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { replayGameFromUcis, type PvpMoveRow } from "@/lib/pvp-chess";

type OnlinePvpMoveListProps = {
  moves: PvpMoveRow[];
  selectedPly?: number | null;
  onSelectPly?: (ply: number | null) => void;
};

export default function OnlinePvpMoveList({
  moves,
  selectedPly = null,
  onSelectPly,
}: OnlinePvpMoveListProps) {
  const { t } = useLanguage();
  const o = t.playOnline;

  const sanMoves = useMemo(() => {
    if (moves.length === 0) return [] as string[];
    const chess = replayGameFromUcis(moves.map((m) => m.uci));
    return chess.history();
  }, [moves]);

  const livePly = moves.length;
  const activePly = selectedPly ?? livePly;
  const isLive = selectedPly === null || selectedPly >= livePly;

  const plyForSanIndex = (sanIndex: number) => sanIndex + 1;

  const highlightClass = "text-cyan-300 bg-cyan-950/50 rounded px-1 cursor-pointer";
  const normalClass = "text-slate-200 cursor-pointer hover:text-cyan-200";

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-300 truncate">{o.moveListTitle}</h3>
        </div>
        {onSelectPly && moves.length > 0 && !isLive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] shrink-0"
            onClick={() => onSelectPly(null)}
          >
            {o.moveNavLive}
          </Button>
        )}
      </div>
      {onSelectPly && moves.length > 0 && (
        <p className="text-[10px] text-slate-500 mb-1.5">{o.moveNavHint}</p>
      )}
      <ScrollArea className="h-[min(280px,40dvh)] rounded-md border border-slate-800 bg-slate-950/40">
        {sanMoves.length === 0 ? (
          <p className="text-sm text-slate-500 p-3">{o.moveListEmpty}</p>
        ) : (
          <div className="p-2 text-sm font-mono leading-relaxed">
            {Array.from({ length: Math.ceil(sanMoves.length / 2) }).map((_, idx) => {
              const moveNum = idx + 1;
              const whiteIndex = idx * 2;
              const blackIndex = whiteIndex + 1;
              const whitePly = plyForSanIndex(whiteIndex);
              const blackPly = blackIndex < sanMoves.length ? plyForSanIndex(blackIndex) : null;
              return (
                <div key={moveNum} className="flex gap-1 py-0.5">
                  <span className="text-slate-500 w-7 shrink-0">{moveNum}.</span>
                  <button
                    type="button"
                    className={
                      activePly === whitePly && !isLive
                        ? highlightClass
                        : onSelectPly
                          ? normalClass
                          : whiteIndex === sanMoves.length - 1 && isLive
                            ? highlightClass
                            : "text-slate-200"
                    }
                    onClick={() => onSelectPly?.(whitePly)}
                    disabled={!onSelectPly}
                  >
                    {sanMoves[whiteIndex]}
                  </button>
                  {sanMoves[blackIndex] && blackPly != null && (
                    <button
                      type="button"
                      className={
                        activePly === blackPly && !isLive
                          ? highlightClass
                          : onSelectPly
                            ? normalClass
                            : blackIndex === sanMoves.length - 1 && isLive
                              ? highlightClass
                              : "text-slate-200"
                      }
                      onClick={() => onSelectPly?.(blackPly)}
                      disabled={!onSelectPly}
                    >
                      {sanMoves[blackIndex]}
                    </button>
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
