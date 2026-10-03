import { Chess, type Square } from "chess.js";
import {
  classifyMove,
  computeGameAccuracy,
  winProbability,
  type MoveClassification,
  type MoveEvalInput,
  type GameAccuracyResult,
} from "./analysis-engine";
import { computeOpeningByPly, isStrictBookPly } from "./openings-registry";
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
  /** Expected points (0..1) given away by the move. */
  winLoss?: number;
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
 * Counts use each move's own classification so they always match the badges.
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
      classification: m.classification,
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
  depth?: number,
  opts?: { multipv?: number }
) => Promise<{
  move: string;
  evalPawns: number;
  isMate?: boolean;
  mateInMoves?: number;
  /** Engine's second line, side-to-move POV (MultiPV ≥ 2). */
  second?: {
    move: string;
    evalPawns: number;
    isMate?: boolean;
    mateInMoves?: number;
  };
}>;

/** MultiPV used by the review: line 2 is needed to detect "great" (only good) moves. */
const REVIEW_MULTIPV = 2;

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

function fenCacheKey(fen: string, searchDepth: number, multipv: number): string {
  return `${fen}|${searchDepth}|${multipv}`;
}

/** Wrap engine calls with per-session FEN cache (reuses fenAfter from prior plies). */
export function createCachedGetBestMoveAndEval(
  getBestMoveAndEval: GetBestMoveAndEvalFn
): GetBestMoveAndEvalFn {
  const fenCache = new Map<string, BestMoveEvalResult>();
  return (fen: string, searchDepth?: number, opts?: { multipv?: number }) => {
    const d = searchDepth ?? 18;
    const key = fenCacheKey(fen, d, opts?.multipv ?? 1);
    const hit = fenCache.get(key);
    if (hit) return Promise.resolve(hit);
    return getBestMoveAndEval(fen, d, opts).then((result) => {
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
  let opponentPrevLoss = 0;

  for (let ply = 0; ply < totalPlies; ply++) {
    throwIfCancelled(signal, isCancelled);

    const fenBefore = parsed.fenBefore[ply];
    const fenAfter = parsed.fenAfter[ply];
    const san = parsed.san[ply];
    const uci = parsed.uci[ply];
    const sideToMove = parsed.sideToMove[ply];

    const bookOpening = openingByPly[ply];
    if (isStrictBookPly(bookOpening, parsed.uci, ply)) {
      const reviewed = buildBookTheoryReviewedMove(
        { ply, san, uci, sideToMove, evalWhitePawns: evalWhiteCarry },
        analysisStrictness
      );
      collected.push(reviewed);
      onPartialMove?.(reviewed, ply);
      onProgress?.(ply + 1, totalPlies);
      opponentPrevLoss = 0;
      continue;
    }

    const plyDepth = adaptiveDepthForPly(ply, totalPlies, depth, lastEvalSwing);
    const best = await cachedGet(fenBefore, plyDepth, { multipv: REVIEW_MULTIPV });
    throwIfCancelled(signal, isCancelled);

    let playerEvalPawns = best.evalPawns;
    let isMatePlayer: boolean | undefined = best.isMate;
    let playerMateInMovesWhite: number | undefined =
      best.mateInMoves !== undefined
        ? mateToWhitePov(best.mateInMoves, sideToMove)
        : undefined;
    const playerIsBest = Boolean(best.move) && sameMove(best.move, uci);
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
        const afterDepth = Math.min(
          adaptiveDepthForPly(ply + 1, totalPlies, depth, lastEvalSwing),
          plyDepth
        );
        const afterPlayer = await cachedGet(fenAfter, afterDepth, {
          multipv: REVIEW_MULTIPV,
        });
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

    const second = best.second;
    const secondEvalWhite = second
      ? normalizeToWhitePov(second.evalPawns, sideToMove)
      : undefined;
    const secondMateInMovesWhite =
      second?.mateInMoves !== undefined
        ? mateToWhitePov(second.mateInMoves, sideToMove)
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
        fenBefore,
        secondEval: secondEvalWhite,
        secondMateInMoves: secondMateInMovesWhite,
        opponentPrevLoss,
        previousUci: ply > 0 ? parsed.uci[ply - 1] : undefined,
      },
      analysisStrictness
    );

    const evalSwing = Math.abs(reviewed.evalBefore - reviewed.playerEval);
    lastEvalSwing = evalSwing;
    evalWhiteCarry = reviewed.playerEval;
    opponentPrevLoss = reviewed.winLoss ?? 0;

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

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const SEE_MAX_DEPTH = 12;
const NEAR_BEST_MAX_LOSS = 0.02;

function pieceValue(type: string | undefined): number {
  return type ? (PIECE_VALUES[type] ?? 0) : 0;
}

function attackerValue(type: string): number {
  return type === "k" ? 100 : pieceValue(type);
}

function sameMove(a: string, b: string): boolean {
  return a.toLowerCase().slice(0, 5) === b.toLowerCase().slice(0, 5);
}

function moveFromUci(uci: string): { from: Square; to: Square; promotion?: string } {
  const promotion = uci.length > 4 ? uci.slice(4, 5).toLowerCase() : undefined;
  return {
    from: uci.slice(0, 2).toLowerCase() as Square,
    to: uci.slice(2, 4).toLowerCase() as Square,
    ...(promotion ? { promotion } : {}),
  };
}

/** Static exchange gain for the side to move capturing on `square` (0 if it should not capture). */
function seeGain(board: Chess, square: Square, depth = 0): number {
  if (depth > SEE_MAX_DEPTH) return 0;
  const target = board.get(square);
  if (!target) return 0;
  let capture: { from: Square; to: Square; promotion?: string } | null = null;
  let captureValue = Infinity;
  for (const m of board.moves({ verbose: true })) {
    if (m.to !== square) continue;
    const v = attackerValue(m.piece);
    if (v < captureValue) {
      captureValue = v;
      capture = { from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) };
    }
  }
  if (!capture) return 0;
  board.move(capture);
  const gain = pieceValue(target.type) - seeGain(board, square, depth + 1);
  board.undo();
  return Math.max(0, gain);
}

/** Opponent's best static-exchange gain on each of `side`'s non-pawn pieces (side to move = opponent). */
function hangingPieces(board: Chess, side: "w" | "b", exclude: Square): Map<Square, number> {
  const out = new Map<Square, number>();
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== side || cell.square === exclude) continue;
      if (cell.type === "p" || cell.type === "k") continue;
      const gain = seeGain(board, cell.square);
      if (gain > 0) out.set(cell.square, gain);
    }
  }
  return out;
}

