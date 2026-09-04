import type { ReviewedMove } from "@/lib/game-review";
import { inferDefaultSaveSide } from "@/lib/pgn-import";

export type ReviewPlayerColor = "white" | "black";

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
  sideToMove?: ReviewPlayerColor;
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
