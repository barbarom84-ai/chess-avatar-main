export type SideToMove = "w" | "b";

export type FenParts = {
  placement: string;
  turn: SideToMove;
  castling: string;
  enPassant: string;
  halfmove: string;
  fullmove: string;
};

export function parseFenParts(fen: string): FenParts {
  const parts = fen.trim().split(/\s+/);
  return {
    placement: parts[0] ?? "",
    turn: parts[1] === "b" ? "b" : "w",
    castling: parts[2] ?? "-",
    enPassant: parts[3] ?? "-",
    halfmove: parts[4] ?? "0",
    fullmove: parts[5] ?? "1",
  };
}

export function buildFen(parts: FenParts): string {
  return [
    parts.placement,
    parts.turn,
    parts.castling,
    parts.enPassant,
    parts.halfmove,
    parts.fullmove,
  ].join(" ");
}

export function getSideToMoveFromFen(fen: string): SideToMove {
  return parseFenParts(fen).turn;
}

export function setSideToMoveInFen(fen: string, turn: SideToMove): string {
  const parts = parseFenParts(fen);
  if (!parts.placement) return fen;
  return buildFen({ ...parts, turn });
}

/** Ensures a full 6-field FEN; optional turn overrides the active color field. */
export function normalizeFen(fen: string, turn?: SideToMove): string {
  const trimmed = fen.trim();
  if (!trimmed) return trimmed;
  const parts = parseFenParts(trimmed);
  if (turn) parts.turn = turn;
  return buildFen(parts);
}

export function boardOrientationFromFen(fen: string): "white" | "black" {
  return getSideToMoveFromFen(fen) === "b" ? "black" : "white";
}

export function boardOrientationFromSide(turn: SideToMove): "white" | "black" {
  return turn === "b" ? "black" : "white";
}
