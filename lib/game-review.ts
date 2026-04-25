import { Chess } from "chess.js";
import {
  computeGameAccuracy,
  type MoveClassification,
  type MoveEvalInput,
  type GameAccuracyResult,
} from "./analysis-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedGameForReview {
  /** FEN before each ply (length = total plies). */
  fenBefore: string[];
  /** FEN after each ply (length = total plies). */
  fenAfter: string[];
  /** SAN move per ply. */
  san: string[];
  /** UCI move per ply (e.g. "e2e4", "e7e8q"). */
  uci: string[];
  /** Side that played the move at each ply. */
  sideToMove: ("white" | "black")[];
  /** Headers parsed from the PGN (e.g. White, Black, Event, Result). */
  headers: Record<string, string>;
}

export interface ReviewedMove {
  /** 0-based ply index. */
  ply: number;
  san: string;
  uci: string;
  sideToMove: "white" | "black";
  /** Eval (white POV, pawns) before the move. */
  evalBefore: number;
  /** Engine best move at the position before the move (UCI). */
  bestMove: string;
  /** Engine best move in SAN (e.g. "Na6", "Nxd5+"). Empty when not computable. */
  bestSan: string;
  /** Eval (white POV, pawns) after the engine's best move. */
  bestEval: number;
  /** Eval (white POV, pawns) after the move actually played. */
  playerEval: number;
  /** Centipawn loss attributed to the move (always >= 0). */
  cpl: number;
  classification: MoveClassification;
  isMateBest?: boolean;
  isMatePlayer?: boolean;
  /**
   * Signed mate distance in moves (NOT plies) for the engine's best line,
   * normalized to white POV. Positive => white mates in N, negative => black
   * mates in N. Undefined when the engine never reported a mate score for
   * the best line.
   */
  bestMateInMoves?: number;
  /**
   * Signed mate distance in moves for the position after the played move,
   * normalized to white POV. Same sign convention as `bestMateInMoves`.
   */
  playerMateInMoves?: number;
}

export interface SideAccuracy extends GameAccuracyResult {
  /** Average raw centipawn loss for the side. */
  averageCpl: number;
}

export interface GameReviewResult {
  moves: ReviewedMove[];
  white: SideAccuracy;
  black: SideAccuracy;
  /** Indexes (in `moves`) of blunders and missed tactics, sorted ascending. */
  keyMoments: number[];
}

// ---------------------------------------------------------------------------
// PGN parsing
// ---------------------------------------------------------------------------

/**
 * Parse a PGN string into the per-ply structures the reviewer needs.
 * Variations and comments are dropped (we only inspect the mainline).
 * Returns null when the PGN cannot be loaded or contains no moves.
 */
export function parsePgnForReview(pgn: string): ParsedGameForReview | null {
  if (!pgn || typeof pgn !== "string") return null;
  let game: Chess;
  try {
    game = new Chess();
    game.loadPgn(pgn);
  } catch {
    return null;
  }

  const verbose = game.history({ verbose: true });
  if (verbose.length === 0) return null;

  const fenBefore: string[] = [];
  const fenAfter: string[] = [];
  const san: string[] = [];
  const uci: string[] = [];
  const sideToMove: ("white" | "black")[] = [];

  const replay = new Chess();
  for (const move of verbose) {
    fenBefore.push(replay.fen());
    sideToMove.push(replay.turn() === "w" ? "white" : "black");
    san.push(move.san);
    uci.push(`${move.from}${move.to}${move.promotion ?? ""}`);
    const applied = replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    if (!applied) {
      // Defensive: this should not happen because we replayed the exact verbose history.
      return null;
    }
    fenAfter.push(replay.fen());
  }

  let headers: Record<string, string> = {};
  try {
    headers = (game.header() ?? {}) as Record<string, string>;
  } catch {
    headers = {};
  }

  return { fenBefore, fenAfter, san, uci, sideToMove, headers };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate a per-side accuracy + classification breakdown from the reviewed moves.
 * Reuses `computeGameAccuracy` from analysis-engine.ts and adds an averageCpl.
 * keyMoments contains the indexes of blunders and missed tactics (in playing order).
 */
export function aggregateReview(moves: ReviewedMove[]): GameReviewResult {
  const whiteInputs: MoveEvalInput[] = [];
  const blackInputs: MoveEvalInput[] = [];
  let whiteCplSum = 0;
  let blackCplSum = 0;
  const keyMoments: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const input: MoveEvalInput = {
      bestEvalPawns: m.bestEval,
      playerEvalPawns: m.playerEval,
      sideToMove: m.sideToMove,
      evalBeforePawns: m.evalBefore,
      isMateBest: m.isMateBest,
      isMatePlayer: m.isMatePlayer,
    };
    if (m.sideToMove === "white") {
      whiteInputs.push(input);
      whiteCplSum += m.cpl;
    } else {
      blackInputs.push(input);
      blackCplSum += m.cpl;
    }
    if (m.classification === "blunder" || m.classification === "miss") {
      keyMoments.push(i);
    }
  }

  const whiteAcc = computeGameAccuracy(whiteInputs);
  const blackAcc = computeGameAccuracy(blackInputs);

  const white: SideAccuracy = {
    ...whiteAcc,
    averageCpl: whiteInputs.length > 0
      ? Math.round(whiteCplSum / whiteInputs.length)
      : 0,
  };
  const black: SideAccuracy = {
    ...blackAcc,
    averageCpl: blackInputs.length > 0
      ? Math.round(blackCplSum / blackInputs.length)
      : 0,
  };

  return { moves, white, black, keyMoments };
}

