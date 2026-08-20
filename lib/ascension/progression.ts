import { resolveChampionTierByCount } from "@/lib/ascension/tiers";
import type { CampaignPuzzleKind, ChampionTier } from "@/lib/ascension/types";

export const ELO_CAP = 3000;
export const REPEAT_XP_MULTIPLIER = 0.1;

export interface PuzzleRewardInput {
  kind: CampaignPuzzleKind;
  xpReward: number;
  eloReward: number;
  isFirstCompletion: boolean;
  /**
   * Total number of completed puzzles (including this one if isFirstCompletion).
   * Used to determine the player's tier milestone.
   */
  completedPuzzleCount: number;
}

export interface PuzzleRewardResult {
  xpGain: number;
  eloGain: number;
  newElo: number;
  newXp: number;
  newTier: ChampionTier;
}

export function computePuzzleRewards(
  currentElo: number,
  currentXp: number,
  input: PuzzleRewardInput
): PuzzleRewardResult {
  const multiplier = input.isFirstCompletion ? 1 : REPEAT_XP_MULTIPLIER;
  const xpGain = Math.round(input.xpReward * multiplier);
  const rawEloGain = input.isFirstCompletion ? input.eloReward : 0;
  const newElo = Math.min(ELO_CAP, currentElo + rawEloGain);
  const newXp = currentXp + xpGain;

  return {
    xpGain,
    eloGain: newElo - currentElo,
    newElo,
    newXp,
    newTier: resolveChampionTierByCount(input.completedPuzzleCount),
  };
}

export function canAffordSkill(currentXp: number, cost: number): boolean {
  return currentXp >= cost && cost > 0;
}

export function spendXp(currentXp: number, cost: number): number {
  if (currentXp < cost) {
    throw new Error("Insufficient XP");
  }
  return currentXp - cost;
}
