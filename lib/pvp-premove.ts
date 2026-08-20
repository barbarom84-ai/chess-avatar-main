import { Chess, type Square } from "chess.js";
import { normalizeUci } from "@/lib/pvp-chess";
import { applyUciMove } from "@/lib/learn-chess-utils";

/** Build UCI from drag when setting a premove (no strict legality check). */
export function premoveUciFromSquares(
  fen: string,
  from: string,
  to: string,
  promotion?: "q" | "r" | "b" | "n"
): string | null {
  const uci = `${from}${to}${promotion ?? ""}`.toLowerCase();
  return normalizeUci(uci);
}

/** True if the square holds a piece of the given side. */
export function isOwnPieceOnSquare(
  fen: string,
  square: string,
  role: "white" | "black"
): boolean {
  const board = new Chess(fen === "start" ? undefined : fen);
  const piece = board.get(square as Square);
  if (!piece) return false;
  return (role === "white" && piece.color === "w") || (role === "black" && piece.color === "b");
}

/** Whether a queued premove can be attempted on the current position. */
export function isPremoveLegalNow(fen: string, uci: string): boolean {
  const normalized = normalizeUci(uci);
  if (!normalized) return false;
  const board = new Chess(fen === "start" ? undefined : fen);
  return applyUciMove(board, normalized);
}

export function premoveArrowFromUci(
  uci: string | null | undefined
): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}