/** Same position with the other side to move (en passant cleared). */
function nullMoveFen(fen: string): string {
  const parts = fen.split(" ");
  if (parts.length >= 4) {
    parts[1] = parts[1] === "w" ? "b" : "w";
    parts[3] = "-";
  }
  return parts.join(" ");
}

/**
 * Net material (pawn units) the mover offers with `uci`: the moved piece left
 * en prise on its arrival square, or another piece newly left hanging, both
 * measured by static exchange. 0 when nothing is given away.
 */
export function sacrificedMaterial(fenBefore: string, uci: string): number {
  if (!uci || uci.length < 4) return 0;
  try {
    const board = new Chess(fenBefore);
    const mover = board.turn();
    const { from, to, promotion } = moveFromUci(uci);
    if (!board.get(from)) return 0;
    const wasInCheck = board.inCheck();
    const hangingBefore = wasInCheck
      ? new Map<Square, number>()
      : hangingPieces(new Chess(nullMoveFen(fenBefore)), mover, from);

    const moved = board.move({ from, to, ...(promotion ? { promotion } : {}) });
    if (!moved) return 0;
    if (board.moves().length === 0) return 0;

    const capturedValue = pieceValue(moved.captured);
    const promotionBonus = moved.promotion ? pieceValue(moved.promotion) - 1 : 0;
    const onArrival = seeGain(board, to) - capturedValue - promotionBonus;

    let newlyHanging = 0;
    if (!wasInCheck) {
      for (const [sq, gain] of hangingPieces(board, mover, to)) {
        newlyHanging = Math.max(newlyHanging, gain - (hangingBefore.get(sq) ?? 0));
      }
    }
    return Math.max(onArrival, newlyHanging, 0);
  } catch {
    return 0;
  }
}

