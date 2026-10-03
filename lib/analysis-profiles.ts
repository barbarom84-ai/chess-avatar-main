/**
 * User-selectable strictness for move classification (expected-points loss bands).
 * Single source of truth shared by analysis-engine and game-review.
 */

export type AnalysisStrictnessId = "relaxed" | "standard" | "strict";

/** Upper limits of expected points lost (0..1) per classification. */
export interface WinLossBands {
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
}

export interface AnalysisProfile {
  id: AnalysisStrictnessId;
  winLossBands: WinLossBands;
}

/** Android / chess.com reference thresholds. */
const STANDARD_BANDS: WinLossBands = {
  excellent: 0.02,
  good: 0.05,
  inaccuracy: 0.1,
  mistake: 0.2,
};

function scaleBands(factor: number): WinLossBands {
  return {
    excellent: STANDARD_BANDS.excellent * factor,
    good: STANDARD_BANDS.good * factor,
    inaccuracy: STANDARD_BANDS.inaccuracy * factor,
    mistake: STANDARD_BANDS.mistake * factor,
  };
}

/** Wider bands — friendlier labels for casual players. */
const RELAXED: AnalysisProfile = {
  id: "relaxed",
  winLossBands: scaleBands(1.5),
};

const STANDARD: AnalysisProfile = {
  id: "standard",
  winLossBands: STANDARD_BANDS,
};

/** Tighter bands — closer to engine truth for strong players. */
const STRICT: AnalysisProfile = {
  id: "strict",
  winLossBands: scaleBands(0.7),
};

export const ANALYSIS_PROFILES: Record<AnalysisStrictnessId, AnalysisProfile> = {
  relaxed: RELAXED,
  standard: STANDARD,
  strict: STRICT,
};

export const DEFAULT_ANALYSIS_STRICTNESS: AnalysisStrictnessId = "standard";

export function getAnalysisProfile(id: AnalysisStrictnessId | undefined): AnalysisProfile {
  if (!id || !(id in ANALYSIS_PROFILES)) {
    return ANALYSIS_PROFILES.standard;
  }
  return ANALYSIS_PROFILES[id];
}
