import { Chess, type Color, type Square } from "chess.js";
import { LICHESS_ARROW_COLORS } from "@/lib/chess-arrows";
import { uciToSquares } from "@/lib/game-review";

export type ReviewBoardArrow = { from: string; to: string; color?: string };

export const REVIEW_ARROW_COLORS = {
  lastMove: LICHESS_ARROW_COLORS.shiftCtrlAltYellow,
  previousMove: "rgba(34, 211, 238, 0.48)",
  opponentThreat: LICHESS_ARROW_COLORS.shiftCtrlRed,
  ourThreat: "rgba(249, 115, 22, 0.82)",
  bestCritical: "rgba(239, 68, 68, 0.85)",
  bestAlternative: "rgba(34, 197, 94, 0.85)",
} as const;

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

const MAX_THREAT_ARROWS = 8;
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function arrowKey(from: string, to: string): string {
  return `${from}${to}`;
}

function findKing(chess: Chess, color: Color): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === "k" && piece.color === color) {
        return `${FILES[f]}${8 - r}` as Square;
      }
    }
  }
  return null;
}

function pieceValueAt(chess: Chess, square: Square): number {
  const piece = chess.get(square);
  return piece ? (PIECE_VALUE[piece.type] ?? 1) : 1;
}

/**
 * Checks, hanging-piece attacks, and winning captures on the current FEN.
 */
export function threatArrowsFromFen(fen: string): ReviewBoardArrow[] {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return [];
  }

  const turn = chess.turn();
  const opp: Color = turn === "w" ? "b" : "w";
  const arrows: ReviewBoardArrow[] = [];
  const seen = new Set<string>();

  const push = (from: string, to: string, color: string) => {
    if (from === to) return;
    const key = arrowKey(from, to);
    if (seen.has(key)) return;
    seen.add(key);
    arrows.push({ from, to, color });
  };

  const ourKing = findKing(chess, turn);
  if (ourKing && chess.isAttacked(ourKing, opp)) {
    for (const from of chess.attackers(ourKing, opp)) {
      push(from, ourKing, REVIEW_ARROW_COLORS.opponentThreat);
    }
  }

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece || piece.color !== turn || piece.type === "k") continue;
      const square = `${FILES[f]}${8 - r}` as Square;
      const attackers = chess.attackers(square, opp);
      if (attackers.length === 0) continue;
      const defenders = chess.attackers(square, turn);
      const nonKingDefenders = defenders.filter(
        (from) => chess.get(from)?.type !== "k"
      );
      const minAttacker = Math.min(
        ...attackers.map((from) => pieceValueAt(chess, from))
      );
      // King-only "defense" does not save f7/f2 mate threats, and a surplus
      // of attackers is a real capture threat even if the square is guarded.
      const hanging =
        defenders.length === 0 ||
        attackers.length > defenders.length ||
        minAttacker < (PIECE_VALUE[piece.type] ?? 1) ||
        nonKingDefenders.length === 0;
      if (!hanging) continue;
      const sorted = [...attackers].sort(
        (a, b) => pieceValueAt(chess, a) - pieceValueAt(chess, b)
      );
      for (const from of sorted.slice(0, 2)) {
        push(from, square, REVIEW_ARROW_COLORS.opponentThreat);
      }
    }
  }

  for (const move of chess.moves({ verbose: true })) {
    if (!move.captured) continue;
    const attacker = chess.get(move.from);
    if (!attacker) continue;
    const capturedVal = PIECE_VALUE[move.captured] ?? 0;
    const attackerVal = PIECE_VALUE[attacker.type] ?? 0;
    const defenders = chess.attackers(move.to, opp);
    const hanging = defenders.length === 0;
    const winning = attackerVal < capturedVal;
    const isCheck = move.san.includes("+") || move.san.includes("#");
    if (!hanging && !winning && !isCheck && capturedVal < 5) continue;
    push(move.from, move.to, REVIEW_ARROW_COLORS.ourThreat);
  }

  return arrows.slice(0, MAX_THREAT_ARROWS);
}

export function reviewMainBoardArrows(args: {
  fen: string;
  lastMoveUci?: string | null;
  previousMoveUci?: string | null;
  bestMoveUci?: string | null;
  showBest?: boolean;
  bestIsCritical?: boolean;
}): ReviewBoardArrow[] {
  const last = args.lastMoveUci ? uciToSquares(args.lastMoveUci) : null;
  const previous = args.previousMoveUci
    ? uciToSquares(args.previousMoveUci)
    : null;
  const best =
    args.showBest && args.bestMoveUci
      ? uciToSquares(args.bestMoveUci)
      : null;

  const reserved = new Set<string>();
  if (last) reserved.add(arrowKey(last.from, last.to));
  if (previous) reserved.add(arrowKey(previous.from, previous.to));
  if (best) reserved.add(arrowKey(best.from, best.to));

  const out: ReviewBoardArrow[] = threatArrowsFromFen(args.fen).filter(
    (arrow) => !reserved.has(arrowKey(arrow.from, arrow.to))
  );

  if (previous) {
    out.push({
      from: previous.from,
      to: previous.to,
      color: REVIEW_ARROW_COLORS.previousMove,
    });
  }
  if (last) {
    out.push({
      from: last.from,
      to: last.to,
      color: REVIEW_ARROW_COLORS.lastMove,
    });
  }
  if (best) {
    out.push({
      from: best.from,
      to: best.to,
      color: args.bestIsCritical
        ? REVIEW_ARROW_COLORS.bestCritical
        : REVIEW_ARROW_COLORS.bestAlternative,
    });
  }

  return out;
}
