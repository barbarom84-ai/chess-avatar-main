"use client";

import { useMemo, useCallback } from "react";
import { Chess, type Move } from "chess.js";
import { Button } from "@/components/ui/button";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import SimpleChessboard from "@/components/SimpleChessboard";
import MoveCommentary from "./MoveCommentary";

function uciToMove(game: Chess, uci: string): boolean {
  const s = uci.trim().toLowerCase();
  if (s.length < 4) return false;
  const from = s.slice(0, 2);
  const to = s.slice(2, 4);
  const promotion = s.length > 4 ? s[4] : undefined;
  try {
    const move = game.move({
      from,
      to,
      promotion: promotion as "q" | "r" | "b" | "n" | undefined,
    });
    return !!move;
  } catch {
    return false;
  }
}

export interface LessonChessboardProps {
  uciMoves: string[];
  /** index i = après uciMoves[i] */
  comments?: { fr: string; en: string }[];
  /** quand moveIndex === afterMoveIndex + 1, prioritaire sur comments */
  historicalAnnotations?: { afterMoveIndex: number; text: { fr: string; en: string } }[];
  lang: "fr" | "en";
  orientation?: "white" | "black";
  commentaryLabels: {
    moveLabel: string;
    of: string;
    noComment: string;
  };
  moveIndex: number;
  onMoveIndexChange: (n: number) => void;
}

export default function LessonChessboard({
  uciMoves,
  comments,
  historicalAnnotations,
  lang,
  orientation = "white",
  commentaryLabels,
  moveIndex,
  onMoveIndexChange,
}: LessonChessboardProps) {
  const { fen, lastMove, currentSan, currentVerboseMove, commentText } =
    useMemo(() => {
    const g = new Chess();
    let last: { from: string; to: string } | null = null;
    for (let i = 0; i < moveIndex && i < uciMoves.length; i++) {
      const before = g.fen();
      const ok = uciToMove(g, uciMoves[i]);
      if (!ok) {
        return {
          fen: before,
          lastMove: last,
          currentSan: null as string | null,
          currentVerboseMove: null as Move | null,
          commentText: null as string | null,
        };
      }
      const hist = g.history({ verbose: true });
      const m = hist[hist.length - 1];
      if (m) last = { from: m.from, to: m.to };
    }
    const idx = moveIndex - 1;
    let commentText: string | null = null;
    if (moveIndex > 0 && historicalAnnotations?.length) {
      const ann = historicalAnnotations.find((a) => a.afterMoveIndex === idx);
      if (ann) commentText = lang === "en" ? ann.text.en : ann.text.fr;
    }
    if (commentText === null && comments && idx >= 0 && idx < comments.length) {
      const c = comments[idx];
      commentText = lang === "en" ? c.en : c.fr;
    }
    const hist = g.history({ verbose: true });
    const lastM = hist[hist.length - 1];
    return {
      fen: g.fen(),
      lastMove: last,
      currentSan: lastM ? lastM.san : null,
      currentVerboseMove: lastM ?? null,
      commentText,
    };
  }, [uciMoves, comments, historicalAnnotations, moveIndex, lang]);

  const total = uciMoves.length;
  const canPrev = moveIndex > 0;
  const canNext = moveIndex < total;

  const go = useCallback(
    (n: number) => {
      onMoveIndexChange(Math.max(0, Math.min(total, n)));
    },
    [total, onMoveIndexChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-center max-w-[min(100%,420px)] mx-auto aspect-square w-full">
        <SimpleChessboard position={fen} orientation={orientation} lastMove={lastMove} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!canPrev} onClick={() => go(0)}>
          <ChevronFirst className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!canPrev} onClick={() => go(moveIndex - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!canNext} onClick={() => go(moveIndex + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!canNext} onClick={() => go(total)}>
          <ChevronLast className="h-4 w-4" />
        </Button>
      </div>
      <MoveCommentary
        moveIndex={moveIndex}
        totalMoves={total}
        currentSan={currentSan}
        currentVerboseMove={currentVerboseMove}
        comment={moveIndex === 0 ? null : commentText}
        commentLang={lang}
        labels={commentaryLabels}
      />
    </div>
  );
}
