/**
 * User-selectable strictness for move classification (CPL bands + miss threshold).
 * Single source of truth shared by analysis-engine and game-review.
 */

export type AnalysisStrictnessId = "relaxed" | "standard" | "strict";

export interface CplBands {
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
}

export interface AnalysisProfile {
  id: AnalysisStrictnessId;
  /** Minimum eval swing (pawns) to label "miss" when not already a blunder by CPL. */
  missSwingPawns: number;
  bands: CplBands;
}

/** Wider bands — friendlier labels for casual players. */
const RELAXED: AnalysisProfile = {
  id: "relaxed",
  missSwingPawns: 5.5,
  bands: {
    excellent: 35,
    good: 80,
    inaccuracy: 160,
    mistake: 450,
  },
};

/** Matches the original shipped tuning. */
const STANDARD: AnalysisProfile = {
  id: "standard",
  missSwingPawns: 4.0,
  bands: {
    excellent: 20,
    good: 50,
    inaccuracy: 100,
    mistake: 300,
  },
};

/** Tighter bands — closer to engine truth for strong players. */
const STRICT: AnalysisProfile = {
  id: "strict",
  missSwingPawns: 3.0,
  bands: {
    excellent: 12,
    good: 35,
    inaccuracy: 70,
    mistake: 200,
  },
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