/** True when `uci` recaptures on `previousUci`'s square, or wins material outright by static exchange. */
export function isObviousCapture(
  fenBefore: string,
  uci: string,
  previousUci?: string
): boolean {
  if (!uci || uci.length < 4) return false;
  try {
    const board = new Chess(fenBefore);
    const { from, to, promotion } = moveFromUci(uci);
    const target = board.get(to);
    if (!target) return false;
    if (
      previousUci &&
      previousUci.length >= 4 &&
      previousUci.slice(2, 4).toLowerCase() === to
    ) {
      return true;
    }
    const moved = board.move({ from, to, ...(promotion ? { promotion } : {}) });
    if (!moved) return false;
    return pieceValue(target.type) - seeGain(board, to) >= 2;
  } catch {
    return false;
  }
}

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
    fenBefore?: string;
    /** Eval (white POV, pawns) of the engine's second line in the position before the move. */
    secondEval?: number;
    /** Signed mate distance (white POV) of the second line. */
    secondMateInMoves?: number;
    /** Expected points the opponent gave away with the previous move. */
    opponentPrevLoss?: number;
    /** Previous ply's UCI (recapture detection). */
    previousUci?: string;
  },
  strictness: AnalysisStrictnessId = DEFAULT_ANALYSIS_STRICTNESS
): ReviewedMove {
  const profile = getAnalysisProfile(strictness);

  const cplPawns =
    args.sideToMove === "white"
      ? args.bestEval - args.playerEval
      : args.playerEval - args.bestEval;
  const cpl = Math.max(0, Math.round(cplPawns * 100));

  const forWhite = args.sideToMove === "white";
  const bestWin = winProbability(args.bestEval, args.bestMateInMoves, forWhite);
  const playerWin = winProbability(args.playerEval, args.playerMateInMoves, forWhite);
  const secondLineWin =
    args.secondEval !== undefined
      ? winProbability(args.secondEval, args.secondMateInMoves, forWhite)
      : undefined;
  const playedIsBest = Boolean(args.bestMove) && sameMove(args.bestMove, args.uci);
  const winLoss = Math.max(0, bestWin - playerWin);
  const nearBest = playedIsBest || winLoss <= NEAR_BEST_MAX_LOSS;

  const moveInput: MoveEvalInput = {
    bestEvalPawns: args.bestEval,
    playerEvalPawns: args.playerEval,
    sideToMove: args.sideToMove,
    evalBeforePawns: args.evalBefore,
    bestWin,
    playerWin,
    topLineWin: bestWin,
    secondLineWin,
    alternativeWin: playedIsBest ? secondLineWin : bestWin,
    playedIsBest,
    opponentPrevLoss: args.opponentPrevLoss ?? 0,
    sacrificedMaterial:
      nearBest && args.fenBefore ? sacrificedMaterial(args.fenBefore, args.uci) : 0,
    isObviousCapture:
      playedIsBest && args.fenBefore
        ? isObviousCapture(args.fenBefore, args.uci, args.previousUci)
        : false,
  };
  const classification = classifyMove(moveInput, profile);

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
    winLoss: Math.round(winLoss * 10000) / 10000,
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
  brilliant: {
    bg: "bg-teal-500/20",
    text: "text-teal-200",
    border: "border-teal-400/50",
    emoji: "!!",
  },
  great: {
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    border: "border-blue-400/50",
    emoji: "!",
  },
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
    emoji: "✗",
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

/** Bump whenever classification rules change so cached reviews are recomputed. */
export const REVIEW_CLASSIFIER_VERSION = 2;

/**
 * Cache key for persisted reviews: same game + strictness + depth + classifier
 * version can hit cloud cache.
 */
export function hashReviewCacheKey(
  pgn: string,
  strictness: AnalysisStrictnessId,
  depth: number
): string {
  return hashPgn(
    `${pgn}\nstrict=${strictness}\ndepth=${depth}\nclassifier=v${REVIEW_CLASSIFIER_VERSION}`
  );
}
