import { Chess } from "chess.js";
import type { ReviewedMove } from "@/lib/game-review";
import { inferDefaultSaveSide } from "@/lib/pgn-import";
import { localizeSan } from "@/lib/localized-san";

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

/** Legal SAN moves from a FEN, so the coach cannot invent a continuation. */
export function legalMovesFromFen(fen?: string | null): string[] {
  const raw = fen?.trim();
  if (!raw) return [];
  try {
    return new Chess(raw).moves();
  } catch {
    return [];
  }
}

/** ASCII diagram of the current board (rank 8 at the top). */
export function asciiBoardFromFen(fen?: string | null): string | undefined {
  const raw = fen?.trim();
  if (!raw) return undefined;
  try {
    return new Chess(raw).ascii();
  } catch {
    return undefined;
  }
}

/** Structured board facts sent to /api/coach/chat (and reused by the review UI). */
export type ReviewEngineLine = {
  rank: number;
  san: string;
  uci: string;
  pvSan: string[];
  evalWhitePov: number;
  isMate?: boolean;
  mateInMovesWhite?: number;
};

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
  /** Legal SAN moves from the displayed FEN (side to move now). */
  legalMovesNow?: string[];
  /** Legal SAN moves from the position BEFORE the last ply. */
  legalMovesBefore?: string[];
  /** ASCII diagram of the displayed board. */
  boardAscii?: string;
  /** Stockfish MultiPV lines for the displayed FEN (side to move now). */
  engineLinesNow?: ReviewEngineLine[];
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
  /** PGN ply identity — used when engine analysis has not reached this move yet. */
  lastMoveSan?: string | null;
  lastMoveUci?: string | null;
  lastMoveSide?: ReviewPlayerColor | null;
  playerColor?: ReviewPlayerColor | null;
  openingName?: string | null;
  whiteName?: string | null;
  blackName?: string | null;
  moveNumber?: number | null;
  lastExplanation?: string | null;
  engineLinesNow?: ReviewEngineLine[] | null;
}): ReviewChatContext | undefined {
  const move = args.move ?? null;
  const fen = args.fen?.trim() || undefined;
  const fenBefore = args.fenBefore?.trim() || undefined;
  if (!move && !fen && !args.lastMoveSan && !args.lastMoveUci) return undefined;

  const playerColor = args.playerColor ?? undefined;
  const sideToMove = move?.sideToMove ?? args.lastMoveSide ?? undefined;
  const turnToMove =
    turnFromFen(fen) ?? (sideToMove ? oppositeReviewColor(sideToMove) : undefined);
  const isPlayerMove =
    playerColor && sideToMove ? playerColor === sideToMove : undefined;

  return {
    fen,
    fenBefore,
    lastMove: move?.san || args.lastMoveSan?.trim() || undefined,
    lastMoveUci: move?.uci || args.lastMoveUci?.trim() || undefined,
    bestMove: move?.bestSan || move?.bestMove || undefined,
    bestMoveUci: move?.bestMove || undefined,
    classification: move?.classification,
    cpl: typeof move?.cpl === "number" ? move.cpl : undefined,
    playerEval: typeof move?.playerEval === "number" ? move.playerEval : undefined,
    bestEval: typeof move?.bestEval === "number" ? move.bestEval : undefined,
    sideToMove,
    turnToMove,
    boardPieces: pieceInventoryFromFen(fen),
    legalMovesNow: fen ? legalMovesFromFen(fen) : undefined,
    legalMovesBefore: fenBefore ? legalMovesFromFen(fenBefore) : undefined,
    boardAscii: fen ? asciiBoardFromFen(fen) : undefined,
    engineLinesNow: sanitizeEngineLinesNow(fen, args.engineLinesNow),
    playerColor,
    isPlayerMove,
    opening: args.openingName?.trim() || undefined,
    whiteName: args.whiteName?.trim() || undefined,
    blackName: args.blackName?.trim() || undefined,
    moveNumber: typeof args.moveNumber === "number" ? args.moveNumber : undefined,
    lastExplanation: args.lastExplanation?.trim() || undefined,
  };
}

