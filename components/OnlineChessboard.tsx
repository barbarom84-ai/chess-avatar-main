"use client";

import { useCallback, useState } from "react";
import { Chess, type Square } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import PromotionDialog from "@/components/PromotionDialog";
import { playChessMoveSound } from "@/lib/chess-sound";

interface OnlineChessboardProps {
  fen: string;
  orientation: "white" | "black";
  lastMove: { from: string; to: string } | null;
  canMove: boolean;
  onSubmitUci: (uci: string) => Promise<void>;
  /** Called when a move fails (e.g. network); parent may toast. */
  onMoveError?: (message: string) => void;
}

export default function OnlineChessboard({
  fen,
  orientation,
  lastMove,
  canMove,
  onSubmitUci,
  onMoveError,
}: OnlineChessboardProps) {
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trySubmit = useCallback(
    async (uci: string) => {
      setSubmitting(true);
      try {
        await onSubmitUci(uci);
        playChessMoveSound();
      } catch (e) {
        onMoveError?.(e instanceof Error ? e.message : "Move failed");
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmitUci, onMoveError]
  );

  const onPromotionPick = useCallback(
    async (piece: "q" | "r" | "b" | "n") => {
      if (!pending) return;
      const uci = `${pending.from}${pending.to}${piece}`.toLowerCase();
      setPromotionOpen(false);
      setPending(null);
      await trySubmit(uci);
    },
    [pending, trySubmit]
  );

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (!canMove || submitting) return false;

      const board = new Chess(fen === "start" ? undefined : fen);
      const piece = board.get(sourceSquare as Square);
      const isPromotion =
        piece &&
        piece.type === "p" &&
        ((piece.color === "w" && targetSquare[1] === "8") ||
          (piece.color === "b" && targetSquare[1] === "1"));

      if (isPromotion) {
        setPending({ from: sourceSquare, to: targetSquare });
        setPromotionOpen(true);
        return true;
      }

      const uci = `${sourceSquare}${targetSquare}`.toLowerCase();
      void trySubmit(uci);
      return true;
    },
    [canMove, submitting, fen, trySubmit]
  );

  return (
    <>
      <SimpleChessboard
        position={fen}
        onDrop={onDrop}
        orientation={orientation}
        lastMove={lastMove}
      />
      <PromotionDialog
        open={promotionOpen}
        pieceColor={pending ? new Chess(fen).get(pending.from as Square)?.color : undefined}
        onSelect={(p) => void onPromotionPick(p)}
      />
    </>
  );
}
