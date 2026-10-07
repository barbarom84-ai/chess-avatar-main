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

const FILES = "abcdefgh";

/**
 * Squares a piece could reach once the opponent has replied, Lichess-style: pure piece geometry,
 * ignoring blockers and occupancy (a square held by an own piece is a valid recapture premove).
 */
export function premoveDestinations(fen: string, square: string): string[] {
  const board = new Chess(fen === "start" ? undefined : fen);
  const piece = board.get(square as Square);
  if (!piece) return [];
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  const out = new Set<string>();
  const add = (f: number, r: number) => {
    if (f >= 0 && f < 8 && r >= 0 && r < 8 && (f !== file || r !== rank)) out.add(`${FILES[f]}${r + 1}`);
  };
  const ray = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) add(file + df * i, rank + dr * i);
  };
  const diagonals = () => [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([df, dr]) => ray(df, dr));
  const lines = () => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([df, dr]) => ray(df, dr));

  switch (piece.type) {
    case "p": {
      const dir = piece.color === "w" ? 1 : -1;
      add(file, rank + dir);
      if (rank === (piece.color === "w" ? 1 : 6)) add(file, rank + 2 * dir);
      add(file - 1, rank + dir);
      add(file + 1, rank + dir);
      break;
    }
    case "n":
      for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
        add(file + df, rank + dr);
      }
      break;
    case "b":
      diagonals();
      break;
    case "r":
      lines();
      break;
    case "q":
      diagonals();
      lines();
      break;
    case "k": {
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) add(file + df, rank + dr);
      const homeRank = piece.color === "w" ? "1" : "8";
      if (square === `e${homeRank}`) {
        const rights = board.getCastlingRights(piece.color);
        if (rights.k) out.add(`g${homeRank}`);
        if (rights.q) out.add(`c${homeRank}`);
      }
      break;
    }
  }
  return [...out];
}

export function premoveArrowFromUci(
  uci: string | null | undefined
): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}
