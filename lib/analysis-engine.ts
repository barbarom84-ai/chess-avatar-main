/**
 * Analysis Engine: Move Classification and Accuracy Score (CAPS-style).
 * Stateless module: takes per-move eval data and returns accuracy + classifications.
 * Does not call Stockfish; callers supply MoveEvalInput[].
 */

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
  /** Best move was a mate. Optional; used for "Miss" detection. */
  isMateBest?: boolean;
  /** Player move was a mate. Optional. */
  isMatePlayer?: boolean;
}

export type MoveClassification =
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

const CPL_BANDS = {
  excellent: 20,
  good: 50,
  inaccuracy: 100,
  mistake: 300,
} as const;

/** Context weight: 1 + k / (1 + |evalBefore|). k chosen so equal positions scale CPL up. */
const CONTEXT_WEIGHT_K = 1.2;

/** Eval swing (pawns) above which we classify as Miss (missed tactic). */
const MISS_SWING_PAWNS = 4.0;

/** For averaging, cap single-move CPL so one blunder doesn't dominate. Optional; we use scaled CPL as-is. */
const AVG_CPL_CAP = 500;

/** Human curve: target typical raw accuracy (e.g. 50) -> displayed 70%. */
const TYPICAL_RAW_ACCURACY = 50;
const TARGET_DISPLAYED_ACCURACY = 70;

/** Quality weights per classification (for potential weighted average; we use exp formula). */
const QUALITY_WEIGHTS: Record<MoveClassification, number> = {
  best: 100,
  excellent: 85,
  good: 70,
  inaccuracy: 50,
  mistake: 25,
  blunder: 0,
  miss: 0,
};

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

function isMiss(input: MoveEvalInput): boolean {
  if (input.isMateBest && !input.isMatePlayer) {
    return true;
  }
  const swing = Math.abs(input.playerEvalPawns - input.bestEvalPawns);
  return swing > MISS_SWING_PAWNS;
}

// ---------------------------------------------------------------------------
// Classification from scaled CPL and Miss
// ---------------------------------------------------------------------------

function classifyMove(scaledCpl: number, input: MoveEvalInput): MoveClassification {
  if (isMiss(input)) {
    return "miss";
  }
  if (scaledCpl <= 0) return "best";
  if (scaledCpl <= CPL_BANDS.excellent) return "excellent";
  if (scaledCpl <= CPL_BANDS.good) return "good";
  if (scaledCpl <= CPL_BANDS.inaccuracy) return "inaccuracy";
  if (scaledCpl <= CPL_BANDS.mistake) return "mistake";
  return "blunder";
}

// ---------------------------------------------------------------------------
// Accuracy: raw then human curve
// ---------------------------------------------------------------------------

function rawAccuracy(avgScaledCpl: number): number {
  return 100 * Math.exp(-0.005 * avgScaledCpl);
}

/**
 * Linear rescale so that typical raw (50) maps to 70% and 0->0, 100->100.
 * Points: (0, 0) and (TYPICAL_RAW_ACCURACY, TARGET_DISPLAYED_ACCURACY) and (100, 100).
 * For 0<=raw<=50: a = 70/50 = 1.4, so displayed = 1.4*raw (0->0, 50->70).
 * For 50<=raw<=100: segment from (50,70) to (100,100): a = 30/50 = 0.6, b = 40, so displayed = 0.6*raw + 40.
 */
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
export function computeGameAccuracy(moveEvals: MoveEvalInput[]): GameAccuracyResult {
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

    const classification = classifyMove(scaledCpl, input);
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

// Export for tests or tuning
export { QUALITY_WEIGHTS, CPL_BANDS, MISS_SWING_PAWNS };