/** Compare placement, turn, castling, and en passant — ignore move clocks. */
function fenBoardKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

/** Recover the ply that produced `fenAfter` from `fenBefore` (SAN + UCI + side). */
export function inferPlayedMoveFromFens(
  fenBefore?: string | null,
  fenAfter?: string | null
): { san: string; uci: string; side: ReviewPlayerColor } | undefined {
  const beforeFen = fenBefore?.trim();
  const afterFen = fenAfter?.trim();
  if (!beforeFen || !afterFen) return undefined;
  let after: Chess;
  try {
    after = new Chess(afterFen);
  } catch {
    return undefined;
  }
  const afterKey = fenBoardKey(after.fen());
  let before: Chess;
  try {
    before = new Chess(beforeFen);
  } catch {
    return undefined;
  }
  const side: ReviewPlayerColor = before.turn() === "b" ? "black" : "white";
  for (const candidate of before.moves({ verbose: true })) {
    const probe = new Chess(beforeFen);
    const played = probe.move(candidate);
    if (!played) continue;
    if (fenBoardKey(probe.fen()) !== afterKey) continue;
    return {
      san: played.san,
      uci: `${played.from}${played.to}${played.promotion ?? ""}`,
      side,
    };
  }
  return undefined;
}

/** Recompute board facts from FEN so the API does not trust a stale client payload. */
export function hydrateReviewChatContext(
  review?: ReviewChatContext | null
): ReviewChatContext | undefined {
  if (!review) return undefined;
  const fen = review.fen?.trim() || undefined;
  if (!fen) return review;
  const inferred =
    !review.lastMove || !review.lastMoveUci || !review.sideToMove
      ? inferPlayedMoveFromFens(review.fenBefore, fen)
      : undefined;
  const lastMove = review.lastMove?.trim() || inferred?.san;
  const lastMoveUci = review.lastMoveUci?.trim() || inferred?.uci;
  const sideToMove = review.sideToMove ?? inferred?.side;
  const playerColor = review.playerColor;
  return {
    ...review,
    fen,
    lastMove,
    lastMoveUci,
    sideToMove,
    isPlayerMove:
      playerColor && sideToMove ? playerColor === sideToMove : review.isPlayerMove,
    turnToMove: turnFromFen(fen) ?? review.turnToMove,
    boardPieces: pieceInventoryFromFen(fen) ?? review.boardPieces,
    legalMovesNow: legalMovesFromFen(fen),
    legalMovesBefore: review.fenBefore
      ? legalMovesFromFen(review.fenBefore)
      : review.legalMovesBefore,
    boardAscii: asciiBoardFromFen(fen),
    engineLinesNow: sanitizeEngineLinesNow(fen, review.engineLinesNow),
  };
}

/** Keep only engine lines whose first SAN is legal on the displayed FEN. */
export function sanitizeEngineLinesNow(
  fen?: string,
  lines?: ReviewEngineLine[] | null
): ReviewEngineLine[] | undefined {
  if (!lines?.length) return undefined;
  const legal = new Set(legalMovesFromFen(fen));
  if (legal.size === 0) return undefined;
  const kept = lines.filter((line) => line.san && line.uci && legal.has(line.san));
  return kept.length ? kept : undefined;
}

export type ReviewCoachQuestionIntent =
  | "why_last"
  | "best_line"
  | "how_to_play"
  | "lost_advantage"
  | "other";

