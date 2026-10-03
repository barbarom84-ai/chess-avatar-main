/**
 * Analysis Engine: Move Classification and Accuracy Score.
 * Stateless module: takes per-move eval data and returns accuracy + classifications.
 * Does not call Stockfish; callers supply MoveEvalInput[].
 *
 * Classification follows an Expected Points model: each move is judged by how
 * much winning probability it gives away, with special rules for brilliant
 * (sound piece sacrifice), great (only good move) and miss (failing to punish
 * the opponent's mistake). Accuracy stays CPL-based.
 */

import {
  type AnalysisProfile,
  getAnalysisProfile,
  type AnalysisStrictnessId,
} from "./analysis-profiles";

export type { AnalysisStrictnessId, AnalysisProfile } from "./analysis-profiles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoveEvalInput {
  /** Eval (white POV) after the best move, in pawns */
  bestEvalPawns: number;
  /** Eval (white POV) after the move played, in pawns */
  playerEvalPawns: number;
  /** Who made the move (before the move) */
  sideToMove: "white" | "black";
  /** Eval of the position before the move (for context weighting). Optional. */
  evalBeforePawns?: number;
  /** Expected points (0..1, mover's POV) after the engine's best move. Derived from bestEvalPawns when omitted. */
  bestWin?: number;
  /** Expected points (0..1, mover's POV) after the move played. Derived from playerEvalPawns when omitted. */
  playerWin?: number;
  /** Expected points of the engine's top line in the position before the move. */
  topLineWin?: number;
  /** Expected points of the engine's second line (undefined with a single legal move). */
  secondLineWin?: number;
  /** Expected points of the best alternative to the move played. */
  alternativeWin?: number;
  playedIsBest?: boolean;
  /** Expected points the opponent gave away with the previous move. */
  opponentPrevLoss?: number;
  /** Material (pawn units) offered by the move. */
  sacrificedMaterial?: number;
  /** Recapture on the square of the previous capture, or capture winning material outright. */
  isObviousCapture?: boolean;
  /** Classification already computed for this move (counted as-is). */
  classification?: MoveClassification;
}

export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "miss";

export interface GameAccuracyResult {
  accuracy: number;
  classifications: {
    brilliant: number;
    great: number;
    best: number;
    excellent: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
    miss: number;
  };
}

// ---------------------------------------------------------------------------
// Constants (tuning)
// ---------------------------------------------------------------------------

/** Context weight: 1 + k / (1 + |evalBefore|). k chosen so equal positions scale CPL up. */
const CONTEXT_WEIGHT_K = 1.2;

/** For averaging, cap single-move CPL so one blunder doesn't dominate. */
const AVG_CPL_CAP = 500;

/** Human curve: target typical raw accuracy (e.g. 50) -> displayed 70%. */
const TYPICAL_RAW_ACCURACY = 50;
const TARGET_DISPLAYED_ACCURACY = 70;

/** Quality weights per classification (for potential weighted average; we use exp formula). */
const QUALITY_WEIGHTS: Record<MoveClassification, number> = {
  brilliant: 100,
  great: 100,
  best: 100,
  excellent: 85,
  good: 70,
  inaccuracy: 50,
  mistake: 25,
  blunder: 0,
  miss: 0,
};

/** Logistic slope (per centipawn) mapping engine evaluation to expected points. */
const WIN_SLOPE = 0.00368208;

/** Expected points lost at or below which a move counts as best. */
const BEST_MAX = 0.001;

/** Brilliant: minimal material offered, safe afterwards, not already completely winning. */
const BRILLIANT_MIN_SACRIFICE = 2;
const BRILLIANT_MIN_WIN_AFTER = 0.45;
const BRILLIANT_MAX_WIN_WITHOUT = 0.9;

/** Great: alternatives lose at least this much, and the position is not lost after the move. */
const GREAT_MIN_GAP = 0.2;
const GREAT_MIN_WIN_AFTER = 0.35;

