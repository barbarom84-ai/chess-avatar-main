import type { ReviewedMove } from "@/lib/game-review";
import { inferDefaultSaveSide } from "@/lib/pgn-import";

export type ReviewPlayerColor = "white" | "black";

const FILES = "abcdefgh";
const PIECE_ORDER = "KQRBNP";

function sortInventory(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const typeDelta = PIECE_ORDER.indexOf(a[0]) - PIECE_ORDER.indexOf(b[0]);
    if (typeDelta !== 0) return typeDelta;
    return a.slice(1).localeCompare(b.slice(1));
  });
}

export function oppositeReviewColor(
  side?: ReviewPlayerColor | null
): ReviewPlayerColor | undefined {
  if (side === "white") return "black";
  if (side === "black") return "white";
  return undefined;
}

/** Whose turn it is on the given FEN (displayed board). */
export function turnFromFen(fen?: string | null): ReviewPlayerColor | undefined {
  if (!fen) return undefined;
  const turn = fen.trim().split(/\s+/)[1];
  if (turn === "w") return "white";
  if (turn === "b") return "black";
  return undefined;
}

/**
 * Compact piece list from a FEN placement field, e.g.
 * `White: Ke1 Qd1 Nb1 …; Black: ke8 qd8 ng8 …`
 * Used so the coach cannot invent pieces that are not on the board.
 */
export function pieceInventoryFromFen(fen?: string | null): string | undefined {
  const placement = fen?.trim().split(/\s+/)[0];
  if (!placement) return undefined;
  const white: string[] = [];
  const black: string[] = [];
  const ranks = placement.split("/");
  for (let r = 0; r < ranks.length; r++) {
    let file = 0;
    for (const ch of ranks[r]) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      if (file > 7 || !"PNBRQKpnbrqk".includes(ch)) return undefined;
      const sq = `${FILES[file]}${8 - r}`;
      if (ch === ch.toUpperCase()) white.push(`${ch}${sq}`);
      else black.push(`${ch.toUpperCase()}${sq}`);
      file += 1;
    }
  }
  if (!white.length && !black.length) return undefined;
  return `White: ${sortInventory(white).join(" ")}; Black: ${sortInventory(black).join(" ")}`;
}

/** Structured board facts sent to /api/coach/chat (and reused by the review UI). */
export type ReviewChatContext = {
  fen?: string;
  fenBefore?: string;
  lastMove?: string;
  lastMoveUci?: string;
  bestMove?: string;
  bestMoveUci?: string;
  classification?: string;
  cpl?: number;
  playerEval?: number;
  bestEval?: number;
  /** Who played the displayed (last) move — from fenBefore. */
  sideToMove?: ReviewPlayerColor;
  /** Who is to move NOW on the displayed board (fen after the move). */
  turnToMove?: ReviewPlayerColor;
  /** Pieces actually on the displayed board. */
  boardPieces?: string;
  playerColor?: ReviewPlayerColor;
  isPlayerMove?: boolean;
  opening?: string;
  whiteName?: string;
  blackName?: string;
  moveNumber?: number;
  lastExplanation?: string;
};

export function inferReviewPlayerColor(params: {
  pgn: string;
  hint?: string | null;
  playerColor?: ReviewPlayerColor | null;
  emailLocalPart?: string | null;
}): ReviewPlayerColor | null {
  return inferDefaultSaveSide(params) ?? params.playerColor ?? null;
}

/** Same gate as the old inline Coach IA card: skip book-quality / best moves. */
export function isExplainableReviewedMove(
  move: ReviewedMove | null | undefined
): boolean {
  if (!move?.bestMove) return false;
  if (move.uci === move.bestMove) return false;
  return (
    move.classification !== "best" &&
    move.classification !== "excellent" &&
    move.classification !== "brilliant"
  );
}

export function buildReviewChatContext(args: {
  fen?: string | null;
  fenBefore?: string | null;
  move?: ReviewedMove | null;
  playerColor?: ReviewPlayerColor | null;
  openingName?: string | null;
  whiteName?: string | null;
  blackName?: string | null;
  moveNumber?: number | null;
  lastExplanation?: string | null;
}): ReviewChatContext | undefined {
  const move = args.move ?? null;
  const fen = args.fen?.trim() || undefined;
  const fenBefore = args.fenBefore?.trim() || undefined;
  if (!move && !fen) return undefined;

  const playerColor = args.playerColor ?? undefined;
  const sideToMove = move?.sideToMove;
  const turnToMove =
    turnFromFen(fen) ?? (sideToMove ? oppositeReviewColor(sideToMove) : undefined);
  const isPlayerMove =
    playerColor && sideToMove ? playerColor === sideToMove : undefined;

  return {
    fen,
    fenBefore,
    lastMove: move?.san,
    lastMoveUci: move?.uci,
    bestMove: move?.bestSan || move?.bestMove || undefined,
    bestMoveUci: move?.bestMove || undefined,
    classification: move?.classification,
    cpl: typeof move?.cpl === "number" ? move.cpl : undefined,
    playerEval: typeof move?.playerEval === "number" ? move.playerEval : undefined,
    bestEval: typeof move?.bestEval === "number" ? move.bestEval : undefined,
    sideToMove,
    turnToMove,
    boardPieces: pieceInventoryFromFen(fen),
    playerColor,
    isPlayerMove,
    opening: args.openingName?.trim() || undefined,
    whiteName: args.whiteName?.trim() || undefined,
    blackName: args.blackName?.trim() || undefined,
    moveNumber: typeof args.moveNumber === "number" ? args.moveNumber : undefined,
    lastExplanation: args.lastExplanation?.trim() || undefined,
  };
}

export function isReviewWhyQuestion(message: string, lang: "fr" | "en"): boolean {
  const n = message.trim().toLowerCase();
  if (!n) return false;
  if (lang === "fr") {
    return (
      n.includes("pourquoi ce coup") ||
      n.includes("pourquoi cette") ||
      n.includes("meilleure suite")
    );
  }
  return (
    n.includes("why this move") ||
    n.includes("best continuation") ||
    n.includes("why did i")
  );
}

export function reviewContextCanExplain(
  review: ReviewChatContext | null | undefined
): boolean {
  if (!review?.fenBefore || !review.lastMoveUci || !review.bestMoveUci) {
    return false;
  }
  if (review.lastMoveUci === review.bestMoveUci) return false;
  if (review.sideToMove !== "white" && review.sideToMove !== "black") return false;
  if (typeof review.cpl !== "number") return false;
  const cls = review.classification;
  return cls !== "best" && cls !== "excellent" && cls !== "brilliant";
}
