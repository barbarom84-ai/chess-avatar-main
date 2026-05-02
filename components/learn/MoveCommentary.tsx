"use client";

import type { Move } from "chess.js";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import SanNotation from "@/components/SanNotation";
import { commentTextToNodes } from "@/lib/comment-move-tokens";

interface MoveCommentaryProps {
  moveIndex: number;
  totalMoves: number;
  currentSan: string | null;
  /** Si fourni, affichage SAN avec icônes (plus fiable que la chaîne seule). */
  currentVerboseMove?: Move | null;
  comment: string | null;
  /** Active la tokenisation des coups dans le commentaire (notation FR / EN). */
  commentLang?: "fr" | "en";
  labels: {
    moveLabel: string;
    of: string;
    noComment: string;
  };
}

export default function MoveCommentary({
  moveIndex,
  totalMoves,
  currentSan,
  currentVerboseMove,
  comment,
  commentLang,
  labels,
}: MoveCommentaryProps) {
  const { settings } = useChessboardSettings();
  const defaultPieceColor =
    moveIndex > 0 ? (moveIndex % 2 === 1 ? "w" : "b") : "w";

  const commentBody =
    comment && commentLang
      ? commentTextToNodes(
          comment,
          commentLang,
          defaultPieceColor,
          settings.pieceSet
        )
      : comment;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-4 space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-400 gap-2">
        <span>
          {labels.moveLabel} {Math.max(0, moveIndex)} {labels.of} {totalMoves}
        </span>
        {(currentVerboseMove || currentSan) && (
          <SanNotation
            verboseMove={currentVerboseMove ?? null}
            fallbackSan={currentSan ?? ""}
            movingColor={
              moveIndex > 0 ? (moveIndex % 2 === 1 ? "w" : "b") : "w"
            }
            pieceSet={settings.pieceSet}
            size="md"
          />
        )}
      </div>
      <ScrollArea className="h-[120px] w-full rounded-md border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-sm text-slate-200 leading-relaxed">
          {comment
            ? commentBody
            : labels.noComment}
        </p>
      </ScrollArea>
    </div>
  );
}