/** Miss: opponent erred, a winning position was available, and the move let it go. */
const MISS_MIN_OPPONENT_LOSS = 0.1;
const MISS_MIN_BEST_WIN = 0.7;
const MISS_MAX_WIN_AFTER = 0.65;
const MISS_BLUNDER_FLOOR = 0.2;

// ---------------------------------------------------------------------------
// Expected points
// ---------------------------------------------------------------------------

/**
 * Expected points (0..1) for `forWhite`'s side given a white-POV evaluation.
 * A signed mate distance (white POV) takes precedence over the pawn score.
 */
export function winProbability(
  evalPawnsWhite: number,
  mateInMovesWhite: number | undefined,
  forWhite: boolean
): number {
  let whiteWin: number;
  if (mateInMovesWhite !== undefined && mateInMovesWhite !== 0) {
    whiteWin = mateInMovesWhite > 0 ? 1 : 0;
  } else if (Number.isFinite(evalPawnsWhite)) {
    whiteWin = 1 / (1 + Math.exp(-WIN_SLOPE * evalPawnsWhite * 100));
  } else {
    whiteWin = 0.5;
  }
  return forWhite ? whiteWin : 1 - whiteWin;
}

function resolvedWins(input: MoveEvalInput): { bestWin: number; playerWin: number } {
  const forWhite = input.sideToMove === "white";
  return {
    bestWin: input.bestWin ?? winProbability(input.bestEvalPawns, undefined, forWhite),
    playerWin: input.playerWin ?? winProbability(input.playerEvalPawns, undefined, forWhite),
  };
}

/** Expected points given away by the move (always >= 0). */
export function expectedPointsLoss(input: MoveEvalInput): number {
  const { bestWin, playerWin } = resolvedWins(input);
  return Math.max(0, bestWin - playerWin);
}

// ---------------------------------------------------------------------------
// CPL and context weight
// ---------------------------------------------------------------------------

function computeCpl(input: MoveEvalInput): number {
  const { bestEvalPawns, playerEvalPawns, sideToMove } = input;
  let cplPawns: number;
  if (sideToMove === "white") {
    cplPawns = bestEvalPawns - playerEvalPawns;
  } else {
    cplPawns = playerEvalPawns - bestEvalPawns;
  }
  const cpl = Math.max(0, cplPawns * 100);
  return cpl;
}

