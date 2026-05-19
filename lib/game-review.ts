import { Chess } from "chess.js";
import {
  classifyMove,
  computeGameAccuracy,
  type MoveClassification,
  type MoveEvalInput,
  type GameAccuracyResult,
} from "./analysis-engine";
import { computeOpeningByPly } from "./openings-registry";
import {
  type AnalysisStrictnessId,
  getAnalysisProfile,
  DEFAULT_ANALYSIS_STRICTNESS,
} from "./analysis-profiles";

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
  /** Local opening theory — no Stockfish eval for this ply. */
  isBook?: boolean;
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

/**
 * Prochain coup UCI de la ligne principale depuis une position alignée avec la partie,
 * ou `null` si le préfixe ne suit plus la partie ou s'il n'y a plus de coup à jouer.
 */
export function nextMainlineUciIfAlignedWithGame(
  parsed: ParsedGameForReview,
  branchMainlinePly: number,
  alignedPrefix: { uci: string }[]
): string | null {
  const { uci } = parsed;
  if (branchMainlinePly < 0) return null;
  const len = alignedPrefix.length;
  const nextIdx = branchMainlinePly + len;
  if (nextIdx >= uci.length) return null;
  for (let k = 0; k < len; k++) {
    if (alignedPrefix[k].uci !== uci[branchMainlinePly + k]) {
      return null;
    }
  }
  return uci[nextIdx];
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate a per-side accuracy + classification breakdown from the reviewed moves.
 * Reuses `computeGameAccuracy` from analysis-engine.ts and adds an averageCpl.
 * keyMoments contains the indexes of blunders and missed tactics (in playing order).
 */
export function aggregateReview(
  moves: ReviewedMove[],
  strictness: AnalysisStrictnessId = DEFAULT_ANALYSIS_STRICTNESS
): GameReviewResult {
  const whiteInputs: MoveEvalInput[] = [];
  const blackInputs: MoveEvalInput[] = [];
  let whiteCplSum = 0;
  let blackCplSum = 0;
  const keyMoments: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.isBook) continue;
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

  const whiteAcc = computeGameAccuracy(whiteInputs, strictness);
  const blackAcc = computeGameAccuracy(blackInputs, strictness);

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
// Full-game analysis (shared by useGameReview + PlayableChessboard)
// ---------------------------------------------------------------------------

/** Same return shape as `useStockfish` → `getBestMoveAndEval`. */
export type GetBestMoveAndEvalFn = (
  fen: string,
  depth?: number
) => Promise<{
  move: string;
  evalPawns: number;
  isMate?: boolean;
  mateInMoves?: number;
}>;

export class ReviewCancelledError extends Error {
  constructor() {
    super("Review cancelled");
    this.name = "ReviewCancelledError";
  }
}

function opposite(side: "white" | "black"): "white" | "black" {
  return side === "white" ? "black" : "white";
}

/**
 * Stockfish's `score cp` is reported from the side-to-move's perspective.
 * We convert to white POV so all CPL math stays consistent.
 */
function normalizeToWhitePov(
  evalPawnsStmPov: number,
  sideToMove: "white" | "black"
): number {
  return sideToMove === "white" ? evalPawnsStmPov : -evalPawnsStmPov;
}

/**
 * Convert a signed `mate in N` (side-to-move POV, as Stockfish reports it)
 * to a signed value in white POV.
 */
function mateToWhitePov(
  mateInMovesStmPov: number,
  sideToMove: "white" | "black"
): number {
  return sideToMove === "white" ? mateInMovesStmPov : -mateInMovesStmPov;
}

type TerminalKind = "checkmate" | "stalemate" | "draw" | null;

function classifyTerminalPosition(fen: string): TerminalKind {
  try {
    const c = new Chess(fen);
    if (c.isCheckmate()) return "checkmate";
    if (c.isStalemate()) return "stalemate";
    if (
      c.isInsufficientMaterial() ||
      c.isThreefoldRepetition() ||
      c.isDraw()
    ) {
      return "draw";
    }
    return null;
  } catch {
    return null;
  }
}

export interface AnalyzeParsedGameForReviewOptions {
  parsed: ParsedGameForReview;
  getBestMoveAndEval: GetBestMoveAndEvalFn;
  depth: number;
  /** Maximum plies to analyze (default: all plies in `parsed`). */
  maxPlies?: number;
  analysisStrictness?: AnalysisStrictnessId;
  /** Cooperative cancellation between engine awaits. */
  signal?: AbortSignal;
  isCancelled?: () => boolean;
  /** Stream each reviewed move (e.g. for live progress UI). */
  onPartialMove?: (move: ReviewedMove, ply: number) => void;
  /** After each ply is fully analyzed: completed count (1…total), total plies. */
  onProgress?: (completed: number, total: number) => void;
}

function throwIfCancelled(
  signal: AbortSignal | undefined,
  isCancelled: (() => boolean) | undefined
): void {
  if (signal?.aborted) throw new ReviewCancelledError();
  if (isCancelled?.()) throw new ReviewCancelledError();
}

type BestMoveEvalResult = Awaited<ReturnType<GetBestMoveAndEvalFn>>;

function fenCacheKey(fen: string, searchDepth: number): string {
  return `${fen}|${searchDepth}`;
}

/** Wrap engine calls with per-session FEN cache (reuses fenAfter from prior plies). */
export function createCachedGetBestMoveAndEval(
  getBestMoveAndEval: GetBestMoveAndEvalFn
): GetBestMoveAndEvalFn {
  const fenCache = new Map<string, BestMoveEvalResult>();
  return (fen: string, searchDepth?: number) => {
    const d = searchDepth ?? 18;
    const key = fenCacheKey(fen, d);
    const hit = fenCache.get(key);
    if (hit) return Promise.resolve(hit);
    return getBestMoveAndEval(fen, d).then((result) => {
      fenCache.set(key, result);
      return result;
    });
  };
}

/**
 * Reviewed move for a ply that matches local opening theory (no engine search).
 */
export function buildBookTheoryReviewedMove(
  args: {
    ply: number;
    san: string;
    uci: string;
    sideToMove: "white" | "black";
    /** Eval (white POV) carried from the last engine line or 0 at game start. */
    evalWhitePawns: number;
  },
  strictness: AnalysisStrictnessId = DEFAULT_ANALYSIS_STRICTNESS
): ReviewedMove {
  return {
    ...buildReviewedMove(
      {
        ply: args.ply,
        san: args.san,
        uci: args.uci,
        sideToMove: args.sideToMove,
        evalBefore: args.evalWhitePawns,
        bestMove: args.uci,
        bestSan: args.san,
        bestEval: args.evalWhitePawns,
        playerEval: args.evalWhitePawns,
      },
      strictness
    ),
    isBook: true,
  };
}

/** Lower depth in quiet middlegame positions; full depth in opening, endgame, or after swings. */
export function adaptiveDepthForPly(
  ply: number,
  totalPlies: number,
  baseDepth: number,
  lastEvalSwingPawns: number
): number {
  const inOpening = ply < 8;
  const inEndgame = ply >= Math.max(0, totalPlies - 10);
  const volatile = lastEvalSwingPawns >= 1.5;
  if (inOpening || inEndgame || volatile) return baseDepth;
  return Math.max(10, baseDepth - 4);
}

/**
 * Ply-by-ply Stockfish review: same logic as the Game Reviewer UI.
 */
export async function analyzeParsedGameForReview(
  options: AnalyzeParsedGameForReviewOptions
): Promise<GameReviewResult> {
  const {
    parsed,
    getBestMoveAndEval,
    depth,
    maxPlies = Infinity,
    analysisStrictness = DEFAULT_ANALYSIS_STRICTNESS,
    signal,
    isCancelled,
    onPartialMove,
    onProgress,
  } = options;

  const totalPlies = Math.min(parsed.san.length, Math.max(0, maxPlies));
  const collected: ReviewedMove[] = [];
  const cachedGet = createCachedGetBestMoveAndEval(getBestMoveAndEval);
  const openingByPly = computeOpeningByPly(parsed.uci.slice(0, totalPlies));
  let lastEvalSwing = 0;
  let evalWhiteCarry = 0;

  for (let ply = 0; ply < totalPlies; ply++) {
    throwIfCancelled(signal, isCancelled);

    const fenBefore = parsed.fenBefore[ply];
    const fenAfter = parsed.fenAfter[ply];
    const san = parsed.san[ply];
    const uci = parsed.uci[ply];
    const sideToMove = parsed.sideToMove[ply];

    if (openingByPly[ply]) {
      const reviewed = buildBookTheoryReviewedMove(
        { ply, san, uci, sideToMove, evalWhitePawns: evalWhiteCarry },
        analysisStrictness
      );
      collected.push(reviewed);
      onPartialMove?.(reviewed, ply);
      onProgress?.(ply + 1, totalPlies);
      continue;
    }

    const plyDepth = adaptiveDepthForPly(ply, totalPlies, depth, lastEvalSwing);
    const best = await cachedGet(fenBefore, plyDepth);
    throwIfCancelled(signal, isCancelled);

    let playerEvalPawns = best.evalPawns;
    let isMatePlayer: boolean | undefined = best.isMate;
    let playerMateInMovesWhite: number | undefined =
      best.mateInMoves !== undefined
        ? mateToWhitePov(best.mateInMoves, sideToMove)
        : undefined;
    const playerIsBest = best.move && best.move === uci;
    if (!playerIsBest) {
      const terminal = classifyTerminalPosition(fenAfter);
      if (terminal === "checkmate") {
        playerEvalPawns = sideToMove === "white" ? 10 : -10;
        isMatePlayer = true;
        playerMateInMovesWhite = sideToMove === "white" ? 1 : -1;
      } else if (terminal !== null) {
        playerEvalPawns = 0;
        isMatePlayer = false;
        playerMateInMovesWhite = undefined;
      } else {
        const afterDepth = adaptiveDepthForPly(ply + 1, totalPlies, depth, lastEvalSwing);
        const afterPlayer = await cachedGet(fenAfter, afterDepth);
        throwIfCancelled(signal, isCancelled);
        playerEvalPawns = normalizeToWhitePov(
          afterPlayer.evalPawns,
          opposite(sideToMove)
        );
        isMatePlayer = afterPlayer.isMate;
        playerMateInMovesWhite =
          afterPlayer.mateInMoves !== undefined
            ? mateToWhitePov(afterPlayer.mateInMoves, opposite(sideToMove))
            : undefined;
      }
    }

    const evalBeforeWhite = normalizeToWhitePov(best.evalPawns, sideToMove);
    const bestEvalWhite = evalBeforeWhite;

    const rawBestUci = best.move ?? "";
    const bestSan = rawBestUci ? uciToSan(fenBefore, rawBestUci) : "";
    const bestUci = bestSan ? rawBestUci : "";

    const bestMateInMovesWhite =
      best.mateInMoves !== undefined
        ? mateToWhitePov(best.mateInMoves, sideToMove)
        : undefined;

    const reviewed = buildReviewedMove(
      {
        ply,
        san,
        uci,
        sideToMove,
        evalBefore: evalBeforeWhite,
        bestMove: bestUci,
        bestSan,
        bestEval: bestEvalWhite,
        playerEval: playerIsBest ? bestEvalWhite : playerEvalPawns,
        isMateBest: best.isMate,
        isMatePlayer,
        bestMateInMoves: bestMateInMovesWhite,
        playerMateInMoves: playerIsBest
          ? bestMateInMovesWhite
          : playerMateInMovesWhite,
      },
      analysisStrictness
    );

    const evalSwing = Math.abs(reviewed.evalBefore - reviewed.playerEval);
    lastEvalSwing = evalSwing;
    evalWhiteCarry = reviewed.playerEval;

    collected.push(reviewed);
    onPartialMove?.(reviewed, ply);
    onProgress?.(ply + 1, totalPlies);
  }

  return aggregateReview(collected, analysisStrictness);
}

/**
 * Build {@link ParsedGameForReview} from a list of SAN moves (main line).
 * Returns null if any move is illegal or empty.
 */
export function buildParsedGameFromSanHistory(
  sanMoves: string[]
): ParsedGameForReview | null {
  if (!sanMoves.length) return null;
  const replay = new Chess();
  const fenBefore: string[] = [];
  const fenAfter: string[] = [];
  const san: string[] = [];
  const uci: string[] = [];
  const sideToMove: ("white" | "black")[] = [];

  for (const sanMove of sanMoves) {
    fenBefore.push(replay.fen());
    sideToMove.push(replay.turn() === "w" ? "white" : "black");
    const applied = replay.move(sanMove);
    if (!applied) return null;
    san.push(applied.san);
    uci.push(`${applied.from}${applied.to}${applied.promotion ?? ""}`);
    fenAfter.push(replay.fen());
  }

  return { fenBefore, fenAfter, san, uci, sideToMove, headers: {} };
}

// ---------------------------------------------------------------------------
// Per-move classification helper
// ---------------------------------------------------------------------------

const CONTEXT_WEIGHT_K = 1.2;
const SCALED_CPL_CAP = 500;

/**
 * Build a single ReviewedMove from raw engine outputs.
 * Uses analysis-engine.classifyMove so the badge matches aggregated accuracy.
 */
export function buildReviewedMove(
  args: {
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
  },
  strictness: AnalysisStrictnessId = DEFAULT_ANALYSIS_STRICTNESS
): ReviewedMove {
  const profile = getAnalysisProfile(strictness);

  const cplPawns =
    args.sideToMove === "white"
      ? args.bestEval - args.playerEval
      : args.playerEval - args.bestEval;
  const cpl = Math.max(0, Math.round(cplPawns * 100));

  const contextWeight =
    1 + CONTEXT_WEIGHT_K / (1 + Math.abs(args.evalBefore));
  const scaledCpl = Math.min(SCALED_CPL_CAP, cpl * contextWeight);

  const moveInput: MoveEvalInput = {
    bestEvalPawns: args.bestEval,
    playerEvalPawns: args.playerEval,
    sideToMove: args.sideToMove,
    evalBeforePawns: args.evalBefore,
    isMateBest: args.isMateBest,
    isMatePlayer: args.isMatePlayer,
  };
  const classification = classifyMove(scaledCpl, moveInput, profile);

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

/**
 * Cache key for persisted reviews: same game + strictness + depth can hit cloud cache.
 */
export function hashReviewCacheKey(
  pgn: string,
  strictness: AnalysisStrictnessId,
  depth: number
): string {
  return hashPgn(`${pgn}\nstrict=${strictness}\ndepth=${depth}`);
}
