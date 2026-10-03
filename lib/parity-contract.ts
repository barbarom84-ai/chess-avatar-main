/**
 * Typed view of `parity/constants.json`, the single source of truth for values
 * shared with the Android app. ChessAvatarAndroid ships this file as is (it reads
 * `ascension.skillTree` at runtime) and mirrors the other values in hand-written Kotlin
 * checked against it by ConstantsParityTest, so changing a value needs an Android update.
 */
import raw from "@/parity/constants.json";

export interface ParitySkillDefinition {
  id: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  cost: number;
  prerequisites: string[];
  effectKind: "passive" | "fantasy_ability" | "cosmetic";
  abilityId?: string;
  branch: "utility" | "fantasy" | "prestige" | "terrain";
  position: { x: number; y: number };
}

export interface ParityPvpTimePreset {
  id: string;
  mode: "timed" | "correspondence";
  category: "bullet" | "blitz" | "rapid" | "classical" | "correspondence";
  initialSec: number;
  incrementSec: number;
  daysPerMove?: number;
}

export interface ParityConstants {
  contractVersion: number;
  elo: { maxProfile: number; minProfile: number; uciMin: number; uciMax: number };
  gameElo: {
    min: number;
    max: number;
    resultNudge: number;
    accuracyAnchors: ReadonlyArray<readonly [number, number]>;
  };
  review: {
    winSlope: number;
    bestMax: number;
    standardBands: { excellent: number; good: number; inaccuracy: number; mistake: number };
    bandScale: { relaxed: number; standard: number; strict: number };
    brilliant: { minSacrifice: number; minWinAfter: number; maxWinWithout: number };
    great: { minGap: number; minWinAfter: number };
    miss: { minOpponentLoss: number; minBestWin: number; maxWinAfter: number; blunderFloor: number };
    accuracy: {
      contextWeightK: number;
      cplCap: number;
      rawDecay: number;
      typicalRaw: number;
      targetDisplayed: number;
    };
  };
  coach: { freeDailyQuota: number; errorCodes: string[] };
  pvp: { timePresets: ParityPvpTimePreset[]; errorMessages: Record<string, string> };
  ascension: { errorCodes: string[]; skillTree: ParitySkillDefinition[] };
  divergences: { id: string; description: string }[];
}

export const PARITY = raw as unknown as ParityConstants;
