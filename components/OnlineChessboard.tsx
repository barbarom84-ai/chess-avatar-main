"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import PromotionDialog from "@/components/PromotionDialog";
import { LICHESS_ARROW_COLORS } from "@/lib/chess-arrows";
import {
  isOwnPieceOnSquare,
  premoveArrowFromUci,
  premoveUciFromSquares,
} from "@/lib/pvp-premove";

interface OnlineChessboardProps {
  fen: string;
  orientation: "white" | "black";
  lastMove: { from: string; to: string } | null;
  canMove: boolean;
  onSubmitUci: (uci: string) => Promise<void>;
  onMoveError?: (message: string) => void;
  allowPremove?: boolean;
  playerRole?: "white" | "black" | null;
  premoveUci?: string | null;
  onPremoveChange?: (uci: string | null) => void;
}

export default function OnlineChessboard({
  fen,
  orientation,
  lastMove,
  canMove,
  onSubmitUci,
  onMoveError,
  allowPremove = false,
  playerRole = null,
  premoveUci = null,
  onPremoveChange,
}: OnlineChessboardProps) {
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [pending, setPending] = useState<{ from: string; to: string; premove: boolean } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const lastMoveArrows = useMemo(
    () =>
      lastMove
        ? [
            {
              from: lastMove.from,
              to: lastMove.to,
              color: LICHESS_ARROW_COLORS.shiftCtrlAltYellow,
            },
          ]
        : [],
    [lastMove]
  );

  const premoveArrow = useMemo(() => premoveArrowFromUci(premoveUci), [premoveUci]);

  const boardArrows = useMemo((): Array<{ from: string; to: string; color?: string }> => {
    const list: Array<{ from: string; to: string; color?: string }> = [...lastMoveArrows];
    if (premoveArrow) {
      list.push({
        from: premoveArrow.from,
        to: premoveArrow.to,
        color: LICHESS_ARROW_COLORS.altBlue,
      });
    }
    return list;
  }, [lastMoveArrows, premoveArrow]);

  const trySubmit = useCallback(
    async (uci: string) => {
      setSubmitting(true);
      try {
        await onSubmitUci(uci);
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
      const wasPremove = pending.premove;
      setPending(null);
      if (wasPremove) {
        onPremoveChange?.(uci);
        return;
      }
      await trySubmit(uci);
    },
    [pending, trySubmit, onPremoveChange]
  );

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (submitting) return false;

      const board = new Chess(fen === "start" ? undefined : fen);
      const piece = board.get(sourceSquare as Square);
      const isPromotion =
        piece &&
        piece.type === "p" &&
        ((piece.color === "w" && targetSquare[1] === "8") ||
          (piece.color === "b" && targetSquare[1] === "1"));

      const isPremoveDrop =
        allowPremove &&
        playerRole &&
        !canMove &&
        isOwnPieceOnSquare(fen, sourceSquare, playerRole);

      if (isPremoveDrop) {
        if (sourceSquare === targetSquare) {
          onPremoveChange?.(null);
          return true;
        }
        if (isPromotion) {
          setPending({ from: sourceSquare, to: targetSquare, premove: true });
          setPromotionOpen(true);
          return true;
        }
        const uci = premoveUciFromSquares(fen, sourceSquare, targetSquare);
        if (uci) onPremoveChange?.(uci);
        return true;
      }

      if (!canMove) return false;

      if (isPromotion) {
        setPending({ from: sourceSquare, to: targetSquare, premove: false });
        setPromotionOpen(true);
        return true;
      }

      const uci = `${sourceSquare}${targetSquare}`.toLowerCase();
      void trySubmit(uci);
      return true;
    },
    [
      canMove,
      submitting,
      fen,
      trySubmit,
      allowPremove,
      playerRole,
      onPremoveChange,
    ]
  );

  return (
    <>
      <SimpleChessboard
        position={fen}
        onDrop={onDrop}
        orientation={orientation}
        lastMove={lastMove}
        arrows={boardArrows}
        boardMaxWidth="100%"
      />
      <PromotionDialog
        open={promotionOpen}
        pieceColor={pending ? new Chess(fen).get(pending.from as Square)?.color : undefined}
        onSelect={(p) => void onPromotionPick(p)}
      />
    </>
  );
}