function normalizeQuestion(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/['’`]/g, "'");
}

export function classifyReviewCoachQuestion(
  message: string,
  lang: "fr" | "en"
): ReviewCoachQuestionIntent {
  const n = normalizeQuestion(message);
  if (!n) return "other";
  if (lang === "fr") {
    if (n.includes("pourquoi ce coup") || n.includes("pourquoi cette")) {
      return "why_last";
    }
    if (n.includes("meilleure suite") || n.includes("meilleur coup")) {
      return "best_line";
    }
    if (n.includes("comment jouer")) return "how_to_play";
    if (n.includes("perdu l'avantage") || n.includes("ou j'ai perdu")) {
      return "lost_advantage";
    }
    return "other";
  }
  if (n.includes("why this move") || n.includes("why did")) return "why_last";
  if (n.includes("best continuation") || n.includes("best move")) return "best_line";
  if (n.includes("how to play") || n.includes("how should i play")) {
    return "how_to_play";
  }
  if (n.includes("lost the advantage") || n.includes("went wrong")) {
    return "lost_advantage";
  }
  return "other";
}

/** True when the chip should use the engine explain endpoint if data is ready. */
export function isReviewWhyQuestion(message: string, lang: "fr" | "en"): boolean {
  return classifyReviewCoachQuestion(message, lang) === "why_last";
}

/** Make review chip questions unambiguous for the chat model. */
export function expandReviewCoachUserMessage(
  message: string,
  review: ReviewChatContext | undefined,
  lang: "fr" | "en"
): string {
  const intent = classifyReviewCoachQuestion(message, lang);
  const rawMove = review?.lastMove || review?.lastMoveUci;
  const move = rawMove ? localizeSan(rawMove, lang) : "";
  const mover =
    review?.sideToMove === "black"
      ? lang === "fr"
        ? "les Noirs"
        : "Black"
      : review?.sideToMove === "white"
        ? lang === "fr"
          ? "les Blancs"
          : "White"
        : lang === "fr"
          ? "le camp qui vient de jouer"
          : "the side that just moved";
  const now =
    review?.turnToMove === "black"
      ? lang === "fr"
        ? "les Noirs"
        : "Black"
      : review?.turnToMove === "white"
        ? lang === "fr"
          ? "les Blancs"
          : "White"
        : lang === "fr"
          ? "le camp au trait"
          : "the side to move";

  if (intent === "why_last" && move) {
    if (lang === "fr") {
      return `${message.trim()}

Consignes : explique UNIQUEMENT le coup déjà joué ${move} par ${mover} (flèche jaune). Reste neutre — ne parle pas de « ton camp ». N'indique aucun coup à jouer maintenant pour ${now}.`;
    }
    return `${message.trim()}

Instructions: explain ONLY the move already played (${move} by ${mover}, yellow arrow). Stay side-neutral. Do not suggest a move to play now for ${now}.`;
  }

  if (intent === "best_line" || intent === "how_to_play") {
    const engineList = formatReviewEngineLines(review?.engineLinesNow, lang);
    if (lang === "fr") {
      if (engineList) {
        return `${message.trim()}

Consignes : la meilleure suite est MAINTENANT, pour ${now} sur l'échiquier affiché. Cite UNIQUEMENT parmi les 3 coups Stockfish : ${engineList}. Ce n'est PAS un coup joué par ${mover}. N'invente aucun autre SAN.`;
      }
      return `${message.trim()}

Consignes : les meilleurs coups moteur de ${now} ne sont pas encore prêts. Dis-le clairement. N'invente aucun coup.`;
    }
    if (engineList) {
      return `${message.trim()}

Instructions: the best continuation is NOW, for ${now} on the displayed board. Cite ONLY Stockfish's top 3: ${engineList}. It is NOT a move by ${mover}. Do not invent any other SAN.`;
    }
    return `${message.trim()}

Instructions: the engine's best moves for ${now} are not ready yet. Say so clearly. Do not invent a move.`;
  }

  return message.trim();
}

function formatReviewEngineLines(
  lines: ReviewEngineLine[] | undefined,
  lang: "fr" | "en"
): string {
  if (!lines?.length) return "";
  return lines
    .map((line) => {
      const san = localizeSan(line.san, lang);
      const rest = line.pvSan
        .slice(1, 4)
        .map((ply) => localizeSan(ply, lang))
        .join(" ");
      return `${line.rank}. ${san}${rest ? ` ${rest}` : ""}`;
    })
    .join(" ; ");
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
