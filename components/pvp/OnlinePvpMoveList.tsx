"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { replayGameFromUcis, type PvpMoveRow } from "@/lib/pvp-chess";
import { formatPvpMoveListTimeMs, pvpMoveTimeMsByPly } from "@/lib/pvp-move-time";

type OnlinePvpMoveListProps = {
  moves: PvpMoveRow[];
  clockMode?: string | null;
  selectedPly?: number | null;
  onSelectPly?: (ply: number | null) => void;
};

function MoveCell({
  san,
  ply,
  timeLabel,
  active,
  interactive,
  isLiveHighlight,
  onSelect,
}: {
  san: string;
  ply: number;
  timeLabel: string;
  active: boolean;
  interactive: boolean;
  isLiveHighlight: boolean;
  onSelect?: (ply: number) => void;
}) {
  const highlightClass = "text-cyan-300 bg-cyan-950/50 rounded px-1 cursor-pointer";
  const normalClass = "text-slate-200 cursor-pointer hover:text-cyan-200";
  const staticClass = "text-slate-200";

  let className = staticClass;
  if (active) className = highlightClass;
  else if (interactive) className = normalClass;
  else if (isLiveHighlight) className = highlightClass;

  return (
    <button
      type="button"
      className={`inline-flex min-w-0 items-baseline gap-1 text-left ${className}`}
      onClick={() => onSelect?.(ply)}
      disabled={!onSelect}
      title={timeLabel || undefined}
    >
      <span>{san}</span>
      {timeLabel ? (
        <span className="text-[10px] font-normal text-slate-500 tabular-nums shrink-0">
          {timeLabel}
        </span>
      ) : null}
    </button>
  );
}

export default function OnlinePvpMoveList({
  moves,
  clockMode = null,
  selectedPly = null,
  onSelectPly,
}: OnlinePvpMoveListProps) {
  const { t, lang } = useLanguage();
  const o = t.playOnline;

  const sanMoves = useMemo(() => {
    if (moves.length === 0) return [] as string[];
    const chess = replayGameFromUcis(moves.map((m) => m.uci));
    return chess.history();
  }, [moves]);

  const timeByPly = useMemo(
    () => pvpMoveTimeMsByPly(moves, clockMode),
    [moves, clockMode]
  );

  const formatTime = (ply: number) => {
    const ms = timeByPly.get(ply);
    if (ms == null) return "";
    return formatPvpMoveListTimeMs(ms, clockMode, lang);
  };

  const livePly = moves.length;
  const activePly = selectedPly ?? livePly;
  const isLive = selectedPly === null || selectedPly >= livePly;

  const plyForSanIndex = (sanIndex: number) => sanIndex + 1;

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
                <div
                  key={moveNum}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-1 py-0.5 items-baseline"
                >
                  <span className="text-slate-500 shrink-0">{moveNum}.</span>
                  <MoveCell
                    san={sanMoves[whiteIndex]!}
                    ply={whitePly}
                    timeLabel={formatTime(whitePly)}
                    active={activePly === whitePly && !isLive}
                    interactive={Boolean(onSelectPly)}
                    isLiveHighlight={whiteIndex === sanMoves.length - 1 && isLive}
                    onSelect={onSelectPly ?? undefined}
                  />
                  {sanMoves[blackIndex] && blackPly != null ? (
                    <MoveCell
                      san={sanMoves[blackIndex]!}
                      ply={blackPly}
                      timeLabel={formatTime(blackPly)}
                      active={activePly === blackPly && !isLive}
                      interactive={Boolean(onSelectPly)}
                      isLiveHighlight={blackIndex === sanMoves.length - 1 && isLive}
                      onSelect={onSelectPly ?? undefined}
                    />
                  ) : (
                    <span />
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