// ---------------------------------------------------------------------------
// Per-move classification helper
// ---------------------------------------------------------------------------

const CPL_BANDS = {
  excellent: 20,
  good: 50,
  inaccuracy: 100,
  mistake: 300,
} as const;

const MISS_SWING_PAWNS = 4.0;
const CONTEXT_WEIGHT_K = 1.2;
const SCALED_CPL_CAP = 500;

/**
 * Build a single ReviewedMove from raw engine outputs.
 * Mirrors the bands used by analysis-engine.classifyMove so the per-move badge
 * agrees with the aggregated accuracy.
 */
export function buildReviewedMove(args: {
  ply: number;
  san: string;
  uci: string;
  sideToMove: "white" | "black";
  evalBefore: number;
  bestMove: string;
  bestSan?: string;
  bestEval: number;
  playerEval: number;
  isMateBest?: boolean;
  isMatePlayer?: boolean;
  bestMateInMoves?: number;
  playerMateInMoves?: number;
}): ReviewedMove {
  const cplPawns =
    args.sideToMove === "white"
      ? args.bestEval - args.playerEval
      : args.playerEval - args.bestEval;
  const cpl = Math.max(0, Math.round(cplPawns * 100));

  const contextWeight =
    1 + CONTEXT_WEIGHT_K / (1 + Math.abs(args.evalBefore));
  const scaledCpl = Math.min(SCALED_CPL_CAP, cpl * contextWeight);

  const swing = Math.abs(args.playerEval - args.bestEval);
  const isMissedMate = !!args.isMateBest && !args.isMatePlayer;
  const isBigSwing = swing > MISS_SWING_PAWNS;
  let classification: MoveClassification;
  if (isMissedMate || isBigSwing) {
    classification = "miss";
  } else if (scaledCpl <= 0) {
    classification = "best";
  } else if (scaledCpl <= CPL_BANDS.excellent) {
    classification = "excellent";
  } else if (scaledCpl <= CPL_BANDS.good) {
    classification = "good";
  } else if (scaledCpl <= CPL_BANDS.inaccuracy) {
    classification = "inaccuracy";
  } else if (scaledCpl <= CPL_BANDS.mistake) {
    classification = "mistake";
  } else {
    classification = "blunder";
  }

  return {
    ply: args.ply,
    san: args.san,
    uci: args.uci,
    sideToMove: args.sideToMove,
    evalBefore: args.evalBefore,
    bestMove: args.bestMove,
    bestSan: args.bestSan ?? "",
    bestEval: args.bestEval,
    playerEval: args.playerEval,
    cpl,
    classification,
    isMateBest: args.isMateBest,
    isMatePlayer: args.isMatePlayer,
    bestMateInMoves: args.bestMateInMoves,
    playerMateInMoves: args.playerMateInMoves,
  };
}

/**
 * Convert a UCI move (e.g. "b8a6") to SAN (e.g. "Na6") in the context of `fen`.
 * Returns an empty string when the move is not legal in the position (the
 * caller should then fall back to displaying the UCI).
 */
export function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return "";
  try {
    const tmp = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    const move = tmp.move({ from, to, promotion });
    return move?.san ?? "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Tailwind text/border palette per classification (used by the badges and SAN list). */
export const CLASSIFICATION_COLORS: Record<
  MoveClassification,
  { bg: string; text: string; border: string; emoji: string }
> = {
  best: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    emoji: "★",
  },
  excellent: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-300",
    border: "border-cyan-500/40",
    emoji: "✓",
  },
  good: {
    bg: "bg-slate-500/15",
    text: "text-slate-300",
    border: "border-slate-500/40",
    emoji: "·",
  },
  inaccuracy: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-300",
    border: "border-yellow-500/40",
    emoji: "?!",
  },
  mistake: {
    bg: "bg-orange-500/15",
    text: "text-orange-300",
    border: "border-orange-500/40",
    emoji: "?",
  },
  blunder: {
    bg: "bg-red-500/20",
    text: "text-red-300",
    border: "border-red-500/50",
    emoji: "??",
  },
  miss: {
    bg: "bg-fuchsia-500/15",
    text: "text-fuchsia-300",
    border: "border-fuchsia-500/40",
    emoji: "‼",
  },
};

/** Convert a UCI move "e2e4"/"e7e8q" to {from, to, promotion?}. */
export function uciToSquares(uci: string): {
  from: string;
  to: string;
  promotion?: string;
} | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

/**
 * Stable hash of a PGN string (FNV-1a 32-bit -> hex). Used as cache key for
 * cloud persistence so identical games don't trigger a re-analysis.
 */
export function hashPgn(pgn: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < pgn.length; i++) {
    hash ^= pgn.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