function getContextWeight(evalBeforePawns: number | undefined): number {
  if (evalBeforePawns === undefined || !Number.isFinite(evalBeforePawns)) {
    return 1;
  }
  const absEval = Math.abs(evalBeforePawns);
  return 1 + CONTEXT_WEIGHT_K / (1 + absEval);
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function baseClassification(
  loss: number,
  playedIsBest: boolean,
  bands: AnalysisProfile["winLossBands"]
): MoveClassification {
  if (playedIsBest || loss <= BEST_MAX) return "best";
  if (loss <= bands.excellent) return "excellent";
  if (loss <= bands.good) return "good";
  if (loss <= bands.inaccuracy) return "inaccuracy";
  if (loss <= bands.mistake) return "mistake";
  return "blunder";
}

function isBrilliant(
  input: MoveEvalInput,
  base: MoveClassification,
  bestWin: number,
  playerWin: number
): boolean {
  if (base !== "best" && base !== "excellent") return false;
  if ((input.sacrificedMaterial ?? 0) < BRILLIANT_MIN_SACRIFICE) return false;
  if (playerWin < BRILLIANT_MIN_WIN_AFTER) return false;
  const without = input.alternativeWin ?? bestWin;
  return without < BRILLIANT_MAX_WIN_WITHOUT;
}

function isGreat(
  input: MoveEvalInput,
  base: MoveClassification,
  playerWin: number
): boolean {
  if (base !== "best" || input.isObviousCapture) return false;
  const top = input.topLineWin;
  const second = input.secondLineWin;
  if (top === undefined || second === undefined) return false;
  if (playerWin < GREAT_MIN_WIN_AFTER) return false;
  return top - second >= GREAT_MIN_GAP;
}

function isMiss(
  input: MoveEvalInput,
  loss: number,
  bestWin: number,
  playerWin: number,
  bands: AnalysisProfile["winLossBands"]
): boolean {
  if (loss <= bands.good) return false;
  if ((input.opponentPrevLoss ?? 0) < MISS_MIN_OPPONENT_LOSS) return false;
  if (bestWin < MISS_MIN_BEST_WIN) return false;
  if (playerWin >= MISS_MAX_WIN_AFTER) return false;
  return playerWin >= MISS_BLUNDER_FLOOR;
}

/**
 * 1) Base class from expected points lost (profile bands).
 * 2) Sound sacrifice that is best/excellent → brilliant.
 * 3) Only good move (second line far behind) → great.
 * 4) Failed to punish the opponent's mistake, winning chances let go → miss
 *    (below the blunder floor, the base class — blunder — is kept).
 */
export function classifyMove(
  input: MoveEvalInput,
  profile: AnalysisProfile
): MoveClassification {
  const bands = profile.winLossBands;
  const { bestWin, playerWin } = resolvedWins(input);
  const loss = Math.max(0, bestWin - playerWin);
  const base = baseClassification(loss, input.playedIsBest === true, bands);
  if (isBrilliant(input, base, bestWin, playerWin)) return "brilliant";
  if (isGreat(input, base, playerWin)) return "great";
  if (isMiss(input, loss, bestWin, playerWin, bands)) return "miss";
  return base;
}

// ---------------------------------------------------------------------------
// Accuracy: raw then human curve
// ---------------------------------------------------------------------------

function rawAccuracy(avgScaledCpl: number): number {
  return 100 * Math.exp(-0.005 * avgScaledCpl);
}

function humanCurve(raw: number): number {
  if (raw <= TYPICAL_RAW_ACCURACY) {
    const slope = TARGET_DISPLAYED_ACCURACY / TYPICAL_RAW_ACCURACY;
    return Math.min(100, slope * raw);
  }
  const a = (100 - TARGET_DISPLAYED_ACCURACY) / (100 - TYPICAL_RAW_ACCURACY);
  const b = TARGET_DISPLAYED_ACCURACY - a * TYPICAL_RAW_ACCURACY;
  return Math.max(0, Math.min(100, a * raw + b));
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

const EMPTY_CLASSIFICATIONS: GameAccuracyResult["classifications"] = {
  brilliant: 0,
  great: 0,
  best: 0,
  excellent: 0,
  good: 0,
  inaccuracy: 0,
  mistake: 0,
  blunder: 0,
  miss: 0,
};

/**
 * Compute game accuracy and move classifications from per-move eval data.
 * Skips entries with non-finite evals. Returns 0 accuracy and all-zero counts if no valid moves.
 */
export function computeGameAccuracy(
  moveEvals: MoveEvalInput[],
  strictness?: AnalysisStrictnessId
): GameAccuracyResult {
  const profile = getAnalysisProfile(strictness);

  const valid = moveEvals.filter(
    (m) =>
      Number.isFinite(m.bestEvalPawns) &&
      Number.isFinite(m.playerEvalPawns)
  );

  if (valid.length === 0) {
    return {
      accuracy: 0,
      classifications: { ...EMPTY_CLASSIFICATIONS },
    };
  }

  let sumScaledCpl = 0;
  const classifications = { ...EMPTY_CLASSIFICATIONS };

  for (const input of valid) {
    const cpl = computeCpl(input);
    const weight = getContextWeight(input.evalBeforePawns);
    const scaledCpl = Math.min(AVG_CPL_CAP, cpl * weight);
    sumScaledCpl += scaledCpl;

    const classification = input.classification ?? classifyMove(input, profile);
    classifications[classification]++;
  }

  const avgScaledCpl = sumScaledCpl / valid.length;
  const raw = rawAccuracy(avgScaledCpl);
  const accuracy = humanCurve(raw);

  return {
    accuracy: Math.round(accuracy * 10) / 10,
    classifications,
  };
}

export { QUALITY_WEIGHTS };
